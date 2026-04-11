import { defineConfig } from "drizzle-kit";

const dbPath = process.env.RENDER ? "/data/data.db" : "./data.db";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
