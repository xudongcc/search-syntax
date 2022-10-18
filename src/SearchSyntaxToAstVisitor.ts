import { SearchSyntaxParser } from "./SearchSyntaxParser";

const parser = new SearchSyntaxParser();

const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

export class SearchSyntaxToAstVisitor extends BaseCstVisitor {
  constructor() {
    super();
    this.validateVisitor();
  }

  query(ctx) {
    return this.visit(ctx.orQuery);
  }

  orQuery(ctx) {
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

  andQuery(ctx) {
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

  notQuery(ctx) {
    if (ctx.Not) {
      return {
        $not: this.visit(ctx.atomicQuery),
      };
    }

    return this.visit(ctx.atomicQuery);
  }

  atomicQuery(ctx) {
    if (ctx.subQuery) {
      return this.visit(ctx.subQuery);
    }

    if (ctx.term) {
      return this.visit(ctx.term);
    }
  }

  subQuery(ctx) {
    return this.visit(ctx.query);
  }

  comparator(ctx) {
    if ("Equal" in ctx) {
      return "$eq";
    }

    if ("GreaterThan" in ctx) {
      return "$gt";
    }

    if ("GreaterThanOrEqual" in ctx) {
      return "$gte";
    }

    if ("LessThan" in ctx) {
      return "$lt";
    }

    if ("LessThanOrEqual" in ctx) {
      return "$lte";
    }
  }

  term(ctx) {
    if (ctx.name && ctx.value) {
      const name = this.visit(ctx.name);
      const value = this.visit(ctx.value);
      const comparator = this.visit(ctx.comparator);

      if (comparator === "$eq") {
        return {
          [name]: value,
        };
      }

      return {
        [name]: { [comparator]: value },
      };
    }

    return {
      $text: { $search: this.visit(ctx.value) },
    };
  }

  name(ctx) {
    return ctx.Identifier[0].image;
  }

  value(ctx) {
    if ("Number" in ctx) {
      return Number(ctx.Number[0].image);
    }

    if ("Null" in ctx) {
      return null;
    }

    if ("True" in ctx) {
      return true;
    }

    if ("False" in ctx) {
      return false;
    }

    if ("QuotedString" in ctx) {
      return ctx.QuotedString[0].image.slice(1, -1);
    }

    if ("Identifier" in ctx) {
      return ctx.Identifier[0].image;
    }

    if ("DateString" in ctx) {
      return new Date(ctx.DateString[0].image);
    }

    if ("UnquotedLiteral" in ctx) {
      return ctx.UnquotedLiteral[0].image;
    }
  }
}
