import { createToken } from "chevrotain";

import { UnquotedLiteral } from "./UnquotedLiteral";

export const Identifier = createToken({
  name: "Identifier",
  pattern: /[a-zA-Z]\w*/,
  longer_alt: UnquotedLiteral,
});
