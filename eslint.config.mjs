import js from "@eslint/js"
import globals from "globals"
import json from "@eslint/json"
import css from "@eslint/css"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.node,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    },
  },
  {
    files: ["**/*.test.{js,mjs,cjs}", "**/*.spec.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    },
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        "$": "readonly",
        io: "readonly",
        moment: "readonly",
        kakao: "readonly",
        katex: "readonly",
        md5: "readonly",
        Identicon: "readonly"
      }
    }
  },
  { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
  {
    files: ["**/*.css"], plugins: { css }, language: "css/css", extends: ["css/recommended"],
    rules: {
      "css/no-important": "off",
    },
  },
  globalIgnores([".vscode/"]),
  globalIgnores(["public/lib/"]),
  globalIgnores(["skins/Buma/"]), // pretty much written off of external skin
  globalIgnores(["package.json", "package-lock.json"]),
]);
