import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import importX from "eslint-plugin-import-x";
import jest from "eslint-plugin-jest";
import node from "eslint-plugin-n";
import prettier from "eslint-plugin-prettier/recommended";
import promise from "eslint-plugin-promise";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "coverage/**", "docs/**", "src/cst.d.ts"]),
  {
    files: ["**/*.{js,mjs,ts,mts}"],
    extends: [js.configs.recommended, promise.configs["flat/recommended"]],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { "import-x": importX },
    rules: { "import-x/order": "error" },
  },
  {
    files: ["**/*.{ts,mts}"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["**/*.{js,mjs}"],
    extends: [node.configs["flat/recommended-module"]],
  },
  {
    files: ["src/**/*.test.ts"],
    extends: [jest.configs["flat/recommended"]],
    rules: {
      "jest/expect-expect": [
        "error",
        { assertFunctionNames: ["expect", "expectUnsupportedSyntax"] },
      ],
    },
  },
  prettier,
]);
