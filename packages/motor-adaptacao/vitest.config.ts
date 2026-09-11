import { defineConfig } from "vitest/config";

// RNF07: cobertura de testes automatizados ≥ 70 %. O CI falha abaixo disso.
export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      reporter: ["text", "lcov"],
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
