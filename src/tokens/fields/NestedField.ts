import { createToken } from "chevrotain";

import { Field } from "./Field";
import { UnquotedLiteral } from "../UnquotedLiteral";

export const NestedField = createToken({
  name: "NestedField",
  pattern: /[a-zA-Z]\w*(\.[a-zA-Z]\w*)+/,
  longer_alt: UnquotedLiteral,
  categories: [Field],
});
