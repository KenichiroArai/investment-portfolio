export const ALLOCATION_CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#db2777",
  "#4b5563",
  "#0d9488",
];

export function getAllocationChartColor(index: number): string {
  let result = ALLOCATION_CHART_COLORS[index % ALLOCATION_CHART_COLORS.length] ?? "#2563eb";
  return result;
}
