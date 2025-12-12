import { Filter, ParseOptions } from "./interfaces/index.js";
import { searchSyntaxLexer } from "./lexer.js";
import { searchSyntaxParser } from "./parser.js";
import { SearchSyntaxCstVisitor } from "./cst-visitor.js";

export function parse<T = Record<string, any>>(
  query?: string,
  options?: ParseOptions
): Filter<T> {
  if (typeof query === "undefined" || query.trim() === "") {
    return {};
  }

  searchSyntaxParser.input = searchSyntaxLexer.tokenize(query.trim()).tokens;

  if (searchSyntaxParser.errors.length > 0) {
    throw Error(
      "parsing errors detected!\n" + searchSyntaxParser.errors[0].message
    );
  }

  return (
    new SearchSyntaxCstVisitor(options).visit(searchSyntaxParser.query()) ?? {}
  );
}
