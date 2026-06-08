import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Guardrail: never surface a raw error `.message` in a toast.error — it leaks
    // technical/internal text (e.g. "ECONNREFUSED") and bypasses the backend's
    // structured {error:{message,code}}. Route through extractErrorMessage(err, fallback),
    // which parses + sanitizes. The descendant selector also catches `.message`
    // inside template literals and `||` fallbacks passed to toast.error.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Match a caught error's .message (err/error/e) anywhere inside a
          // toast.error(...) call — including template literals and `||` fallbacks.
          // Scoped to error-variable names so structured API fields (result.message,
          // job.message) and the sanitized `extracted.message` helper aren't flagged.
          selector:
            "CallExpression[callee.object.name='toast'][callee.property.name='error'] MemberExpression[object.name=/^(err|error|e)$/][property.name='message']",
          message:
            "Don't pass a raw error .message to toast.error — use extractErrorMessage(err, 'fallback') so backend messages surface and technical errors are sanitized.",
        },
      ],
    },
  },
]);

export default eslintConfig;
