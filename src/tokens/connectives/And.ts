import { createToken } from "chevrotain";
import { Identifier } from "../Identifier";

export const And = createToken({
  name: "And",
  pattern: /AND/,
  longer_alt: [Identifier],
});
