import { afterEach, describe, expect, it } from "vitest";

import {
  isSampleDataModeEnabled,
  resolveDatabasePath,
} from "../src/database-path";

describe("database-path", () => {
  const envKeys = ["DATABASE_PATH", "SEED_SAMPLE_DATA"] as const;
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

  it("uses sample database file when requested", () => {
    original.SEED_SAMPLE_DATA = process.env.SEED_SAMPLE_DATA;
    delete process.env.DATABASE_PATH;
    expect(resolveDatabasePath({ sample: true })).toMatch(
      /portfolio\.sample\.db$/,
    );
  });

  it("detects sample data mode from environment", () => {
    original.SEED_SAMPLE_DATA = process.env.SEED_SAMPLE_DATA;
    process.env.SEED_SAMPLE_DATA = "true";
    expect(isSampleDataModeEnabled()).toBe(true);
    expect(resolveDatabasePath()).toMatch(/portfolio\.sample\.db$/);
  });

  it("uses default portfolio database file", () => {
    original.SEED_SAMPLE_DATA = process.env.SEED_SAMPLE_DATA;
    delete process.env.DATABASE_PATH;
    delete process.env.SEED_SAMPLE_DATA;
    expect(isSampleDataModeEnabled()).toBe(false);
    expect(resolveDatabasePath()).toMatch(/portfolio\.db$/);
    expect(resolveDatabasePath()).not.toMatch(/portfolio\.sample\.db$/);
  });

  it("treats SEED_SAMPLE_DATA=1 as enabled", () => {
    original.SEED_SAMPLE_DATA = process.env.SEED_SAMPLE_DATA;
    process.env.SEED_SAMPLE_DATA = "1";
    expect(isSampleDataModeEnabled()).toBe(true);
  });
});
