/**
 * Configuration options for a searchable/filterable field.
 */
export interface FieldOptions {
  /**
   * The data type of the field.
   * - `"string"` - Text values
   * - `"number"` - Numeric values (integers or decimals)
   * - `"boolean"` - Boolean values (true/false)
   * - `"date"` - Date/datetime values
   */
  type: "string" | "number" | "boolean" | "date";

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
