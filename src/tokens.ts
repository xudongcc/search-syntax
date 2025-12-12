// noinspection RegExpSuspiciousBackref

import { createToken, Lexer } from "chevrotain";

// ============================================
// Abstract Tokens (for categorization, not directly matched)
// ============================================

export const ComparatorToken = createToken({
  name: "Comparator",
  pattern: Lexer.NA,
});

export const FieldToken = createToken({
  name: "Field",
  pattern: Lexer.NA,
});

export const ValueToken = createToken({
  name: "Value",
  pattern: Lexer.NA,
});

// ============================================
// Comparators
// ============================================

export const GreaterThanOrEqualToken = createToken({
  name: "GreaterThanOrEqual",
  pattern: /:>=/,
  categories: [ComparatorToken],
});

export const GreaterThanToken = createToken({
  name: "GreaterThan",
  pattern: /:>/,
  categories: [ComparatorToken],
});

export const LessThanOrEqualToken = createToken({
  name: "LessThanOrEqual",
  pattern: /:<=/,
  categories: [ComparatorToken],
});

export const LessThanToken = createToken({
  name: "LessThan",
  pattern: /:</,
  categories: [ComparatorToken],
});

export const EqualToken = createToken({
  name: "Equal",
  pattern: /:/,
  categories: [ComparatorToken],
});

// ============================================
// Brackets
// ============================================

export const LeftBracketToken = createToken({
  name: "LeftBracket",
  pattern: /\(/,
});

export const RightBracketToken = createToken({
  name: "RightBracket",
  pattern: /\)/,
});

// ============================================
// Comma
// ============================================

export const CommaToken = createToken({
  name: "Comma",
  pattern: /,/,
});

// ============================================
// Common (defined early for longer_alt references)
// ============================================

export const UnquotedLiteralToken = createToken({
  name: "UnquotedLiteral",
  pattern: /[^\s:(),]+/,
  categories: [ValueToken],
});

export const IdentifierToken = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
  longer_alt: UnquotedLiteralToken,
  categories: [FieldToken, ValueToken],
});

// ============================================
// Value Types
// ============================================

export const QuotedStringToken = createToken({
  name: "QuotedString",
  pattern: /".*?"|'.*?'/,
  categories: [ValueToken],
});

export const DateToken = createToken({
  name: "Date",
  pattern:
    /([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))(T((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?/,
  categories: [ValueToken],
});

export const NumberToken = createToken({
  name: "Number",
  pattern: /[+-]?([0-9]*[.])?[0-9]+/,
  longer_alt: DateToken,
  categories: [ValueToken],
});

export const NullToken = createToken({
  name: "Null",
  pattern: /null/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

export const TrueToken = createToken({
  name: "True",
  pattern: /true/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

export const FalseToken = createToken({
  name: "False",
  pattern: /false/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

// ============================================
// Fields
// ============================================

export const NestedFieldToken = createToken({
  name: "NestedField",
  pattern: /[a-zA-Z]\w*(\.[a-zA-Z]\w*)+/,
  longer_alt: UnquotedLiteralToken,
  categories: [FieldToken],
});

// ============================================
// Connectives
// ============================================

export const AndToken = createToken({
  name: "And",
  pattern: /and|AND/,
  longer_alt: IdentifierToken,
});

export const OrToken = createToken({
  name: "Or",
  pattern: /or|OR/,
  longer_alt: IdentifierToken,
});

export const NotToken = createToken({
  name: "Not",
  pattern: /-|not|NOT/,
  longer_alt: IdentifierToken,
});

// ============================================
// Whitespace
// ============================================

export const WhiteSpaceToken = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
  longer_alt: QuotedStringToken,
});

// ============================================
// Token List (order matters!)
// ============================================

export const tokens = [
  // Comparators (longer patterns first)
  ComparatorToken,
  GreaterThanOrEqualToken,
  GreaterThanToken,
  LessThanOrEqualToken,
  LessThanToken,
  EqualToken,
  // Connectives
  AndToken,
  OrToken,
  NotToken,
  // Brackets
  LeftBracketToken,
  RightBracketToken,
  // Comma
  CommaToken,
  // Fields
  FieldToken,
  NestedFieldToken,
  // Values
  ValueToken,
  NullToken,
  TrueToken,
  FalseToken,
  NumberToken,
  DateToken,
  QuotedStringToken,
  // Common
  IdentifierToken,
  UnquotedLiteralToken,
  WhiteSpaceToken,
];
