import path from "node:path";
import { defineConfig } from "vitest/config";

/** Tests de base de données : nécessitent un PostgreSQL (TEST_DATABASE_ADMIN_URL). */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "node_modules/server-only/empty.js") } },
  test: {
    include: ["tests/db/**/*.test.ts"],
    globalSetup: ["tests/db/global-setup.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
