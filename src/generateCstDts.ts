import { writeFileSync } from "fs";
import { resolve } from "path";
import { generateCstDts } from "chevrotain";

import { SearchSyntaxParser } from "./SearchSyntaxParser";

const parser = new SearchSyntaxParser();

writeFileSync(
  resolve(__dirname, "./cst.d.ts"),
  generateCstDts(parser.getGAstProductions())
);
