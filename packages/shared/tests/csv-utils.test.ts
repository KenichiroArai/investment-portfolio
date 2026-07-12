import { describe, expect, it } from "vitest";

import {
  normalizeCsvContent,
  parseCsv,
  parseCsvTable,
  serializeCsvTable,
} from "../src/csv-utils";

describe("csv-utils", () => {
  it("serializes and parses quoted values with commas", () => {
    const csv = serializeCsvTable(["name", "note"], [["銘柄A", 'hello, "world"']]);
    const parsed = parseCsvTable(csv);

    expect(parsed.headers).toEqual(["name", "note"]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].name).toBe("銘柄A");
    expect(parsed.rows[0].note).toBe('hello, "world"');
  });

  it("strips UTF-8 BOM before parsing", () => {
    const csv = `${"\uFEFF"}id,name\n1,test\n`;
    const normalized = normalizeCsvContent(csv);
    const parsed = parseCsv(normalized);

    expect(parsed[0]).toEqual(["id", "name"]);
    expect(parsed[1]).toEqual(["1", "test"]);
  });

  it("returns empty rows for header-only CSV", () => {
    const parsed = parseCsvTable("id,name\n");
    expect(parsed.headers).toEqual(["id", "name"]);
    expect(parsed.rows).toEqual([]);
  });

  it("returns empty headers and rows for blank CSV", () => {
    const parsed = parseCsvTable("\n\n");
    expect(parsed.headers).toEqual([]);
    expect(parsed.rows).toEqual([]);
  });

  it("fills missing cells with empty strings", () => {
    const parsed = parseCsvTable("id,name,note\n1,only-id\n");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toEqual({ id: "1", name: "only-id", note: "" });
  });
});
