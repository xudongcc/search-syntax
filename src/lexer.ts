import { Lexer } from "chevrotain";

import { tokens } from "./tokens.js";

export const searchSyntaxLexer = new Lexer(tokens);
