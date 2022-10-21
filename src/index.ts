import { Filter, ParseOptions } from "./interfaces";
import { SearchSyntaxLexer } from "./SearchSyntaxLexer";
import { SearchSyntaxParser } from "./SearchSyntaxParser";
import { SearchSyntaxToAstVisitor } from "./SearchSyntaxToAstVisitor";

const parser = new SearchSyntaxParser();

export * from "./interfaces";

export function parse<T = Record<string, any>>(
  query: string,
  options?: ParseOptions
): Filter<T> {
  if (!query) {
    return {};
  }

  parser.input = SearchSyntaxLexer.tokenize(query.trim()).tokens;

  if (parser.errors.length > 0) {
    throw Error(
      "Sad sad panda, parsing errors detected!\n" + parser.errors[0].message
    );
  }

  return new SearchSyntaxToAstVisitor(options).visit(parser.query());
}
