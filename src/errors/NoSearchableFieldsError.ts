/**
 * Error thrown when a global search term is used but no searchable fields are configured.
 *
 * @example
 * ```ts
 * import { parse, NoSearchableFieldsError } from "search-syntax";
 *
 * try {
 *   // Global search without searchable fields configured
 *   parse("hello");
 * } catch (error) {
 *   if (error instanceof NoSearchableFieldsError) {
 *     console.log(error.message); // The error message
 *     console.log(error.term);    // The global search term that triggered the error
 *   }
 * }
 * ```
 */
export class NoSearchableFieldsError extends Error {
  /**
   * The global search term that triggered this error.
   */
  readonly term: string;

  constructor(term: string) {
    super(
      `Global search term "${term}" requires at least one field with searchable: true`
    );
    this.name = "NoSearchableFieldsError";
    this.term = term;
  }
}
