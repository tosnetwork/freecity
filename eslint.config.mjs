import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "migrations/**",
      "**/next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Purity guard: contracts and district-rules must stay platform-neutral
    // and deterministic — no I/O imports, no ambient clock, no ambient
    // randomness. Tests are exempt (they may read fixture files).
    files: ["packages/contracts/src/**/*.ts", "packages/district-rules/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "node:*",
                "fs",
                "fs/*",
                "path",
                "os",
                "http",
                "https",
                "net",
                "dns",
                "child_process",
                "worker_threads",
                "crypto",
                "process",
              ],
              message: "contracts and district-rules must stay pure: no platform or I/O imports.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "No ambient clock in deterministic code; use the provided stepTime.",
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "No ambient clock in deterministic code; construct dates from provided values.",
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "No ambient randomness; use the recorded rngSeed via a named draw stream.",
        },
      ],
    },
  },
);
