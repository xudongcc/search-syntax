import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const Null = createToken({
  name: "Null",
  pattern: /NULL/,
  longer_alt: Identifier,
});
