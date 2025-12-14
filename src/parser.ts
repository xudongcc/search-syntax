import { CstParser } from "chevrotain";

import {
  tokens,
  AndToken,
  NotToken,
  OrToken,
  LeftBracketToken,
  RightBracketToken,
  EqualToken,
  GreaterThanToken,
  GreaterThanOrEqualToken,
  LessThanToken,
  LessThanOrEqualToken,
  FieldToken,
  ValueToken,
  CommaToken,
} from "./tokens.js";

/**
 * CST (Concrete Syntax Tree) parser for search syntax.
 * Parses tokenized input into a concrete syntax tree that can be visited
 * to produce a filter query object.
 *
 * Grammar rules:
 * - query: orQuery
 * - orQuery: andQuery (OR andQuery)*
 * - andQuery: atomicQuery (AND? atomicQuery)*
 * - atomicQuery: subQuery | notQuery | term
 * - subQuery: '(' query ')'
 * - notQuery: NOT atomicQuery
 * - term: equalFieldTerm | otherFieldTerm | globalTerm
 * - equalFieldTerm: field ':' value (',' value)*
 * - otherFieldTerm: field (':>' | ':>=' | ':<' | ':<=') value
 * - globalTerm: value
 */
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
      $.SUBRULE1($.andQuery);

      $.MANY(() => {
        $.CONSUME(OrToken);
        $.SUBRULE2($.andQuery);
      });
    });

    $.RULE("andQuery", () => {
      $.SUBRULE1($.atomicQuery);

      $.MANY(() => {
        $.OPTION(() => $.CONSUME(AndToken));
        $.SUBRULE2($.atomicQuery);
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
      $.CONSUME(LeftBracketToken);
      $.SUBRULE($.query);
      $.CONSUME(RightBracketToken);
    });

    $.RULE("notQuery", () => {
      $.CONSUME(NotToken);
      $.SUBRULE($.atomicQuery);
    });

    $.RULE("term", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.equalFieldTerm) },
        { ALT: () => $.SUBRULE($.otherFieldTerm) },
        { ALT: () => $.SUBRULE($.globalTerm) },
      ]);
    });

    $.RULE("equalFieldTerm", () => {
      $.SUBRULE($.field);
      $.CONSUME(EqualToken);
      $.AT_LEAST_ONE_SEP({
        SEP: CommaToken,
        DEF: () => {
          $.SUBRULE($.value);
        },
      });
    });

    $.RULE("otherFieldTerm", () => {
      $.SUBRULE($.field);
      $.OR([
        { ALT: () => $.CONSUME(LessThanToken) },
        { ALT: () => $.CONSUME(LessThanOrEqualToken) },
        { ALT: () => $.CONSUME(GreaterThanToken) },
        { ALT: () => $.CONSUME(GreaterThanOrEqualToken) },
      ]);
      $.SUBRULE($.value);
    });

    $.RULE("globalTerm", () => {
      $.SUBRULE($.value);
    });

    $.RULE("field", () => {
      $.CONSUME(FieldToken);
    });

    $.RULE("value", () => {
      $.CONSUME(ValueToken);
    });

    this.performSelfAnalysis();
  }
}

/**
 * Singleton parser instance for search syntax.
 * Reuse this instance for parsing multiple queries.
 */
export const searchSyntaxParser = new SearchSyntaxParser();
