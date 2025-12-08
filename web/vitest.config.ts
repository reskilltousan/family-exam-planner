import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}
if (!process.env.DATABASE_PROVIDER) {
  process.env.DATABASE_PROVIDER = "sqlite";
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    hookTimeout: 20000,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
