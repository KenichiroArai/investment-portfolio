import { afterEach, describe, expect, it } from "vitest";

import { getApiBaseUrl } from "@/lib/api-base";

describe("getApiBaseUrl", () => {
  const original = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = original;
    }
  });

  it("uses default localhost when env is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:3001");
  });

  it("uses env override", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";
    expect(getApiBaseUrl()).toBe("http://localhost:4000");
  });
});
