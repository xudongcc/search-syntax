import compact from "lodash/compact";
import pickBy from "lodash/pickBy";
import setWith from "lodash/setWith";
import intersection from "lodash/intersection";

import {
  type AndQueryCstChildren,
  type AtomicQueryCstChildren,
  type ComparatorCstChildren,
  type FieldCstChildren,
  type ICstNodeVisitor,
  type NotQueryCstChildren,
  type OrQueryCstChildren,
  type QueryCstChildren,
  type SubQueryCstChildren,
  type TermCstChildren,
  type ValueCstChildren,
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
    if (typeof ctx.right === "undefined") {
      return this.visit(ctx.left);
    }

    const result = filterEmpty([this.visit(ctx.left), this.visit(ctx.right)]);

    if (result.length > 1) {
      return { $or: result };
    } else if (result.length === 1) {
      return result[0];
    } else {
      return null;
    }
  }

  andQuery(ctx: AndQueryCstChildren): ConnectiveOperators<T> | null {
    if (typeof ctx.right === "undefined") {
      return this.visit(ctx.left);
    }

    const result = filterEmpty([this.visit(ctx.left), this.visit(ctx.right)]);

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
  ): ComparatorOperators<T> | ConnectiveOperators<T> | null {
    if (
      typeof ctx.field !== "undefined" &&
      typeof ctx.comparator !== "undefined"
    ) {
      const field = this.visit(ctx.field);

      const fieldOptions = this.options?.fields?.[field];

      if (
        typeof this.options?.fields !== "undefined" &&
        fieldOptions?.filterable !== true
      ) {
        return null;
      }

      const comparator = this.visit(ctx.comparator);
      const value = this.visit(ctx.value, fieldOptions?.type);

      if (comparator === "$eq") {
        if (fieldOptions?.array === true) {
          return setWith({}, field, { $contains: [value] });
        }

        if (fieldOptions?.fulltext === true) {
          return setWith({}, field, { $fulltext: value });
        }

        return setWith({}, field, value);
      }

      return setWith({}, field, { [comparator]: value });
    } else {
      const searchableFields = pickBy(
        this.options?.fields,
        (item) => item.searchable
      );

      if (Object.keys(searchableFields).length > 0) {
        return {
          $or: compact(
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
          ),
        };
      }
    }

    return null;
  }

  field(ctx: FieldCstChildren): string {
    return ctx.Field[0].image;
  }

  comparator(children: ComparatorCstChildren): string {
    switch (children.Comparator[0].tokenType.name) {
      case "GreaterThan":
        return "$gt";
      case "GreaterThanOrEqual":
        return "$gte";
      case "LessThan":
        return "$lt";
      case "LessThanOrEqual":
        return "$lte";
      default:
        return "$eq";
    }
  }

  value(ctx: ValueCstChildren, type?: FieldOptions["type"]): any {
    if (ctx.Value[0].tokenType.name === "Null") {
      return null;
    }

    if (typeof type !== "undefined") {
      try {
        switch (type) {
          case "string":
            return ctx.Value[0].tokenType.name === "QuotedString"
              ? ctx.Value[0].image.slice(1, -1)
              : ctx.Value[0].image;
          case "number":
            return Number(ctx.Value[0].image);
          case "bigint":
            return BigInt(ctx.Value[0].image);
          case "boolean":
            return ctx.Value[0].image === "true";
          case "date": {
            const date = new Date(ctx.Value[0].image);
            return isNaN(date.getTime()) ? undefined : date;
          }
        }
      } catch (err) {
        return undefined;
      }
    }

    switch (ctx.Value[0].tokenType.name) {
      case "True":
        return true;
      case "False":
        return false;
      case "Number":
        // eslint-disable-next-line no-case-declarations
        const value = Number(ctx.Value[0].image);

        return Number.isNaN(value) ||
          value > Number.MAX_SAFE_INTEGER ||
          value < Number.MIN_SAFE_INTEGER
          ? BigInt(ctx.Value[0].image)
          : value;
      case "Date":
        return new Date(ctx.Value[0].image);
      case "QuotedString":
        return ctx.Value[0].image.slice(1, -1);
      default:
        return ctx.Value[0].image;
    }
  }
}
