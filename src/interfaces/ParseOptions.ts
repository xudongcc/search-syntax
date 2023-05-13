import { FieldOptions } from "./FieldOptions";

export interface ParseOptions {
  fields?: { [key: string]: FieldOptions };
  timezone?: string;
}
