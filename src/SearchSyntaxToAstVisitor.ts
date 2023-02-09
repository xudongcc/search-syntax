import compact from "lodash/compact";
import pickBy from "lodash/pickBy";
import setWith from "lodash/setWith";
import intersection from "lodash/intersection";

import {
  AndQueryCstChildren,
  AtomicQueryCstChildren,
  ComparatorCstChildren,
  FieldCstChildren,
  ICstNodeVisitor,
  NotQueryCstChildren,
  OrQueryCstChildren,
  QueryCstChildren,
  SubQueryCstChildren,
  TermCstChildren,
  ValueCstChildren,
} from "./cst";
import {
  AttributeOptions,
  Attributes,
  ComparatorOperators,
  ConnectiveOperators,
  Filter,
  ParseOptions,
} from "./interfaces";
import { SearchSyntaxParser } from "./SearchSyntaxParser";

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

  orQuery(ctx: OrQueryCstChildren): ConnectiveOperators<T> {
    if (ctx.right != null) {
      return {
        $or: [
          this.visit(ctx.left),
          ...ctx.right.map((item) => this.visit(item)),
        ],
      };
    }

    return this.visit(ctx.left);
  }

  andQuery(ctx: AndQueryCstChildren): ConnectiveOperators<T> {
    if (ctx.right != null) {
      return {
        $and: [
          this.visit(ctx.left),
          ...ctx.right.map((item) => this.visit(item)),
        ],
      };
    }

    return this.visit(ctx.left);
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

  atomicQuery(ctx: AtomicQueryCstChildren): Filter<T> | null {
    if (ctx.subQuery != null) {
      return this.visit(ctx.subQuery);
    }

    if (ctx.term != null) {
      return this.visit(ctx.term);
    }

    return null;
  }

  subQuery(ctx: SubQueryCstChildren): Filter<T> {
    return this.visit(ctx.query);
  }

  term(
    ctx: TermCstChildren
  ): ComparatorOperators<T> | ConnectiveOperators<T> | null {
    if (
      typeof ctx.field !== "undefined" &&
      typeof ctx.comparator !== "undefined"
    ) {
      const field = this.visit(ctx.field);

      const attribute = this.options?.attributes?.[field];

      if (
        typeof this.options?.attributes !== "undefined" &&
        attribute?.filterable === false
      ) {
        return null;
      }

      const comparator = this.visit(ctx.comparator);
      const value = this.visit(ctx.value, attribute?.type);

      if (comparator === "$eq") {
        if (attribute?.array === true) {
          return setWith({}, field, { $contains: [value] });
        }

        if (attribute?.fulltext === true) {
          return setWith({}, field, { $fulltext: value });
        }

        return setWith({}, field, value);
      }

      return setWith({}, field, { [comparator]: value });
    } else {
      const searchableAttributes: Attributes = pickBy(
        this.options?.attributes,
        (attribute) => attribute.searchable
      );

      if (Object.keys(searchableAttributes).length > 0) {
        return {
          $or: compact(
            Object.entries(searchableAttributes).map(
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

  value(ctx: ValueCstChildren, type?: AttributeOptions["type"]): any {
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
