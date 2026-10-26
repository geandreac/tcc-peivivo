import { defineConfig } from "vitest/config";

export default defineConfig({
  // http.test.ts importa o código Deno de supabase/functions/_shared: os
  // especificadores npm: apontam para os mesmos pacotes instalados no workspace.
  resolve: { alias: { "npm:@supabase/supabase-js@2.45.4": "@supabase/supabase-js", "npm:zod@4.6.7": "zod" } },
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
