const MIN_SLOT_WIDTH = 56;
const FIT_MIN_SLOT_WIDTH = 2;
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

export function resolveTrendChartSlotWidth(
  labels: string[],
  targetPlotWidth: number = DEFAULT_TARGET_WIDTH,
): number {
  let result = MIN_SLOT_WIDTH;
  const labelCount = labels.length;

  if (labelCount === 0) {
    return result;
  }

  const fitWidth = targetPlotWidth / labelCount;

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

/** 拡大表示用: 全バケットを指定幅に収める（MIN_SLOT 未満も許容） */
export function resolveTrendChartFitSlotWidth(
  labelCount: number,
  plotWidth: number,
): number {
  let result = FIT_MIN_SLOT_WIDTH;

  if (labelCount <= 0 || !Number.isFinite(plotWidth) || plotWidth <= 0) {
    return result;
  }

  result = Math.max(FIT_MIN_SLOT_WIDTH, plotWidth / labelCount);
  return result;
}

function resolveLabelCenterX(index: number, slotWidth: number): number {
  let result = slotWidth / 2;
  result = index * slotWidth + slotWidth / 2;
  return result;
}

function resolveLabelLeftEdge(
  label: string,
  index: number,
  slotWidth: number,
  total: number,
): number {
  let result = 0;
  const width = estimateTrendChartLabelWidth(label);
  const centerX = resolveLabelCenterX(index, slotWidth);
  const anchor = resolveXLabelAnchor(index, total);

  if (anchor === "start") {
    result = centerX;
    return result;
  }

  if (anchor === "end") {
    result = centerX - width;
    return result;
  }

  result = centerX - width / 2;
  return result;
}

function resolveLabelRightEdge(
  label: string,
  index: number,
  slotWidth: number,
  total: number,
): number {
  let result = 0;
  const width = estimateTrendChartLabelWidth(label);
  const centerX = resolveLabelCenterX(index, slotWidth);
  const anchor = resolveXLabelAnchor(index, total);

  if (anchor === "start") {
    result = centerX + width;
    return result;
  }

  if (anchor === "end") {
    result = centerX;
    return result;
  }

  result = centerX + width / 2;
  return result;
}

/** 拡大表示用: 重ならない X 軸ラベルのインデックス（先頭・末尾は常に含む） */
export function resolveVisibleTrendXLabelIndexes(
  labels: string[],
  slotWidth: number,
): number[] {
  let result: number[] = [];
  const labelCount = labels.length;

  if (labelCount === 0) {
    return result;
  }

  if (labelCount === 1) {
    result = [0];
    return result;
  }

  const lastIndex = labelCount - 1;
  result = [0];
  let lastRightEdge = resolveLabelRightEdge(labels[0], 0, slotWidth, labelCount);

  for (let index = 1; index < lastIndex; index += 1) {
    const leftEdge = resolveLabelLeftEdge(labels[index], index, slotWidth, labelCount);
    if (leftEdge < lastRightEdge + LABEL_PAIR_PADDING) {
      continue;
    }

    result.push(index);
    lastRightEdge = resolveLabelRightEdge(labels[index], index, slotWidth, labelCount);
  }

  const lastLeftEdge = resolveLabelLeftEdge(
    labels[lastIndex],
    lastIndex,
    slotWidth,
    labelCount,
  );

  while (result.length > 1) {
    const previousIndex = result[result.length - 1];
    const previousRightEdge = resolveLabelRightEdge(
      labels[previousIndex],
      previousIndex,
      slotWidth,
      labelCount,
    );
    if (lastLeftEdge >= previousRightEdge + LABEL_PAIR_PADDING) {
      break;
    }
    result.pop();
  }

  result.push(lastIndex);
  return result;
}
