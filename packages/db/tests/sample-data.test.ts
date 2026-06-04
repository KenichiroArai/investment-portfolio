import { afterEach, describe, expect, it } from "vitest";

import {
  clearSampleData,
  isSampleDataSeeded,
  seedSampleData,
} from "../src/sample-data";
import { getCurrentSnapshot } from "../src/repositories/snapshots";
import { createTestDb } from "../src/test-utils";

describe("sample data", () => {
  const instances: ReturnType<typeof createTestDb>[] = [];

  afterEach(() => {
    for (const instance of instances) {
      instance.sqlite.close();
    }
    instances.length = 0;
  });

  function setup() {
    const instance = createTestDb();
    instances.push(instance);
    return instance.db;
  }

  it("seeds ideco sample holdings and clears them", async () => {
    const db = setup();
    const first = await seedSampleData(db);
    expect(first.status).toBe("seeded");
    expect(await isSampleDataSeeded(db)).toBe(true);

    const second = await seedSampleData(db);
    expect(second.status).toBe("already_seeded");

    const snapshot = await getCurrentSnapshot(db, "ideco");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.portfolioName).toBe("iDeCo（サンプル）");
    expect(snapshot?.lines[0]?.instrumentName).toContain("サンプル");

    const cleared = await clearSampleData(db);
    expect(cleared.status).toBe("cleared");
    expect(await isSampleDataSeeded(db)).toBe(false);
    expect(await getCurrentSnapshot(db, "ideco")).toBeNull();
  });
});
