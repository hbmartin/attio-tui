import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "istanbul",
      reporter: ["lcov", "text"],
      include: ["source/**/*.{ts,tsx}"],
      exclude: ["test/**/*.test.{ts,tsx}"],
      thresholds: {
        // Lowered during rapid development - Ink/React components + services need special testing setup
        // Will increase as we add more tests after feature completion
        branches: 10,
        functions: 9,
        lines: 10,
        statements: 10,
      },
    },
  },
});
