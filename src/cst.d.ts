import type { CstNode, ICstVisitor, IToken } from "chevrotain";

export interface QueryCstNode extends CstNode {
  name: "query";
  children: QueryCstChildren;
}

export type QueryCstChildren = {
  orQuery: OrQueryCstNode[];
};

export interface OrQueryCstNode extends CstNode {
  name: "orQuery";
  children: OrQueryCstChildren;
}

export type OrQueryCstChildren = {
  left: AndQueryCstNode[];
  Or?: IToken[];
  right?: AndQueryCstNode[];
};

export interface AndQueryCstNode extends CstNode {
  name: "andQuery";
  children: AndQueryCstChildren;
}

export type AndQueryCstChildren = {
  left: NotQueryCstNode[];
  And?: IToken[];
  right?: NotQueryCstNode[];
};

export interface NotQueryCstNode extends CstNode {
  name: "notQuery";
  children: NotQueryCstChildren;
}

export type NotQueryCstChildren = {
  Not?: IToken[];
  atomicQuery: AtomicQueryCstNode[];
};

export interface AtomicQueryCstNode extends CstNode {
  name: "atomicQuery";
  children: AtomicQueryCstChildren;
}

export type AtomicQueryCstChildren = {
  subQuery?: SubQueryCstNode[];
  term?: TermCstNode[];
};

export interface SubQueryCstNode extends CstNode {
  name: "subQuery";
  children: SubQueryCstChildren;
}

export type SubQueryCstChildren = {
  LeftBracket: IToken[];
  query: QueryCstNode[];
  RightBracket: IToken[];
};

export interface TermCstNode extends CstNode {
  name: "term";
  children: TermCstChildren;
}

export type TermCstChildren = {
  field?: FieldCstNode[];
  comparator?: ComparatorCstNode[];
  value: ValueCstNode[];
};

export interface FieldCstNode extends CstNode {
  name: "field";
  children: FieldCstChildren;
}

export type FieldCstChildren = {
  Field: IToken[];
};

export interface ComparatorCstNode extends CstNode {
  name: "comparator";
  children: ComparatorCstChildren;
}

export type ComparatorCstChildren = {
  Comparator: IToken[];
};

export interface ValueCstNode extends CstNode {
  name: "value";
  children: ValueCstChildren;
}

export type ValueCstChildren = {
  Value: IToken[];
};

export interface ICstNodeVisitor<IN, OUT> extends ICstVisitor<IN, OUT> {
  query(children: QueryCstChildren, param?: IN): OUT;
  orQuery(children: OrQueryCstChildren, param?: IN): OUT;
  andQuery(children: AndQueryCstChildren, param?: IN): OUT;
  notQuery(children: NotQueryCstChildren, param?: IN): OUT;
  atomicQuery(children: AtomicQueryCstChildren, param?: IN): OUT;
  subQuery(children: SubQueryCstChildren, param?: IN): OUT;
  term(children: TermCstChildren, param?: IN): OUT;
  field(children: FieldCstChildren, param?: IN): OUT;
  comparator(children: ComparatorCstChildren, param?: IN): OUT;
  value(children: ValueCstChildren, param?: IN): OUT;
}
