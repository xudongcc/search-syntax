import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const Null = createToken({
  name: "Null",
  pattern: /null|NULL/,
  longer_alt: Identifier,
});
