import { readFileSync } from "node:fs";

function decodeShiftJis(buffer: Buffer): string {
  let result = "";

  try {
    result = new TextDecoder("shift_jis").decode(buffer);
  } catch {
    result = buffer.toString("utf8");
  }

  return result;
}

function looksLikeMojibake(content: string): boolean {
  let result = false;

  if (content.includes("\uFFFD")) {
    result = true;
    return result;
  }

  if (content.includes("\u0094\u00D4\u008D\u0086")) {
    result = true;
    return result;
  }

  return result;
}

export function readCsvText(filePath: string): string {
  let result = "";

  const buffer = readFileSync(filePath);
  const utf8 = buffer.toString("utf8");
  if (!looksLikeMojibake(utf8)) {
    result = utf8;
    return result;
  }

  result = decodeShiftJis(buffer);
  return result;
}
