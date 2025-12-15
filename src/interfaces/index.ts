export * from "./FieldOptions.js";
export * from "./ParseOptions.js";

/**
 * Utility type that extracts the element type from an array, or returns the type itself.
 * Used for handling both array and non-array field types uniformly.
 * @typeParam T - The type to extract from (array or non-array)
 */
export type ArrayElement<T> = T extends ReadonlyArray<infer U> ? T | U : T;

/**
 * MongoDB-style comparison operators for field values.
 * These operators are used to build query conditions.
 *
 * @typeParam T - The type of value being compared
 *
 * @example
 * ```ts
 * // Greater than comparison
 * { age: { $gt: 18 } }
 *
 * // Value in array
 * { status: { $in: ["active", "pending"] } }
 *
 * // Pattern matching (SQL LIKE style)
 * { name: { $like: "john%" } }
 * ```
 */
export interface ComparisonOperators<T = unknown> {
  /**
   * Matches values that are equal to a specified value.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/eq/
   */
  $eq?: T;

  /**
   * Matches values that are greater than a specified value.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/gt/
   */
  $gt?: T;

  /**
   * Matches values that are greater than or equal to a specified value.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/gte/
   */
  $gte?: T;

  /**
   * Matches values that are less than a specified value.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/lt/
   */
  $lt?: T;

  /**
   * Matches values that are less than or equal to a specified value.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/lte/
   */
  $lte?: T;

  /**
   * Matches any of the values specified in an array.
   * Used for comma-separated values in search syntax (e.g., `status:active,pending`).
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/in/
   */
  $in?: T[];

  /**
   * Matches arrays that contain all elements specified in the query.
   * Used for array fields in search syntax.
   */
  $contains?: T[];

  /**
   * Provides SQL LIKE-style pattern matching.
   * Used for wildcard searches (e.g., `name:john*` becomes `{ $like: "john%" }`).
   * Use `%` as wildcard character.
   */
  $like?: string;

  /**
   * Performs full-text search on string fields.
   * Used when field is configured with `fulltext: true`.
   */
  $fulltext?: string;
}

/**
 * MongoDB-style logical operators for combining query conditions.
 *
 * @typeParam T - The shape of the document being queried
 *
 * @example
 * ```ts
 * // AND: all conditions must match
 * { $and: [{ status: "active" }, { age: { $gt: 18 } }] }
 *
 * // OR: at least one condition must match
 * { $or: [{ status: "active" }, { status: "pending" }] }
 *
 * // NOT: negates the condition
 * { $not: { status: "archived" } }
 * ```
 */
export interface LogicalOperators<T = Record<string, unknown>> {
  /**
   * Joins query clauses with a logical AND.
   * Returns all documents that match the conditions of both clauses.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/and/
   */
  $and?: Array<Filter<T>>;

  /**
   * Joins query clauses with a logical OR.
   * Returns all documents that match the conditions of either clause.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/or/
   */
  $or?: Array<Filter<T>>;

  /**
   * Inverts the effect of a query expression.
   * Returns documents that do not match the query expression.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/not/
   */
  $not?: Filter<T>;

  /**
   * Joins query clauses with a logical NOR.
   * Returns all documents that fail to match both clauses.
   * @see https://www.mongodb.com/docs/manual/reference/operator/query/nor/
   */
  $nor?: Array<Filter<T>>;
}

/**
 * MongoDB-style filter query object.
 * Represents a parsed search syntax query as a MongoDB query document.
 *
 * @typeParam T - The shape of the document being queried
 *
 * @example
 * ```ts
 * // Simple field match
 * const filter: Filter<User> = { status: "active" };
 *
 * // With comparison operators
 * const filter: Filter<User> = { age: { $gt: 18 } };
 *
 * // With logical operators
 * const filter: Filter<User> = {
 *   $or: [{ status: "active" }, { status: "pending" }]
 * };
 *
 * // Combined conditions
 * const filter: Filter<User> = {
 *   status: "active",
 *   age: { $gte: 18 },
 *   $or: [{ role: "admin" }, { role: "moderator" }]
 * };
 * ```
 */
export type Filter<T = Record<string, unknown>> = {
  [P in keyof T]?:
    | ArrayElement<T[P]>
    | ComparisonOperators<ArrayElement<T[P]>>;
} & LogicalOperators<T>;

// Legacy type aliases for backward compatibility
/** @deprecated Use ComparisonOperators instead */
export type ComparatorOperators<T = unknown> = ComparisonOperators<T>;
/** @deprecated Use LogicalOperators instead */
export type ConnectiveOperators<T = Record<string, unknown>> =
  LogicalOperators<T>;
/** @deprecated Use ArrayElement instead */
export type AlternativeType<T> = ArrayElement<T>;
