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
import { ParseOptions } from "./interfaces";
import { SearchSyntaxParser } from "./SearchSyntaxParser";

const parser = new SearchSyntaxParser();

const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

export class SearchSyntaxToAstVisitor
  extends BaseCstVisitor
  implements ICstNodeVisitor<any, any>
{
  constructor(private readonly options?: ParseOptions) {
    super();
    this.validateVisitor();
  }

  query(ctx: QueryCstChildren) {
    return this.visit(ctx.orQuery);
  }

  orQuery(ctx: OrQueryCstChildren) {
    if (ctx.right) {
      return {
        $or: [
          this.visit(ctx.left),
          ...ctx.right.map((item) => this.visit(item)),
        ],
      };
    }

    return this.visit(ctx.left);
  }

  andQuery(ctx: AndQueryCstChildren) {
    if (ctx.right) {
      return {
        $and: [
          this.visit(ctx.left),
          ...ctx.right.map((item) => this.visit(item)),
        ],
      };
    }

    return this.visit(ctx.left);
  }

  notQuery(ctx: NotQueryCstChildren) {
    if (ctx.Not) {
      return {
        $not: this.visit(ctx.atomicQuery),
      };
    }

    return this.visit(ctx.atomicQuery);
  }

  atomicQuery(ctx: AtomicQueryCstChildren) {
    if (ctx.subQuery) {
      return this.visit(ctx.subQuery);
    }

    if (ctx.term) {
      return this.visit(ctx.term);
    }
  }

  subQuery(ctx: SubQueryCstChildren) {
    return this.visit(ctx.query);
  }

  term(ctx: TermCstChildren) {
    if (ctx.field && ctx.comparator && ctx.value) {
      const field = this.visit(ctx.field);
      const comparator = this.visit(ctx.comparator);
      const value = this.visit(ctx.value);

      if (comparator === "$eq") {
        if (this.options?.arrayAttributes?.includes(field)) {
          return {
            [field]: {
              $contains: [value],
            },
          };
        }

        if (this.options?.fulltextAttributes?.includes(field)) {
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

    if (
      this.options?.globalAttributes instanceof Array &&
      this.options?.globalAttributes.length > 0
    ) {
      const value = this.visit(ctx.value);

      return {
        $or: this.options.globalAttributes.map((attribute) => {
          if (this.options?.arrayAttributes?.includes(attribute)) {
            return {
              [attribute]: {
                $contains: [value],
              },
            };
          }

          if (this.options?.fulltextAttributes?.includes(attribute)) {
            return {
              [attribute]: {
                $fulltext: value,
              },
            };
          }

          return {
            [attribute]: value,
          };
        }),
      };
    }

    return null;
  }

  field(ctx) {
    return ctx.Field[0].image;
  }

  comparator(children: ComparatorCstChildren) {
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

  value(ctx: ValueCstChildren) {
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
