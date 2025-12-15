/**
 * Base configuration options for a searchable/filterable field.
 */
interface BaseFieldOptions {
  /**
   * Whether this field contains an array of values.
   * When true, equality searches use `$contains` operator instead of direct equality.
   * @defaultValue false
   */
  array?: boolean;

  /**
   * Whether this field should be included in global (non-field-specific) searches.
   * @defaultValue false
   */
  searchable?: boolean;
}

/**
 * Configuration options for string fields.
 */
interface StringFieldOptions extends BaseFieldOptions {
  /**
   * The data type of the field.
   */
  type: "string";

  /**
   * Whether this field should use full-text search.
   * When true, equality searches use `$fulltext` operator instead of `$eq`.
   * Only available for string type fields.
   * @defaultValue false
   */
  fulltext?: boolean;
}

/**
 * Configuration options for non-string fields (number, boolean, date).
 */
interface NonStringFieldOptions extends BaseFieldOptions {
  /**
   * The data type of the field.
   * - `"number"` - Numeric values (integers or decimals)
   * - `"boolean"` - Boolean values (true/false)
   * - `"date"` - Date/datetime values
   */
  type: "number" | "boolean" | "date";
}

/**
 * Configuration options for a searchable/filterable field.
 * Use `fulltext: true` for string fields that should use full-text search.
 *
 * @example
 * ```ts
 * const options: ParseOptions = {
 *   fields: {
 *     title: { type: "string", fulltext: true, searchable: true },
 *     status: { type: "string" },
 *     count: { type: "number" },
 *   }
 * };
 * ```
 */
export type FieldOptions = StringFieldOptions | NonStringFieldOptions;
