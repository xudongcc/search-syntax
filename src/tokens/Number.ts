import { createToken } from "chevrotain";

export const Number = createToken({
  name: "Number",
  pattern: /[+-]?([0-9]*[.])?[0-9]+/,
});
