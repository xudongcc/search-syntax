import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const True = createToken({
  name: "True",
  pattern: /true/,
  longer_alt: Identifier,
});
