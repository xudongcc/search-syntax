import { createToken } from "chevrotain";

export const LessThan = createToken({
  name: "LessThan",
  pattern: /:</,
});
