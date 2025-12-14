/**
 * Error thrown when the search syntax parser encounters invalid input.
 *
 * @example
 * ```ts
 * import { parse, ParseError } from "search-syntax";
 *
 * try {
 *   parse(")invalid");
 * } catch (error) {
 *   if (error instanceof ParseError) {
 *     console.log(error.message); // The error message
 *     console.log(error.query);   // The original query that failed
 *   }
 * }
 * ```
 */
export class ParseError extends Error {
  /**
   * The original query string that failed to parse.
   */
  readonly query: string;

  constructor(message: string, query: string) {
    super(message);
    this.name = "ParseError";
    this.query = query;
  }
}
