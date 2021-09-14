import { createToken } from "chevrotain";

export const GreaterThanOrEqual = createToken({
  name: "GreaterThanOrEqual",
  pattern: /:>=/,
});
