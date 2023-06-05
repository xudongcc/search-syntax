import { CstParser } from "chevrotain";

import { tokens } from "./tokens";

import { And, Not, Or } from "./tokens/connectives";
import { LeftBracket, RightBracket } from "./tokens/brackets";
import { Comparator } from "./tokens/comparators";
import { Field } from "./tokens/fields";
import { Value } from "./tokens/values";

export class SearchSyntaxParser extends CstParser {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  constructor() {
    super(tokens);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const $ = this;

    $.RULE("query", () => {
      $.SUBRULE($.orQuery);
    });

    $.RULE("orQuery", () => {
      $.SUBRULE($.andQuery, { LABEL: "left" });

      $.MANY(() => {
        $.CONSUME(Or);
        $.SUBRULE2($.query, { LABEL: "right" });
      });
    });

    $.RULE("andQuery", () => {
      $.SUBRULE($.atomicQuery, { LABEL: "left" });

      $.MANY(() => {
        $.OPTION(() => $.CONSUME(And));
        $.SUBRULE2($.query, { LABEL: "right" });
      });
    });

    $.RULE("atomicQuery", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.subQuery) },
        { ALT: () => $.SUBRULE($.notQuery) },
        { ALT: () => $.SUBRULE($.term) },
      ]);
    });

    $.RULE("subQuery", () => {
      $.CONSUME(LeftBracket);
      $.SUBRULE($.query);
      $.CONSUME(RightBracket);
    });

    $.RULE("notQuery", () => {
      $.CONSUME(Not);
      $.SUBRULE($.atomicQuery);
    });

    $.RULE("term", () => {
      $.OPTION(() => {
        $.SUBRULE($.field);
        $.SUBRULE($.comparator);
      });

      $.SUBRULE($.value);
    });

    $.RULE("field", () => {
      $.CONSUME(Field);
    });

    $.RULE("comparator", () => {
      $.CONSUME(Comparator);
    });

    $.RULE("value", () => {
      $.CONSUME(Value);
    });

    this.performSelfAnalysis();
  }
}
