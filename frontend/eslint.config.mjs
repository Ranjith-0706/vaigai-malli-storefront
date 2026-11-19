import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Product art is SVG/proxied uploads; plain <img> with explicit sizes is intentional.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", ".next-e2e/**", "out/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
