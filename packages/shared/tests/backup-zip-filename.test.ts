import { describe, expect, it } from "vitest";

import {
  BACKUP_ZIP_SITE_PREFIX,
  buildBackupZipFilename,
  formatBackupFilenameTimestamp,
} from "../src/backup-zip-filename";

describe("backup-zip-filename", () => {
  const fixedDate = new Date("2026-07-12T00:01:10+09:00");

  it("formats timestamp as YYYYMMDDHHmmss in JST", () => {
    expect(formatBackupFilenameTimestamp(fixedDate)).toBe("20260712000110");
  });

  it("builds all-portfolio backup filename with site prefix", () => {
    expect(buildBackupZipFilename("all", undefined, fixedDate)).toBe(
      `${BACKUP_ZIP_SITE_PREFIX}-all-20260712000110.zip`,
    );
  });

  it("builds single-portfolio backup filename with site prefix and portfolio code", () => {
    expect(buildBackupZipFilename("portfolio", "ideco", fixedDate)).toBe(
      `${BACKUP_ZIP_SITE_PREFIX}-ideco-20260712000110.zip`,
    );
    expect(buildBackupZipFilename("portfolio", "monex", fixedDate)).toBe(
      `${BACKUP_ZIP_SITE_PREFIX}-monex-20260712000110.zip`,
    );
  });
});
