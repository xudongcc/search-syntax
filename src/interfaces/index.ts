export * from "./ParseOptions";

export type AlternativeType<T> = T extends ReadonlyArray<infer U> ? T | U : T;

export type Filter<T> = {
  [P in keyof T]?: FilterOperators<AlternativeType<T[P]>>;
} & RootFilterOperators<T>;

export interface FilterOperators<T = Record<string, unknown>> {
  $eq?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
}

export interface RootFilterOperators<T = Record<string, unknown>> {
  $and?: Array<Filter<T>>;
  $or?: Array<Filter<T>>;
  $not?: FilterOperators<T>;
}
