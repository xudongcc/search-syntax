import { type FieldOptions } from "./FieldOptions.js";

/**
 * Options for parsing search syntax queries.
 */
export interface ParseOptions {
  /**
   * Field definitions mapping field names to their configuration.
   * Used for type coercion and determining which fields are searchable.
   * @example
   * ```ts
   * {
   *   id: { type: "number" },
   *   name: { type: "string", searchable: true },
   *   tags: { type: "string", array: true }
   * }
   * ```
   */
  fields?: Record<string, FieldOptions>;

  /**
   * Field name aliases mapping alias names to actual field names.
   * Allows users to use alternative names in search queries.
   * @example
   * ```ts
   * { author: "createdBy", tag: "tags" }
   * ```
   */
  aliases?: Record<string, string>;

  /**
   * Timezone to use when parsing date values.
   * @example "Asia/Shanghai", "America/New_York"
   */
  timezone?: string;
}
