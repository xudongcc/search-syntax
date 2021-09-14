import { createToken } from "chevrotain";

export const UnquotedLiteral = createToken({
  name: "UnquotedLiteral",
  pattern: /[^\s:]+/,
});
