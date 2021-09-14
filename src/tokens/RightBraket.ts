import { createToken } from "chevrotain";

export const RightBraket = createToken({
  name: "RightBraket",
  pattern: /\)/,
});
