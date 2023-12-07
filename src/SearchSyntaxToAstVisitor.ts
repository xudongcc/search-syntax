import compact from "lodash/compact";
import pickBy from "lodash/pickBy";
import setWith from "lodash/setWith";
import intersection from "lodash/intersection";

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
} from "./cst";
import {
  type ComparatorOperators,
  type ConnectiveOperators,
  type FieldOptions,
  type Filter,
  type ParseOptions,
} from "./interfaces";
import { SearchSyntaxParser } from "./SearchSyntaxParser";

function filterEmpty(values: any[]): any[] {
  return values.filter((value) => value !== null);
}

const parser = new SearchSyntaxParser();

const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

export class SearchSyntaxToAstVisitor<T>
  extends BaseCstVisitor
  implements ICstNodeVisitor<any, any>
{
  constructor(private readonly options?: ParseOptions) {
    super();
    this.validateVisitor();
  }

  query(ctx: QueryCstChildren): Filter<T> {
    return this.visit(ctx.orQuery);
  }

  orQuery(ctx: OrQueryCstChildren): ConnectiveOperators<T> | null {
    const result = filterEmpty(ctx.andQuery.map((item) => this.visit(item)));

    if (result.length > 1) {
      return { $or: result };
    } else if (result.length === 1) {
      return result[0];
    } else {
      return null;
    }
  }

  andQuery(ctx: AndQueryCstChildren): ConnectiveOperators<T> | null {
    const result = filterEmpty(ctx.atomicQuery.map((item) => this.visit(item)));

    if (result.length > 1) {
      return { $and: result };
    } else if (result.length === 1) {
      return result[0];
    } else {
      return null;
    }
  }

  atomicQuery(ctx: AtomicQueryCstChildren): Filter<T> | null {
    if (typeof ctx.subQuery !== "undefined") {
      return this.visit(ctx.subQuery);
    }

    if (typeof ctx.notQuery !== "undefined") {
      return this.visit(ctx.notQuery);
    }

    if (typeof ctx.term !== "undefined") {
      return this.visit(ctx.term);
    }

    return null;
  }

  subQuery(ctx: SubQueryCstChildren): Filter<T> {
    return this.visit(ctx.query);
  }

  notQuery(ctx: NotQueryCstChildren): Filter<T> {
    if (ctx.Not != null) {
      const subQuery = this.visit(ctx.atomicQuery);

      return {
        $not:
          typeof subQuery === "object" &&
          intersection(Object.keys(subQuery), ["$and", "$or", "$not"]).length >
            0
            ? subQuery
            : { $and: [subQuery] },
      };
    }

    return this.visit(ctx.atomicQuery);
  }

  term(
    ctx: TermCstChildren
  ): ComparatorOperators<T> | ConnectiveOperators<T> | undefined {
    if (typeof ctx.equalFieldTerm !== "undefined") {
      return this.visit(ctx.equalFieldTerm);
    }

    if (typeof ctx.otherFieldTerm !== "undefined") {
      return this.visit(ctx.otherFieldTerm);
    }

    if (typeof ctx.globalTerm !== "undefined") {
      return this.visit(ctx.globalTerm);
    }
  }

  globalTerm(ctx: GlobalTermCstChildren): ConnectiveOperators<T> | undefined {
    const searchableFields = pickBy(
      this.options?.fields,
      (item) => item.searchable
    );

    if (Object.keys(searchableFields).length > 0) {
      const filters = compact(
        Object.entries(searchableFields).map(
          ([field, { array, type, fulltext }]: [any, any]):
            | Filter<T>
            | undefined => {
            const value = this.visit(ctx.value, type);

            if (typeof value !== "undefined") {
              if (array === true) {
                return setWith({}, field, { $contains: [value] });
              }

              if (fulltext === true) {
                return setWith({}, field, { $fulltext: value });
              }

              return setWith({}, field, value);
            }

            return undefined;
          }
        )
      );

      if (filters.length === 0) {
        return;
      }

      return { $or: filters };
    }
  }

  equalFieldTerm(
    children: EqualFieldTermCstChildren
  ): ComparatorOperators<T> | undefined {
    const field = this.visit(children.field);
    const fieldOptions = this.options?.fields?.[field];

    if (
      typeof this.options?.fields !== "undefined" &&
      fieldOptions?.filterable !== true
    ) {
      return;
    }

    const values = children.value.map((item) =>
      this.visit(item, fieldOptions?.type)
    );
    const value = values[0];

    if (values.length === 0) {
      return;
    }

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

    if (fieldOptions?.fulltext === true) {
      return setWith({}, field, { $fulltext: value });
    }

    return setWith({}, field, value);
  }

  otherFieldTerm(
    children: OtherFieldTermCstChildren
  ): ComparatorOperators<T> | undefined {
    const field = this.visit(children.field);
    const fieldOptions = this.options?.fields?.[field];

    if (
      typeof this.options?.fields !== "undefined" &&
      fieldOptions?.filterable !== true
    ) {
      return;
    }

    const value = this.visit(children.value, fieldOptions?.type);

    if (typeof value === "undefined") {
      return;
    }

    if (typeof children.LessThan !== "undefined") {
      return { [field]: { $lt: value } };
    }

    if (typeof children.LessThanOrEqual !== "undefined") {
      return { [field]: { $lte: value } };
    }

    if (typeof children.GreaterThan !== "undefined") {
      return { [field]: { $gt: value } };
    }

    if (typeof children.GreaterThanOrEqual !== "undefined") {
      return { [field]: { $gte: value } };
    }
  }

  field(ctx: FieldCstChildren): string {
    if (typeof this.options?.aliases?.[ctx.Field[0].image] !== "undefined") {
      return this.options.aliases[ctx.Field[0].image];
    }

    return ctx.Field[0].image;
  }

  value(children: ValueCstChildren, type?: FieldOptions["type"]): any {
    const item = children.Value[0];

    if (typeof item === "undefined") {
      return;
    }

    if (item?.tokenType?.name === "Null") {
      return null;
    }

    if (typeof type !== "undefined") {
      try {
        switch (type) {
          case "string":
            return item.tokenType.name === "QuotedString"
              ? item.image.slice(1, -1)
              : item.image;
          case "number":
            return Number(item.image);
          case "bigint":
            return BigInt(item.image);
          case "boolean":
            return item.image === "true";
          case "date": {
            const date = new Date(item.image);
            return isNaN(date.getTime()) ? undefined : date;
          }
        }
      } catch (err) {
        return;
      }
    }

    switch (item.tokenType.name) {
      case "True":
        return true;
      case "False":
        return false;
      case "Number":
        // eslint-disable-next-line no-case-declarations
        const value = Number(item.image);

        return Number.isNaN(value) ||
          value > Number.MAX_SAFE_INTEGER ||
          value < Number.MIN_SAFE_INTEGER
          ? BigInt(item.image)
          : value;
      case "Date":
        return new Date(item.image);
      case "QuotedString":
        return item.image.slice(1, -1);
      default:
        return item.image;
    }
  }
}
