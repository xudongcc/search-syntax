import { CstParser } from "chevrotain";

import {
  And,
  Equal,
  False,
  GreaterThan,
  GreaterThanOrEqual,
  Identifier,
  LeftBraket,
  LessThan,
  LessThanOrEqual,
  Not,
  Null,
  Number,
  Or,
  QuotedString,
  RightBraket,
  tokens,
  True,
  UnquotedLiteral,
} from "./tokens";

export class SearchSyntaxParser extends CstParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  constructor() {
    super(tokens);

    const $ = this;

    $.RULE("query", () => {
      $.SUBRULE($.orQuery);
    });

    $.RULE("orQuery", () => {
      $.SUBRULE($.andQuery, { LABEL: "left" });

      $.MANY(() => {
        $.CONSUME(Or);
        $.SUBRULE2($.andQuery, { LABEL: "right" });
      });
    });

    $.RULE("andQuery", () => {
      $.SUBRULE($.notQuery, { LABEL: "left" });

      $.MANY(() => {
        $.OPTION(() => $.CONSUME(And));
        $.SUBRULE2($.notQuery, { LABEL: "right" });
      });
    });

    $.RULE("notQuery", () => {
      $.OPTION(() => $.CONSUME(Not));
      $.SUBRULE($.atomicQuery);
    });

    $.RULE("atomicQuery", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.subQuery) },
        { ALT: () => $.SUBRULE($.term) },
      ]);
    });

    $.RULE("subQuery", () => {
      $.CONSUME(LeftBraket);
      $.SUBRULE($.query);
      $.CONSUME(RightBraket);
    });

    $.RULE("term", () => {
      $.OPTION(() => {
        $.SUBRULE($.name);
        $.SUBRULE($.comparator);
      });
      $.SUBRULE($.value);
    });

    $.RULE("comparator", () => {
      $.OR([
        {
          ALT: () => {
            $.CONSUME(Equal);
          },
        },
        {
          ALT: () => {
            $.CONSUME(GreaterThan);
          },
        },
        {
          ALT: () => {
            $.CONSUME(GreaterThanOrEqual);
          },
        },
        {
          ALT: () => {
            $.CONSUME(LessThan);
          },
        },
        {
          ALT: () => {
            $.CONSUME(LessThanOrEqual);
          },
        },
      ]);
    });

    $.RULE("name", () => {
      $.CONSUME(Identifier);
    });

    $.RULE("value", () => {
      $.OR([
        {
          ALT: () => {
            $.CONSUME(Null);
          },
        },
        {
          ALT: () => {
            $.CONSUME(True);
          },
        },
        {
          ALT: () => {
            $.CONSUME(False);
          },
        },
        {
          ALT: () => {
            $.CONSUME(Number);
          },
        },
        {
          ALT: () => {
            $.CONSUME(QuotedString);
          },
        },
        {
          ALT: () => {
            $.CONSUME(Identifier);
          },
        },
        {
          ALT: () => {
            $.CONSUME(UnquotedLiteral);
          },
        },
      ]);
    });

    this.performSelfAnalysis();
  }
}
