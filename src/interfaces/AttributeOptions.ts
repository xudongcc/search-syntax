export interface AttributeOptions {
  type: "string" | "number" | "bigint" | "boolean" | "date";
  array?: boolean;
  fulltext?: boolean;
  filterable?: boolean;
  searchable?: boolean;
}
