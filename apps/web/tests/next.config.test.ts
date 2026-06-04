import { afterEach, describe, expect, it, vi } from "vitest";

describe("next.config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses no basePath in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const config = (await import("../next.config")).default;
    expect(config.output).toBe("export");
    expect(config.basePath).toBe("");
    expect(config.assetPrefix).toBe("");
    expect(config.trailingSlash).toBe(true);
    expect(config.images).toEqual({ unoptimized: true });
  });

  it("uses GitHub Pages basePath in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const config = (await import("../next.config")).default;
    expect(config.basePath).toBe("/investment-portfolio");
    expect(config.assetPrefix).toBe("/investment-portfolio");
    expect(config.env).toEqual({
      NEXT_PUBLIC_BASE_PATH: "/investment-portfolio",
      NEXT_PUBLIC_DATA_SOURCE: "static",
    });
  });

  it("uses api data source in development env", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const config = (await import("../next.config")).default;
    expect(config.env).toEqual({
      NEXT_PUBLIC_BASE_PATH: "",
      NEXT_PUBLIC_DATA_SOURCE: "api",
    });
  });
});
