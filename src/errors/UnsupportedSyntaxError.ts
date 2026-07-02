/**
 * Error thrown when a query is syntactically valid but uses a value syntax
 * that is unsupported for the configured field type.
 *
 * @example
 * ```ts
 * import { parse, UnsupportedSyntaxError } from "search-syntax";
 *
 * try {
 *   parse("created:-1w", { fields: { created: { type: "date" } } });
 * } catch (error) {
 *   if (error instanceof UnsupportedSyntaxError) {
 *     console.log(error.field); // "created"
 *     console.log(error.value); // "-1w"
 *   }
 * }
 * ```
 */
export class UnsupportedSyntaxError extends Error {
  /**
   * The field whose value could not be coerced.
   */
  readonly field?: string;

  /**
   * The unsupported value.
   */
  readonly value?: string;

  constructor(field?: string, value?: string) {
    super(
      typeof field !== "undefined" && typeof value !== "undefined"
        ? `Unsupported value "${value}" for field "${field}"`
        : "Unsupported search syntax"
    );
    this.name = "UnsupportedSyntaxError";
    this.field = field;
    this.value = value;
  }
}
