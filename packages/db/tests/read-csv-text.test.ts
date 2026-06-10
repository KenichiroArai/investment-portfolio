import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readCsvText } from "../src/read-csv-text";

describe("readCsvText", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
    vi.restoreAllMocks();
  });

  function writeTempFile(name: string, content: string | Buffer): string {
    const dir = mkdtempSync(join(tmpdir(), "read-csv-text-"));
    tempDirs.push(dir);
    const filePath = join(dir, name);
    writeFileSync(filePath, content);
    return filePath;
  }

  it("reads valid UTF-8 CSV text", () => {
    const filePath = writeTempFile("utf8.csv", "商品タイプ\n国内株式\n");
    expect(readCsvText(filePath)).toBe("商品タイプ\n国内株式\n");
  });

  it("falls back to Shift_JIS when UTF-8 decode contains replacement characters", () => {
    const shiftJisBytes = Buffer.from([0x83, 0x65, 0x83, 0x58, 0x83, 0x67]);
    const filePath = writeTempFile("sjis.csv", shiftJisBytes);
    expect(readCsvText(filePath)).toBe("テスト");
  });

  it("falls back to Shift_JIS when UTF-8 decode matches mojibake signature", () => {
    const signature = "\u0094\u00D4\u008D\u0086";
    const filePath = writeTempFile("signature.csv", signature);
    const utf8 = Buffer.from(signature).toString("utf8");
    expect(utf8.includes(signature)).toBe(true);
    expect(readCsvText(filePath)).not.toBe(utf8);
  });

  it("uses UTF-8 fallback inside decodeShiftJis when Shift_JIS decoding fails", () => {
    const filePath = writeTempFile("fallback.csv", Buffer.from([0xff, 0xfe]));
    const originalDecode = TextDecoder.prototype.decode;
    vi.spyOn(TextDecoder.prototype, "decode").mockImplementation(function decode(
      this: TextDecoder,
      input: BufferSource,
    ) {
      if (this.encoding === "shift_jis") {
        throw new Error("shift_jis unavailable");
      }
      return originalDecode.call(this, input);
    });

    const content = readCsvText(filePath);
    expect(typeof content).toBe("string");
  });
});
