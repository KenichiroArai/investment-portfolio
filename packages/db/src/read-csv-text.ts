import { readFileSync } from "node:fs";

import iconv from "iconv-lite";

export type ReadCsvTextOptions = {
  encoding?: "utf8" | "shift_jis";
};

export function readCsvText(
  filePath: string,
  options: ReadCsvTextOptions = {},
): string {
  let result = "";
  const encoding = options.encoding ?? "utf8";
  const buffer = readFileSync(filePath);

  if (encoding === "shift_jis") {
    result = iconv.decode(buffer, "Shift_JIS");
    return result;
  }

  result = buffer.toString("utf8");
  if (result.charCodeAt(0) === 0xfeff) {
    result = result.slice(1);
  }

  return result;
}
