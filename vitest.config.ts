import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Unitários do frontend em src/; e2e/ fica sob o Playwright (testDir).
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
