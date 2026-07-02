import compact from "lodash-es/compact.js";
import dayjs, { type ManipulateType, type OpUnitType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import timezonePlugin from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import pickBy from "lodash-es/pickBy.js";
import setWith from "lodash-es/setWith.js";

import {
  type EqualFieldTermCstChildren,
  type GlobalTermCstChildren,
  type AndQueryCstChildren,
  type AtomicQueryCstChildren,
  type FieldCstChildren,
  type ICstNodeVisitor,
  type NotQueryCstChildren,
  type OrQueryCstChildren,
  type QueryCstChildren,
  type SubQueryCstChildren,
  type TermCstChildren,
  type ValueCstChildren,
  type OtherFieldTermCstChildren,
} from "./cst.js";
import {
  type ComparisonOperators,
  type LogicalOperators,
  type FieldOptions,
  type Filter,
  type ParseOptions,
} from "./interfaces/index.js";
import { searchSyntaxParser } from "./parser.js";
import {
  NoSearchableFieldsError,
  UnsupportedSyntaxError,
} from "./errors/index.js";

dayjs.extend(utc);
dayjs.extend(timezonePlugin);
dayjs.extend(customParseFormat);

function filterNull(values: any[]): any[] {
  return values.filter((value) => value !== null);
}

function throwUnsupportedSyntax(field: string, value: string): never {
  throw new UnsupportedSyntaxError(field, getUnquotedValue(value));
}

const relativeDatePattern = /^\s*([+-]?\d+)\s*([smhdwMy])\s*$/;
const explicitTimezonePattern =
  /(?:[Tt]|\s).*(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;
const dateTimePrefixPattern = /^(\d{4}-\d{2}-\d{2})(?=[Tt\s])/;
const isoLikeDatePattern = /^\d{4}(?:-\d+(?:-\d+)?)?(?:[Tt\s].*)?$/;

const relativeDateUnits: Record<string, ManipulateType> = {
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "week",
  M: "month",
  y: "year",
};

const calendarRelativeDateUnits = new Set(["d", "w", "M", "y"]);

type DateBoundary = "start" | "end";

interface ValueContext {
  type?: FieldOptions["type"];
  dateBoundary?: DateBoundary;
  allowRelativeDate?: boolean;
}

const relativeDateBoundaryUnits: Record<string, OpUnitType> = {
  s: "second",
  m: "minute",
  h: "hour",
  d: "day",
  w: "day",
  M: "day",
  y: "day",
};

const dateOnlyFormats = [
  { pattern: /^\d{4}$/, format: "YYYY", boundaryUnit: "year" },
  { pattern: /^\d{4}-\d{2}$/, format: "YYYY-MM", boundaryUnit: "month" },
  {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    format: "YYYY-MM-DD",
    boundaryUnit: "day",
  },
] as const;

function getUnquotedValue(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function getValidDate(date: Date): Date | undefined {
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getValueContext(
  context?: FieldOptions["type"] | ValueContext
): ValueContext {
  if (typeof context === "string") {
    return { type: context };
  }

  return context ?? {};
}

function hasExplicitTimezone(value: string): boolean {
  return explicitTimezonePattern.test(value);
}

function getDateOnlyFormat(value: string):
  | {
      format: string;
      boundaryUnit: OpUnitType;
    }
  | undefined {
  return dateOnlyFormats.find(({ pattern }) => pattern.test(value));
}

function applyDateBoundary<T extends dayjs.Dayjs>(
  date: T,
  unit: OpUnitType,
  boundary?: DateBoundary
): T {
  if (typeof boundary === "undefined") {
    return date;
  }

  return (boundary === "start" ? date.startOf(unit) : date.endOf(unit)) as T;
}

function parseDateOnlyValue(
  value: string,
  format: string,
  timezone?: string,
  boundary?: DateBoundary,
  boundaryUnit: OpUnitType = "day"
): Date | undefined {
  let date = dayjs(value, format, true);
  if (!date.isValid()) {
    return;
  }

  if (timezone) {
    date = date.tz(timezone, true);
  }

  return getValidDate(applyDateBoundary(date, boundaryUnit, boundary).toDate());
}

function parseDateTimeValue(
  value: string,
  timezone?: string
): Date | undefined {
  const datePrefix = dateTimePrefixPattern.exec(value)?.[1];
  if (
    typeof datePrefix === "undefined" ||
    !dayjs(datePrefix, "YYYY-MM-DD", true).isValid()
  ) {
    return;
  }

  const nativeDate = new Date(value);
  if (Number.isNaN(nativeDate.getTime())) {
    return;
  }

  if (timezone && !hasExplicitTimezone(value)) {
    return getValidDate(dayjs.tz(value, timezone).toDate());
  }

  return nativeDate;
}

function getRelativeBaseDate(timezone?: string) {
  return timezone ? dayjs().tz(timezone) : dayjs();
}

function parseRelativeDate(
  value: string,
  timezone?: string,
  boundary?: DateBoundary,
  baseDate = getRelativeBaseDate(timezone)
): Date | undefined {
  const match = relativeDatePattern.exec(value);
  if (match === null) {
    return;
  }

  const amount = Number(match[1]);
  const unit = relativeDateUnits[match[2]];
  if (!Number.isSafeInteger(amount) || typeof unit === "undefined") {
    return;
  }

  let date = baseDate.add(amount, unit);

  if (timezone && calendarRelativeDateUnits.has(match[2])) {
    date = date.tz(timezone, true);
  }

  date = applyDateBoundary(
    date,
    relativeDateBoundaryUnits[match[2]],
    boundary
  );

  return getValidDate(date.toDate());
}

function parseDateValue(
  value: string,
  timezone?: string,
  boundary?: DateBoundary,
  allowRelativeDate = false
): Date | undefined {
  const unquotedValue = getUnquotedValue(value).trim();

  if (allowRelativeDate) {
    const relativeDate = parseRelativeDate(unquotedValue, timezone, boundary);
    if (typeof relativeDate !== "undefined") {
      return relativeDate;
    }
  }

  const dateOnlyFormat = getDateOnlyFormat(unquotedValue);
  if (typeof dateOnlyFormat !== "undefined") {
    return parseDateOnlyValue(
      unquotedValue,
      dateOnlyFormat.format,
      timezone,
      boundary,
      dateOnlyFormat.boundaryUnit
    );
  }

  if (dateTimePrefixPattern.test(unquotedValue)) {
    return parseDateTimeValue(unquotedValue, timezone);
  }

  if (isoLikeDatePattern.test(unquotedValue)) {
    return;
  }

  return getValidDate(new Date(unquotedValue));
}

function parseDateRangeValue(
  value: string,
  timezone?: string
): { $gte: Date; $lte: Date } | undefined {
  const unquotedValue = getUnquotedValue(value).trim();

  const dateOnlyFormat = getDateOnlyFormat(unquotedValue);
  if (typeof dateOnlyFormat === "undefined") {
    return;
  }

  const start = parseDateOnlyValue(
    unquotedValue,
    dateOnlyFormat.format,
    timezone,
    "start",
    dateOnlyFormat.boundaryUnit
  );
  const end = parseDateOnlyValue(
    unquotedValue,
    dateOnlyFormat.format,
    timezone,
    "end",
    dateOnlyFormat.boundaryUnit
  );

  if (typeof start === "undefined" || typeof end === "undefined") {
    return;
  }

  return { $gte: start, $lte: end };
}

function getDateBoundaryForComparison(
  children: OtherFieldTermCstChildren
): DateBoundary {
  if (
    typeof children.GreaterThan !== "undefined" ||
    typeof children.LessThanOrEqual !== "undefined"
  ) {
    return "end";
  }

  return "start";
}

const BaseCstVisitor = searchSyntaxParser.getBaseCstVisitorConstructor();

/**
 * CST Visitor that transforms the parsed syntax tree into a filter query object.
 * Implements the visitor pattern to traverse the CST and produce filter objects
 * compatible with database query builders.
 *
 * @typeParam T - The shape of the object being filtered
 *
 * @example
 * ```ts
 * const visitor = new SearchSyntaxCstVisitor({
 *   fields: { name: { type: "string", searchable: true } }
 * });
 * const filter = visitor.visit(cst);
 * ```
 */
export class SearchSyntaxCstVisitor<T>
  extends BaseCstVisitor
  implements ICstNodeVisitor<any, any>
{
  constructor(private readonly options?: ParseOptions) {
    super();
    this.validateVisitor();
  }

  /**
   * Visits the root query node.
   * @param ctx - The query CST children
   * @returns The complete filter object
   */
  query(ctx: QueryCstChildren): Filter<T> {
    return this.visit(ctx.orQuery);
  }

  /**
   * Visits an OR query node, combining child AND queries with $or.
   * @param ctx - The OR query CST children
   * @returns A connective operator object
   */
  orQuery(ctx: OrQueryCstChildren): LogicalOperators<T> {
    const result = filterNull(ctx.andQuery.map((item) => this.visit(item)));

    if (result.length > 1) {
      return { $or: result };
    }
    return result[0];
  }

  /**
   * Visits an AND query node, combining child atomic queries with $and.
   * Merges simple field conditions into a single object when possible.
   * @param ctx - The AND query CST children
   * @returns A connective operator object or merged filter
   */
  andQuery(ctx: AndQueryCstChildren): LogicalOperators<T> | Filter<T> {
    const result = filterNull(ctx.atomicQuery.map((item) => this.visit(item)));

    if (result.length > 1) {
      return this.mergeAndConditions(result);
    }
    return result[0];
  }

  /**
   * Attempts to merge AND conditions into a single object.
   * Falls back to $and array when conditions cannot be merged
   * (e.g., conflicting keys or complex operators like $not, $or, $and).
   * @param conditions - Array of filter conditions
   * @returns Merged object or $and array
   */
  private mergeAndConditions(
    conditions: Filter<T>[]
  ): LogicalOperators<T> | Filter<T> {
    const merged: Filter<T> = {};
    const unmerged: Filter<T>[] = [];

    for (const condition of conditions) {
      if (this.canMerge(condition, merged)) {
        Object.assign(merged, condition);
      } else {
        unmerged.push(condition);
      }
    }

    if (unmerged.length === 0) {
      return merged;
    }

    if (Object.keys(merged).length > 0) {
      return { $and: [merged, ...unmerged] };
    }

    return { $and: unmerged };
  }

  /**
   * Checks if a condition can be merged into the target object.
   * A condition can be merged if:
   * - It has no special operators ($and, $or, $not)
   * - Its keys don't conflict with existing keys in target
   */
  private canMerge(condition: Filter<T>, target: Filter<T>): boolean {
    const keys = Object.keys(condition);

    // Cannot merge if contains special operators
    if (keys.some((key) => ["$and", "$or", "$not"].includes(key))) {
      return false;
    }

    // Cannot merge if any key already exists in target
    if (keys.some((key) => key in target)) {
      return false;
    }

    return true;
  }

  /**
   * Visits an atomic query node (subQuery, notQuery, or term).
   * @param ctx - The atomic query CST children
   * @returns The filter for this atomic query
   */
  atomicQuery(ctx: AtomicQueryCstChildren): Filter<T> {
    if (typeof ctx.subQuery !== "undefined") {
      return this.visit(ctx.subQuery);
    }

    if (typeof ctx.notQuery !== "undefined") {
      return this.visit(ctx.notQuery);
    }

    // term is always present when subQuery and notQuery are not
    return this.visit(ctx.term!);
  }

  /**
   * Visits a parenthesized sub-query.
   * @param ctx - The sub-query CST children
   * @returns The filter for the nested query
   */
  subQuery(ctx: SubQueryCstChildren): Filter<T> {
    return this.visit(ctx.query);
  }

  /**
   * Visits a NOT query node, wrapping the child in a $not operator.
   * @param ctx - The NOT query CST children
   * @returns The negated filter
   */
  notQuery(ctx: NotQueryCstChildren): Filter<T> {
    // ctx.Not is always present per parser grammar rules
    const subQuery = this.visit(ctx.atomicQuery);

    return { $not: subQuery };
  }

  /**
   * Visits a term node (field search or global search).
   * @param ctx - The term CST children
   * @returns The comparator or connective operators for this term
   * @throws {NoSearchableFieldsError} When global search is used without searchable fields
   */
  term(
    ctx: TermCstChildren
  ): ComparisonOperators<T> | LogicalOperators<T> | Filter<T> | undefined {
    if (typeof ctx.equalFieldTerm !== "undefined") {
      return this.visit(ctx.equalFieldTerm);
    }

    if (typeof ctx.otherFieldTerm !== "undefined") {
      return this.visit(ctx.otherFieldTerm);
    }

    // globalTerm is always present when equalFieldTerm and otherFieldTerm are not
    return this.visit(ctx.globalTerm!);
  }

  /**
   * Visits a global search term (not field-specific).
   * Searches across all fields marked as searchable.
   * @param ctx - The global term CST children
   * @returns An $or filter across all searchable fields
   * @throws {NoSearchableFieldsError} When no searchable fields are configured
   */
  globalTerm(ctx: GlobalTermCstChildren): LogicalOperators<T> {
    const searchableFields = pickBy(
      this.options?.fields,
      (item) => item.searchable
    );

    if (Object.keys(searchableFields).length === 0) {
      const term = this.visit(ctx.value);
      throw new NoSearchableFieldsError(String(term));
    }

    const filters = compact(
      Object.entries(searchableFields).map(
        ([field, fieldOptions]: [any, any]): Filter<T> | undefined => {
          const value = this.visit(ctx.value, fieldOptions.type);

          if (typeof value !== "undefined") {
            if (fieldOptions.array === true) {
              return setWith({}, field, { $contains: [value] });
            }

            // Use $fulltext for string fields with fulltext: true
            if (
              fieldOptions.type === "string" &&
              "fulltext" in fieldOptions &&
              fieldOptions.fulltext === true &&
              typeof value === "string"
            ) {
              return setWith({}, field, { $fulltext: value });
            }

            // Use $prefix for prefix wildcard search (value*) when field has prefix: true
            if (
              fieldOptions.type === "string" &&
              "prefix" in fieldOptions &&
              fieldOptions.prefix === true &&
              typeof value === "string" &&
              value.length > 1 &&
              value.endsWith("*")
            ) {
              return setWith({}, field, { $prefix: value.slice(0, -1) });
            }

            return setWith({}, field, value);
          }

          return undefined;
        }
      )
    );

    if (filters.length === 0) {
      const term = this.visit(ctx.value);
      throw new NoSearchableFieldsError(String(term));
    }

    // Optimize: return single filter directly instead of wrapping in $or
    if (filters.length === 1) {
      return filters[0] as LogicalOperators<T>;
    }

    return { $or: filters };
  }

  /**
   * Visits a field equality term (field:value or field:v1,v2,v3).
   * Handles array fields, multiple values, and wildcard patterns.
   * @param children - The equal field term CST children
   * @returns The comparator operators for this field
   */
  equalFieldTerm(
    children: EqualFieldTermCstChildren
  ): ComparisonOperators<T> | LogicalOperators<T> | Filter<T> | undefined {
    const field = this.visit(children.field);
    const fieldOptions = this.options?.fields?.[field];

    if (fieldOptions?.type === "date" && fieldOptions.array !== true) {
      const rawValues = children.value.map(
        (item) => item.children.Value[0].image
      );
      const filters = children.value.map((item): Filter<T> | undefined => {
        const token = item.children.Value[0];
        const rawValue = token.image;

        if (token.tokenType.name === "Null") {
          return setWith({}, field, null);
        }

        const rangeValue = parseDateRangeValue(
          rawValue,
          this.options?.timezone
        );

        if (typeof rangeValue !== "undefined") {
          return setWith({}, field, rangeValue);
        }

        const dateValue = parseDateValue(rawValue, this.options?.timezone);
        if (typeof dateValue === "undefined") {
          return;
        }

        return setWith({}, field, dateValue);
      });

      const invalidValueIndex = filters.findIndex(
        (filter) => typeof filter === "undefined"
      );
      if (invalidValueIndex >= 0) {
        throwUnsupportedSyntax(field, rawValues[invalidValueIndex]);
      }

      if (filters.length === 1) {
        return filters[0];
      }

      return { $or: filters as Array<Filter<T>> };
    }

    // AT_LEAST_ONE_SEP in parser guarantees at least one value
    const values = children.value.map((item) =>
      this.visit(item, fieldOptions?.type)
    );
    const value = values[0];

    const invalidValueIndex = values.findIndex(
      (item) => typeof item === "undefined"
    );
    if (invalidValueIndex >= 0) {
      throwUnsupportedSyntax(
        field,
        children.value[invalidValueIndex].children.Value[0].image
      );
    }

    if (fieldOptions?.array === true) {
      return setWith({}, field, { $contains: values });
    }

    if (values.length > 1) {
      return setWith({}, field, { $in: values });
    }

    // Use $prefix for prefix search (value*) when field has prefix: true
    if (
      typeof value === "string" &&
      value.length > 1 &&
      value.endsWith("*") &&
      fieldOptions?.type === "string" &&
      "prefix" in fieldOptions &&
      fieldOptions.prefix === true
    ) {
      return setWith({}, field, { $prefix: value.slice(0, -1) });
    }

    // Use $fulltext for string fields with fulltext: true
    if (
      fieldOptions?.type === "string" &&
      "fulltext" in fieldOptions &&
      fieldOptions.fulltext === true &&
      typeof value === "string"
    ) {
      return setWith({}, field, { $fulltext: value });
    }

    return setWith({}, field, value);
  }

  /**
   * Visits a field comparison term (field:>value, field:>=value, etc.).
   * @param children - The other field term CST children
   * @returns The comparator operators for this field comparison
   */
  otherFieldTerm(
    children: OtherFieldTermCstChildren
  ): ComparisonOperators<T> | undefined {
    const field = this.visit(children.field);
    const fieldOptions = this.options?.fields?.[field];
    const value = this.visit(
      children.value,
      fieldOptions?.type === "date"
        ? {
            type: fieldOptions.type,
            dateBoundary: getDateBoundaryForComparison(children),
            allowRelativeDate: true,
          }
        : fieldOptions?.type
    );

    if (typeof value === "undefined") {
      throwUnsupportedSyntax(field, children.value[0].children.Value[0].image);
    }

    if (typeof children.LessThan !== "undefined") {
      return setWith({}, field, { $lt: value });
    }

    if (typeof children.LessThanOrEqual !== "undefined") {
      return setWith({}, field, { $lte: value });
    }

    if (typeof children.GreaterThan !== "undefined") {
      return setWith({}, field, { $gt: value });
    }

    // GreaterThanOrEqual is always present when other operators are not
    return setWith({}, field, { $gte: value });
  }

  /**
   * Visits a field name node, resolving aliases if configured.
   * @param ctx - The field CST children
   * @returns The resolved field name
   */
  field(ctx: FieldCstChildren): string {
    if (typeof this.options?.aliases?.[ctx.Field[0].image] !== "undefined") {
      return this.options.aliases[ctx.Field[0].image];
    }

    return ctx.Field[0].image;
  }

  /**
   * Visits a value node, performing type coercion based on field configuration.
   * @param children - The value CST children
   * @param context - Optional type hint or coercion context
   * @returns The coerced value
   */
  value(
    children: ValueCstChildren,
    context?: FieldOptions["type"] | ValueContext
  ): any {
    // Parser grammar guarantees at least one Value token
    const item = children.Value[0];
    const { type, dateBoundary, allowRelativeDate } = getValueContext(context);

    if (item.tokenType.name === "Null") {
      return null;
    }

    if (typeof type !== "undefined") {
      switch (type) {
        case "string":
          return item.tokenType.name === "QuotedString"
            ? item.image.slice(1, -1)
            : item.image;
        case "number": {
          const num = Number(item.image);
          return Number.isNaN(num) ? undefined : num;
        }
        case "boolean":
          return item.image === "true";
        case "date": {
          return parseDateValue(
            item.image,
            this.options?.timezone,
            dateBoundary,
            allowRelativeDate
          );
        }
      }
    }

    switch (item.tokenType.name) {
      case "True":
        return true;
      case "False":
        return false;
      case "Number":
        return Number(item.image);
      case "Date":
        return parseDateValue(item.image, this.options?.timezone);
      case "QuotedString":
        return item.image.slice(1, -1);
      default:
        return item.image;
    }
  }
}
