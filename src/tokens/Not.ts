import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const Not = createToken({
  name: "Not",
  pattern: /NOT|-/,
  longer_alt: Identifier,
});
