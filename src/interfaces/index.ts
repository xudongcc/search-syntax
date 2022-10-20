export * from "./Attributes";
export * from "./AttributeOptions";
export * from "./ParseOptions";

export type AlternativeType<T> = T extends ReadonlyArray<infer U> ? T | U : T;

export type Filter<T> = {
  [P in keyof T]?: ComparatorOperators<AlternativeType<T[P]>>;
} & ConnectiveOperators<T>;

export interface ComparatorOperators<T = Record<string, unknown>> {
  $eq?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $contains?: T[];
  $fulltext?: T;
}

export interface ConnectiveOperators<T = Record<string, unknown>> {
  $and?: Array<Filter<T>>;
  $or?: Array<Filter<T>>;
  $not?: Filter<T>;
}
