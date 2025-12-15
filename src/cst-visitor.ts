import compact from "lodash-es/compact.js";
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
import { NoSearchableFieldsError } from "./errors/index.js";

function filterNull(values: any[]): any[] {
  return values.filter((value) => value !== null);
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
  ): ComparisonOperators<T> | LogicalOperators<T> | undefined {
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
  ): ComparisonOperators<T> | undefined {
    const field = this.visit(children.field);
    const fieldOptions = this.options?.fields?.[field];

    // AT_LEAST_ONE_SEP in parser guarantees at least one value
    const values = children.value.map((item) =>
      this.visit(item, fieldOptions?.type)
    );
    const value = values[0];

    if (fieldOptions?.array === true) {
      return setWith({}, field, { $contains: values });
    }

    if (values.length > 1) {
      return setWith({}, field, { $in: values });
    }

    if (typeof value === "string" && value.length > 1) {
      if (value.startsWith("*")) {
        return setWith({}, field, { $like: `%${value.slice(1)}` });
      }

      if (value.endsWith("*")) {
        return setWith({}, field, { $like: `${value.slice(0, -1)}%` });
      }
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
    const value = this.visit(children.value, fieldOptions?.type);

    if (typeof value === "undefined") {
      return;
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
   * @param type - Optional type hint for coercion
   * @returns The coerced value
   */
  value(children: ValueCstChildren, type?: FieldOptions["type"]): any {
    // Parser grammar guarantees at least one Value token
    const item = children.Value[0];

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
          const date = new Date(item.image);
          return isNaN(date.getTime()) ? undefined : date;
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
        return new Date(item.image);
      case "QuotedString":
        return item.image.slice(1, -1);
      default:
        return item.image;
    }
  }
}
