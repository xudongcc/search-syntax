import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parse,
  ParseError,
  SearchSyntaxParser,
  searchSyntaxLexer,
} from "search-syntax";

test("ESM entry point parses queries and reports invalid input", () => {
  assert.deepEqual(parse("status:active OR status:pending"), {
    $or: [{ status: "active" }, { status: "pending" }],
  });
  assert.deepEqual(parse("id:1,2,3", { fields: { id: { type: "number" } } }), {
    id: { $in: [1, 2, 3] },
  });
  assert.throws(() => parse("(status:active"), ParseError);
  assert.deepEqual(parse("status:active"), { status: "active" });
  assert.equal(parse(""), null);
});

test("ESM entry point exposes the lexer and parser", () => {
  const parser = new SearchSyntaxParser();
  parser.input = searchSyntaxLexer.tokenize("status:active").tokens;
  assert.equal(parser.query().name, "query");
  assert.deepEqual(parser.errors, []);
});
