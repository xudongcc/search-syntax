import { writeFileSync } from "node:fs";
import { generateCstDts } from "chevrotain";
import { SearchSyntaxParser } from "./dist/parser.js";

const parser = new SearchSyntaxParser();

const dtsString = generateCstDts(parser.getGAstProductions());
// TypeScript does not copy input .d.ts files into its output directory.
for (const path of ["./src/cst.d.ts", "./dist/cst.d.ts"]) {
  writeFileSync(new URL(path, import.meta.url), dtsString);
}
