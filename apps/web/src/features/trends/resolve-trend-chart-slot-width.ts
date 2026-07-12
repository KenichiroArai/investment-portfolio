const MIN_SLOT_WIDTH = 56;
const DEFAULT_TARGET_WIDTH = 640;
const ASCII_CHAR_WIDTH = 6.5;
const WIDE_CHAR_WIDTH = 11;
const LABEL_PAIR_PADDING = 8;
/** X 軸ラベルの表示幅上限（長い銘柄名は省略し、ツールチップで全文を見せる） */
const MAX_X_LABEL_DISPLAY_WIDTH = 132;
const ELLIPSIS = "…";

export function resolveXLabelAnchor(
  index: number,
  total: number,
): "start" | "middle" | "end" {
  let result: "start" | "middle" | "end" = "middle";
  if (index === 0) {
    result = "start";
    return result;
  }
  if (index === total - 1) {
    result = "end";
    return result;
  }
  return result;
}

function isWideChar(char: string): boolean {
  let result = false;
  const code = char.codePointAt(0);
  if (code === undefined) {
    return result;
  }

  // CJK / 全角記号など、等幅に近い広い文字
  if (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xa960 && code <= 0xa97f) ||
    (code >= 0xac00 && code <= 0xd7ff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xfe1f) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x20000 && code <= 0x2fa1f)
  ) {
    result = true;
    return result;
  }

  return result;
}

export function estimateTrendChartLabelWidth(label: string): number {
  let result = 0;
  for (const char of label) {
    if (isWideChar(char)) {
      result += WIDE_CHAR_WIDTH;
      continue;
    }
    result += ASCII_CHAR_WIDTH;
  }
  return result;
}

export function truncateTrendChartLabel(
  label: string,
  maxWidth: number = MAX_X_LABEL_DISPLAY_WIDTH,
): string {
  let result = label;

  if (estimateTrendChartLabelWidth(label) <= maxWidth) {
    return result;
  }

  const ellipsisWidth = estimateTrendChartLabelWidth(ELLIPSIS);
  let width = 0;
  let cutIndex = 0;

  for (const char of label) {
    const charWidth = isWideChar(char) ? WIDE_CHAR_WIDTH : ASCII_CHAR_WIDTH;
    if (width + charWidth + ellipsisWidth > maxWidth) {
      break;
    }
    width += charWidth;
    cutIndex += char.length;
  }

  if (cutIndex <= 0) {
    result = ELLIPSIS;
    return result;
  }

  result = `${label.slice(0, cutIndex)}${ELLIPSIS}`;
  return result;
}

export function resolveTrendChartSlotWidth(labels: string[]): number {
  let result = MIN_SLOT_WIDTH;
  const labelCount = labels.length;

  if (labelCount === 0) {
    return result;
  }

  const fitWidth = DEFAULT_TARGET_WIDTH / labelCount;

  if (labelCount === 1) {
    result = Math.max(
      MIN_SLOT_WIDTH,
      estimateTrendChartLabelWidth(labels[0]) + LABEL_PAIR_PADDING,
      fitWidth,
    );
    return result;
  }

  for (let index = 0; index < labelCount - 1; index += 1) {
    const leftAnchor = index === 0 ? "start" : "middle";
    const rightAnchor = index + 1 === labelCount - 1 ? "end" : "middle";
    const leftWidth = estimateTrendChartLabelWidth(labels[index]);
    const rightWidth = estimateTrendChartLabelWidth(labels[index + 1]);

    let minSlotWidth = MIN_SLOT_WIDTH;
    if (leftAnchor === "start" && rightAnchor === "end") {
      minSlotWidth = leftWidth + rightWidth + LABEL_PAIR_PADDING;
    } else if (leftAnchor === "start") {
      minSlotWidth = leftWidth + rightWidth / 2 + LABEL_PAIR_PADDING;
    } else if (rightAnchor === "end") {
      minSlotWidth = leftWidth / 2 + rightWidth + LABEL_PAIR_PADDING;
    } else {
      minSlotWidth = leftWidth / 2 + rightWidth / 2 + LABEL_PAIR_PADDING;
    }

    result = Math.max(result, minSlotWidth);
  }

  result = Math.max(result, fitWidth);
  return result;
}
