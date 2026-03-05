import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      // Thresholds set to current levels to track improvements
      // Increase gradually as coverage improves
      thresholds: {
        lines: 55,
        functions: 75,
        branches: 60,
        statements: 55,
      },
      exclude: ["node_modules/", "dist/", "tests/", "**/*.d.ts", "**/*.config.*", "scripts/"],
    },
    globals: true,
    environment: "node",
  },
});
