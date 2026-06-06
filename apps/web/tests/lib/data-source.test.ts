import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getBasePath,
  getDataSource,
  getPortfoliosFetchUrl,
  getSnapshotFetchUrl,
  getSnapshotLoadErrorMessage,
} from "@/lib/data-source";

describe("data-source", () => {
  const envKeys = [
    "NEXT_PUBLIC_DATA_SOURCE",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_BASE_PATH",
  ] as const;
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

  beforeEach(() => {
    for (const key of envKeys) {
      original[key] = process.env[key];
    }
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  });

  it("defaults to api data source", () => {
    expect(getDataSource()).toBe("api");
    expect(getSnapshotFetchUrl("ideco")).toBe(
      "http://127.0.0.1:3001/portfolios/ideco/snapshot/current",
    );
    expect(getPortfoliosFetchUrl()).toBe("http://127.0.0.1:3001/portfolios");
    expect(getSnapshotLoadErrorMessage()).toMatch(/API に接続できません/);
  });

  it("uses API URL override", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    expect(getSnapshotFetchUrl("ideco")).toBe(
      "http://localhost:4000/portfolios/ideco/snapshot/current",
    );
  });

  it("uses static JSON path with basePath", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    process.env.NEXT_PUBLIC_BASE_PATH = "/investment-portfolio";
    expect(getDataSource()).toBe("static");
    expect(getBasePath()).toBe("/investment-portfolio");
    expect(getSnapshotFetchUrl("ideco")).toBe(
      "/investment-portfolio/data/portfolios/ideco/current.json",
    );
    expect(getPortfoliosFetchUrl()).toBe(
      "/investment-portfolio/data/portfolios.json",
    );
    expect(getSnapshotLoadErrorMessage()).toMatch(/pages:export/);
  });

  it("uses static JSON path without basePath", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    expect(getSnapshotFetchUrl("ideco")).toBe(
      "/data/portfolios/ideco/current.json",
    );
  });

  it("trims trailing slash from basePath for static JSON", () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = "static";
    process.env.NEXT_PUBLIC_BASE_PATH = "/investment-portfolio/";
    expect(getSnapshotFetchUrl("ideco")).toBe(
      "/investment-portfolio/data/portfolios/ideco/current.json",
    );
  });
});
