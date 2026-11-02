
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["shared/src/tests/**/*.test.ts"],
  },
});
