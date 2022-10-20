import pickBy from "lodash/pickBy";
import {
  AndQueryCstChildren,
  AtomicQueryCstChildren,
  ComparatorCstChildren,
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
      return {
        $not: this.visit(ctx.atomicQuery),
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
      const comparator = this.visit(ctx.comparator);
      const value = this.visit(ctx.value);

      const attribute = this.options?.attributes?.[field];

      if (this.options?.attributes != null && attribute == null) {
        return null;
      }

      if (comparator === "$eq") {
        if (attribute?.array === true) {
          return {
            [field]: {
              $contains: [value],
            },
          };
        }

        if (attribute?.fulltext === true) {
          return {
            [field]: {
              $fulltext: value,
            },
          };
        }

        return {
          [field]: value,
        };
      }

      return {
        [field]: { [comparator]: value },
      };
    }

    const searchableAttributes: Attributes = pickBy(
      this.options?.attributes,
      (attribute) => attribute.searchable
    );

    if (Object.keys(searchableAttributes).length > 0) {
      return {
        $or: Object.entries(searchableAttributes).map(
          ([name, { array, type, fulltext }]: [any, any]): Filter<T> => {
            const value = this.visit(ctx.value, type);

            if (array === true) {
              return {
                [name]: {
                  $contains: [value],
                },
              };
            }

            if (fulltext === true) {
              return {
                [name]: {
                  $fulltext: value,
                },
              };
            }

            return {
              [name]: value,
            };
          }
        ),
      };
    }

    return null;
  }

  field(ctx): string {
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

  value(ctx: ValueCstChildren, type: AttributeOptions["type"]): any {
    if (typeof type !== "undefined") {
      switch (type) {
        case "string":
          return ctx.Value[0].tokenType.name === "QuotedString"
            ? ctx.Value[0].image.slice(1, -1)
            : ctx.Value[0].image;
        case "number":
          return Number(ctx.Value[0].image);
        case "boolean":
          return ctx.Value[0].image === "true";
        case "date":
          return new Date(ctx.Value[0].image);
      }
    }

    switch (ctx.Value[0].tokenType.name) {
      case "Null": {
        return null;
      }
      case "True": {
        return true;
      }
      case "False": {
        return false;
      }
      case "Number": {
        const value = Number(ctx.Value[0].image);

        return Number.isNaN(value) ||
          value > Number.MAX_SAFE_INTEGER ||
          value < Number.MIN_SAFE_INTEGER
          ? ctx.Value[0].image
          : value;
      }
      case "Date": {
        return new Date(ctx.Value[0].image);
      }
      case "QuotedString": {
        return ctx.Value[0].image.slice(1, -1);
      }
      default: {
        return ctx.Value[0].image;
      }
    }
  }
}
