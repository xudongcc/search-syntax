import { Lexer } from "chevrotain";

import { tokens } from "./tokens.js";

/**
 * Lexer instance for tokenizing search syntax strings.
 * Converts input strings into a stream of tokens for parsing.
 */
export const searchSyntaxLexer = new Lexer(tokens);
