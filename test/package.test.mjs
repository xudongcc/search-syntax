import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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

test("date-time parsing handles long whitespace within a bounded time", () => {
  // A separate process makes the timeout effective even if parsing blocks.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `
        import assert from "node:assert/strict";
        import { parse } from "search-syntax";
        const value = "2024-01-15" + " ".repeat(1_000_000) + "12:00:00";
        const result = parse('created:"' + value + '"', {
          fields: { created: { type: "date" } },
          timezone: "UTC",
        });
        assert.deepEqual(result, { created: new Date("2024-01-15T12:00:00.000Z") });
      `,
    ],
    { timeout: 5_000, stdio: "pipe" },
  );
});
