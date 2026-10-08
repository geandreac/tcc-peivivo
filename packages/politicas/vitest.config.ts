import { defineConfig } from "vitest/config";

// Um único banco por arquivo de teste; os testes rodam em série dentro dele.
export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
