import { Filter } from "./interfaces";
import { SearchSyntaxLexer } from "./SearchSyntaxLexer";
import { SearchSyntaxParser } from "./SearchSyntaxParser";
import { SearchSyntaxToAstVisitor } from "./SearchSyntaxToAstVisitor";

const parser = new SearchSyntaxParser();

// Our visitor has no state, so a single instance is sufficient.
const visitor = new SearchSyntaxToAstVisitor();

export function parse<T = Record<string, any>>(inputText: string): Filter<T> {
  if (!inputText) {
    return null;
  }

  const lexerResult = SearchSyntaxLexer.tokenize(inputText.trim());
  parser.input = lexerResult.tokens;

  const cst = parser.query();
  if (parser.errors.length > 0) {
    throw Error(
      "Sad sad panda, parsing errors detected!\n" + parser.errors[0].message
    );
  }

  const ast = visitor.visit(cst);

  return ast;
}
