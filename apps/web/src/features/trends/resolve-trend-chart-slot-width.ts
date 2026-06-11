const MIN_SLOT_WIDTH = 56;
const DEFAULT_TARGET_WIDTH = 640;
const LABEL_CHAR_WIDTH = 6.5;
const LABEL_PAIR_PADDING = 8;

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

function estimateTrendChartLabelWidth(label: string): number {
  let result = label.length * LABEL_CHAR_WIDTH;
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
