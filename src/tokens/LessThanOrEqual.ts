import { createToken } from "chevrotain";

export const LessThanOrEqual = createToken({
  name: "LessThanOrEqual",
  pattern: /:<=/,
});
