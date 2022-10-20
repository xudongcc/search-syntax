import { createToken } from "chevrotain";
import { UnquotedLiteral } from "../UnquotedLiteral";
import { Date } from "./Date";
import { Value } from "./Value";

export const Number = createToken({
  name: "Number",
  pattern: /[+-]?([0-9]*[.])?[0-9]+/,
  longer_alt: [Date, UnquotedLiteral],
  categories: [Value],
});
