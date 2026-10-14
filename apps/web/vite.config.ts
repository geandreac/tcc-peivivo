/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// apps/web — React + Vite (pré-projeto §9.1). PWA (RNF06) entra em P5.6.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/main.tsx"],
      reporter: ["text", "lcov"],
      // RNF07 (cobertura ≥ 70 %) valia só no motor; desde 21/09/2026 o CI
      // também falha aqui abaixo do limiar (medido: 78 % linhas, 81 % ramos).
      thresholds: { lines: 70, statements: 70, functions: 70, branches: 60 },
    },
  },
});
