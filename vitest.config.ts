import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["source/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "istanbul",
      reporter: ["lcov", "text"],
      include: ["source/**/*.{ts,tsx}"],
      exclude: ["source/**/*.test.{ts,tsx}"],
      thresholds: {
        // Lowered for initial Milestone 1 - Ink/React components need special testing setup
        // Will increase as we add more tests in subsequent milestones
        branches: 20,
        functions: 15,
        lines: 20,
        statements: 20,
      },
    },
  },
});
