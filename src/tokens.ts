// noinspection RegExpSuspiciousBackref

import { createToken, Lexer } from "chevrotain";

// ============================================
// Abstract Tokens (for categorization, not directly matched)
// ============================================

/**
 * Abstract token category for comparison operators.
 * Used as a parent category for `:`, `:<`, `:>`, `:<=`, `:>=`.
 */
export const ComparatorToken = createToken({
  name: "Comparator",
  pattern: Lexer.NA,
});

/**
 * Abstract token category for field identifiers.
 * Used as a parent category for field name tokens.
 */
export const FieldToken = createToken({
  name: "Field",
  pattern: Lexer.NA,
});

/**
 * Abstract token category for values.
 * Used as a parent category for all value type tokens.
 */
export const ValueToken = createToken({
  name: "Value",
  pattern: Lexer.NA,
});

// ============================================
// Comparators
// ============================================

/**
 * Greater than or equal operator token (`:>=`).
 */
export const GreaterThanOrEqualToken = createToken({
  name: "GreaterThanOrEqual",
  pattern: /:>=/,
  categories: [ComparatorToken],
});

/**
 * Greater than operator token (`:>`).
 */
export const GreaterThanToken = createToken({
  name: "GreaterThan",
  pattern: /:>/,
  categories: [ComparatorToken],
});

/**
 * Less than or equal operator token (`:<=`).
 */
export const LessThanOrEqualToken = createToken({
  name: "LessThanOrEqual",
  pattern: /:<=/,
  categories: [ComparatorToken],
});

/**
 * Less than operator token (`:<`).
 */
export const LessThanToken = createToken({
  name: "LessThan",
  pattern: /:</,
  categories: [ComparatorToken],
});

/**
 * Equal operator token (`:`).
 */
export const EqualToken = createToken({
  name: "Equal",
  pattern: /:/,
  categories: [ComparatorToken],
});

// ============================================
// Brackets
// ============================================

/**
 * Left bracket token `(` for grouping expressions.
 */
export const LeftBracketToken = createToken({
  name: "LeftBracket",
  pattern: /\(/,
});

/**
 * Right bracket token `)` for grouping expressions.
 */
export const RightBracketToken = createToken({
  name: "RightBracket",
  pattern: /\)/,
});

// ============================================
// Comma
// ============================================

/**
 * Comma token `,` for separating multiple values.
 */
export const CommaToken = createToken({
  name: "Comma",
  pattern: /,/,
});

// ============================================
// Common (defined early for longer_alt references)
// ============================================

/**
 * Unquoted literal value token.
 * Matches any sequence of non-whitespace, non-special characters.
 */
export const UnquotedLiteralToken = createToken({
  name: "UnquotedLiteral",
  pattern: /[^\s:(),]+/,
  categories: [ValueToken],
});

/**
 * Identifier token for field names and simple values.
 * Matches alphanumeric identifiers starting with a letter.
 */
export const IdentifierToken = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
  longer_alt: UnquotedLiteralToken,
  categories: [FieldToken, ValueToken],
});

// ============================================
// Value Types
// ============================================

/**
 * Quoted string token for values containing spaces or special characters.
 * Supports both single and double quotes.
 */
export const QuotedStringToken = createToken({
  name: "QuotedString",
  pattern: /".*?"|'.*?'/,
  categories: [ValueToken],
});

/**
 * ISO 8601 date/datetime token.
 * Supports dates, date-times with optional timezone.
 */
export const DateToken = createToken({
  name: "Date",
  pattern:
    /([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-3])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))(T((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?/,
  categories: [ValueToken],
});

/**
 * Numeric value token.
 * Supports integers and decimals, with optional sign.
 */
export const NumberToken = createToken({
  name: "Number",
  pattern: /[+-]?([0-9]*[.])?[0-9]+/,
  longer_alt: DateToken,
  categories: [ValueToken],
});

/**
 * Null literal token.
 */
export const NullToken = createToken({
  name: "Null",
  pattern: /null/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

/**
 * Boolean true literal token.
 */
export const TrueToken = createToken({
  name: "True",
  pattern: /true/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

/**
 * Boolean false literal token.
 */
export const FalseToken = createToken({
  name: "False",
  pattern: /false/,
  longer_alt: IdentifierToken,
  categories: [ValueToken],
});

// ============================================
// Fields
// ============================================

/**
 * Nested field token for dot-notation field paths.
 * Example: `user.profile.name`
 */
export const NestedFieldToken = createToken({
  name: "NestedField",
  pattern: /[a-zA-Z]\w*(\.[a-zA-Z]\w*)+/,
  longer_alt: UnquotedLiteralToken,
  categories: [FieldToken],
});

// ============================================
// Connectives
// ============================================

/**
 * AND logical operator token.
 * Case-insensitive: `and` or `AND`.
 */
export const AndToken = createToken({
  name: "And",
  pattern: /and|AND/,
  longer_alt: IdentifierToken,
});

/**
 * OR logical operator token.
 * Case-insensitive: `or` or `OR`.
 */
export const OrToken = createToken({
  name: "Or",
  pattern: /or|OR/,
  longer_alt: IdentifierToken,
});

/**
 * NOT logical operator token.
 * Supports `-`, `not`, or `NOT`.
 */
export const NotToken = createToken({
  name: "Not",
  pattern: /-|not|NOT/,
  longer_alt: IdentifierToken,
});

// ============================================
// Whitespace
// ============================================

/**
 * Whitespace token (skipped during parsing).
 */
export const WhiteSpaceToken = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
  longer_alt: QuotedStringToken,
});

// ============================================
// Token List (order matters!)
// ============================================

/**
 * Complete list of tokens in precedence order.
 * Order matters for correct lexing - longer/more specific patterns first.
 */
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
