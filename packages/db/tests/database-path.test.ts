import { afterEach, describe, expect, it } from "vitest";

import { resolveDatabasePath } from "../src/database-path";

describe("database-path", () => {
  const envKeys = ["DATABASE_PATH"] as const;
  const original: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of envKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it("uses DATABASE_PATH when set", () => {
    original.DATABASE_PATH = process.env.DATABASE_PATH;
    process.env.DATABASE_PATH = "C:/tmp/custom.db";
    expect(resolveDatabasePath()).toBe("C:/tmp/custom.db");
  });

  it("uses default portfolio database file", () => {
    original.DATABASE_PATH = process.env.DATABASE_PATH;
    delete process.env.DATABASE_PATH;
    expect(resolveDatabasePath()).toMatch(/portfolio\.db$/);
  });
});
