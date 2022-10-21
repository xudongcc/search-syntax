export interface AttributeOptions {
  type: "string" | "number" | "boolean" | "date";
  array?: boolean;
  fulltext?: boolean;
  filterable?: boolean;
  searchable?: boolean;
}
