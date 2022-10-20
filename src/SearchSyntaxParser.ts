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
      $.CONSUME(LeftBracket);
      $.SUBRULE($.query);
      $.CONSUME(RightBracket);
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
