import { createToken } from "chevrotain";

export const GreaterThan = createToken({
  name: "GreaterThan",
  pattern: /:>/,
});
