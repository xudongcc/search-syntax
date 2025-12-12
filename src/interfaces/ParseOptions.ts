import { type FieldOptions } from "./FieldOptions.js";

export interface ParseOptions {
  fields?: Record<string, FieldOptions>;
  aliases?: Record<string, string>;
  timezone?: string;
}
