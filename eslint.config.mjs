import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next (made depth-agnostic so nested
    // checkouts, e.g. under .worktrees/, are also excluded):
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/next-env.d.ts",
    // Git worktrees live under here (see superpowers:using-git-worktrees) —
    // each is a full nested checkout with its own node_modules/.next and
    // must never be scanned from the main repo root.
    ".worktrees/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Must be last: disables ESLint formatting rules that conflict with Prettier.
  prettierConfig,
]);

export default eslintConfig;
