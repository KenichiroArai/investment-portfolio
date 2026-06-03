import { describe, expect, it } from "vitest";

describe("@repo/shared", () => {
  it("loads the module", async () => {
    const mod = await import("../src/index");
    expect(mod).toBeDefined();
  });
});
