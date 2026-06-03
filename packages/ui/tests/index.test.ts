import { describe, expect, it } from "vitest";

describe("@repo/ui", () => {
  it("loads the module", async () => {
    const mod = await import("../src/index");
    expect(mod).toBeDefined();
  });
});
