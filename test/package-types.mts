import {
  parse,
  type Filter,
  type ParseOptions,
  type QueryCstNode,
  SearchSyntaxCstVisitor,
  SearchSyntaxParser,
  searchSyntaxLexer,
} from "search-syntax";

const options: ParseOptions = { fields: { id: { type: "number" } } };
const filter: Filter<{ id: number }> | null = parse("id:1", options);
const parser = new SearchSyntaxParser();
parser.input = searchSyntaxLexer.tokenize("id:1").tokens;
const cst: QueryCstNode = parser.query();
new SearchSyntaxCstVisitor(options).visit(cst);
void filter;
