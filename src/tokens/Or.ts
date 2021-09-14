import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const Or = createToken({
  name: "Or",
  pattern: /OR/,
  longer_alt: Identifier,
});
