import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { generateCstDts } from "chevrotain";
import { SearchSyntaxParser } from "./dist/index.mjs";
import { fileURLToPath } from "url";

const parser = new SearchSyntaxParser();

const __dirname = dirname(fileURLToPath(import.meta.url));

const dtsString = generateCstDts(parser.getGAstProductions());
const dtsPath = resolve(__dirname, "src/cst.d.ts");
writeFileSync(dtsPath, dtsString);
