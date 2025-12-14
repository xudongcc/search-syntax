/**
 * Types of nodes in the parsed search syntax tree.
 */
export enum NodeType {
  /** A complete query containing one or more terms */
  QUERY = "query",
  /** A single search term (field:value or global search) */
  TERM = "term",
}
