import { Filter, ParseOptions } from "./interfaces/index.js";
import { searchSyntaxLexer } from "./lexer.js";
import { searchSyntaxParser } from "./parser.js";
import { SearchSyntaxCstVisitor } from "./cst-visitor.js";
import { ParseError } from "./errors/index.js";
import { hasValidValues } from "./utils/index.js";

/**
 * Parses a search syntax query string into a filter object.
 *
 * Supports a search syntax similar to GitHub, Shopify, and Gmail:
 * - Field search: `field:value`, `field:"value with spaces"`
 * - Comparison operators: `field:>5`, `field:>=10`, `field:<20`, `field:<=30`
 * - Multiple values: `field:a,b,c` (produces `$in` or `$contains`)
 * - Wildcard search: `field:abc*` (prefix), `field:*abc` (suffix)
 * - Logical operators: `AND`, `OR`, `-` (NOT)
 * - Grouping: `(field1:a OR field2:b)`
 * - Global search: Terms without field names search across all `searchable` fields
 *
 * @typeParam T - The shape of the object being filtered
 * @param query - The search query string to parse
 * @param options - Optional configuration for parsing
 * @returns A filter object compatible with database query builders, or null if no filters are produced
 *
 * @example
 * ```ts
 * // Simple field search
 * parse("status:active")
 * // => { status: "active" }
 *
 * // Comparison operators
 * parse("count:>5")
 * // => { count: { $gt: 5 } }
 *
 * // Multiple values
 * parse("id:1,2,3", { fields: { id: { type: "number" } } })
 * // => { id: { $in: [1, 2, 3] } }
 *
 * // Logical operators
 * parse("status:active OR status:pending")
 * // => { $or: [{ status: "active" }, { status: "pending" }] }
 *
 * // Global search
 * parse("hello", { fields: { name: { type: "string", searchable: true } } })
 * // => { $or: [{ name: "hello" }] }
 *
 * // Empty or no match
 * parse("")
 * // => null
 * ```
 */
export function parse<T = Record<string, any>>(
  query?: string,
  options?: ParseOptions
): Filter<T> | null {
  if (typeof query === "undefined" || query.trim() === "") {
    return null;
  }

  searchSyntaxParser.input = searchSyntaxLexer.tokenize(query.trim()).tokens;

  const cst = searchSyntaxParser.query();

  if (searchSyntaxParser.errors.length > 0) {
    throw new ParseError(searchSyntaxParser.errors[0].message, query);
  }

  const result = new SearchSyntaxCstVisitor(options).visit(cst);

  if (result === undefined || !hasValidValues(result)) {
    return null;
  }

  return result;
}
