import { defineConfig } from "drizzle-kit";

const result = defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/portfolio.db",
  },
});

export default result;
