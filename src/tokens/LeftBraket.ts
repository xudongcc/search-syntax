import { createToken } from "chevrotain";

export const LeftBraket = createToken({
  name: "LeftBraket",
  pattern: /\(/,
});
