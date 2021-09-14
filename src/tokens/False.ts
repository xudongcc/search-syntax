import { createToken } from "chevrotain";

import { Identifier } from "./Identifier";

export const False = createToken({
  name: "False",
  pattern: /false/,
  longer_alt: Identifier,
});
