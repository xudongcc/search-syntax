import { Lexer } from "chevrotain";

import { tokens } from "./tokens";

export const SearchSyntaxLexer = new Lexer(tokens);
