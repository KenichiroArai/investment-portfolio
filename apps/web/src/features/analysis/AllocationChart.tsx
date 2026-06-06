import type { AllocationSlice } from "@repo/shared";

import { formatPercent } from "@/lib/format-yen";

const CHART_COLORS = [
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

type AllocationChartProps = {
  slices: AllocationSlice[];
};

function buildConicGradient(slices: AllocationSlice[]): string {
  let result = "conic-gradient(#e5e5e5 0deg 360deg)";
  let cursor = 0;

  if (slices.length === 0) {
    return result;
  }

  const segments: string[] = [];
  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index];
    if (!slice) {
      continue;
    }
    const degrees = slice.weight * 360;
    const start = cursor;
    const end = cursor + degrees;
    const color = CHART_COLORS[index % CHART_COLORS.length] ?? "#2563eb";
    segments.push(`${color} ${start}deg ${end}deg`);
    cursor = end;
  }

  result = `conic-gradient(${segments.join(", ")})`;
  return result;
}

export function AllocationChart({ slices }: AllocationChartProps) {
  const gradient = buildConicGradient(slices);

  let result = (
    <div className="allocation-chart">
      <div
        className="allocation-chart__donut"
        style={{ background: gradient }}
        role="img"
        aria-label="資産配分の円グラフ"
      />
      <ul className="allocation-chart__legend">
        {slices.map((slice, index) => {
          let item = (
            <li key={slice.valueCode}>
              <span
                className="allocation-chart__swatch"
                style={{
                  backgroundColor:
                    CHART_COLORS[index % CHART_COLORS.length] ?? "#2563eb",
                }}
              />
              <span>
                {slice.valueName}（{formatPercent(slice.weight)}）
              </span>
            </li>
          );
          return item;
        })}
      </ul>
    </div>
  );
  return result;
}
