import { createToken } from "chevrotain";

export const QuotedString = createToken({
  name: "QuotedString",
  pattern: /".*?"/,
});
