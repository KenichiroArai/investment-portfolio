import type { AllocationSliceWithLines } from "@repo/shared";

import { getAllocationChartColor } from "@/features/analysis/chart-colors";

const CHART_SIZE = 192;
const CHART_CENTER = CHART_SIZE / 2;
const OUTER_RADIUS = CHART_SIZE / 2;
const INNER_RADIUS = OUTER_RADIUS * 0.56;

type AllocationChartProps = {
  slices: AllocationSliceWithLines[];
  highlightedValueCode: string | null;
  onSliceHover: (valueCode: string, clientX: number, clientY: number) => void;
  onSliceLeave: () => void;
};

type DonutSegment = {
  valueCode: string;
  path: string;
  color: string;
  startAngle: number;
  endAngle: number;
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): { x: number; y: number } {
  let result = { x: 0, y: 0 };
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  result = {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
  return result;
}

function describeDonutSegment(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  let result = "";

  if (endAngle - startAngle >= 360) {
    result = [
      `M ${centerX} ${centerY - outerRadius}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${centerX - 0.01} ${centerY - outerRadius}`,
      `L ${centerX - 0.01} ${centerY - innerRadius}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${centerX} ${centerY - innerRadius}`,
      "Z",
    ].join(" ");
    return result;
  }

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);

  result = [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
  return result;
}

function buildDonutSegments(slices: AllocationSliceWithLines[]): DonutSegment[] {
  let result: DonutSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index];
    if (!slice) {
      continue;
    }

    const degrees = slice.weight * 360;
    const startAngle = cursor;
    const endAngle = cursor + degrees;
    const color = getAllocationChartColor(index);

    let segment: DonutSegment = {
      valueCode: slice.valueCode,
      path: describeDonutSegment(
        CHART_CENTER,
        CHART_CENTER,
        OUTER_RADIUS,
        INNER_RADIUS,
        startAngle,
        endAngle,
      ),
      color,
      startAngle,
      endAngle,
    };
    result.push(segment);
    cursor = endAngle;
  }

  return result;
}

export function AllocationChart({
  slices,
  highlightedValueCode,
  onSliceHover,
  onSliceLeave,
}: AllocationChartProps) {
  const segments = buildDonutSegments(slices);

  let result = (
    <div className="allocation-chart">
      <svg
        className="allocation-chart__svg"
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        role="img"
        aria-label="資産配分の円グラフ"
      >
        {segments.length === 0 ? (
          <circle
            cx={CHART_CENTER}
            cy={CHART_CENTER}
            r={OUTER_RADIUS}
            className="allocation-chart__empty"
          />
        ) : (
          segments.map((segment) => {
            const isHighlighted =
              highlightedValueCode === null ||
              highlightedValueCode === segment.valueCode;
            let path = (
              <path
                key={segment.valueCode}
                d={segment.path}
                fill={segment.color}
                className={
                  isHighlighted
                    ? "allocation-chart__slice"
                    : "allocation-chart__slice allocation-chart__slice--dimmed"
                }
                onMouseEnter={(event) => {
                  onSliceHover(
                    segment.valueCode,
                    event.clientX,
                    event.clientY,
                  );
                }}
                onMouseMove={(event) => {
                  onSliceHover(
                    segment.valueCode,
                    event.clientX,
                    event.clientY,
                  );
                }}
                onMouseLeave={onSliceLeave}
              />
            );
            return path;
          })
        )}
      </svg>
      <ul className="allocation-chart__legend">
        {slices.map((slice, index) => {
          const isHighlighted =
            highlightedValueCode === null ||
            highlightedValueCode === slice.valueCode;
          let item = (
            <li
              key={slice.valueCode}
              className={
                isHighlighted
                  ? undefined
                  : "allocation-chart__legend-item--dimmed"
              }
              tabIndex={0}
              onMouseEnter={(event) => {
                onSliceHover(slice.valueCode, event.clientX, event.clientY);
              }}
              onMouseMove={(event) => {
                onSliceHover(slice.valueCode, event.clientX, event.clientY);
              }}
              onMouseLeave={onSliceLeave}
              onFocus={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onSliceHover(
                  slice.valueCode,
                  rect.left + rect.width / 2,
                  rect.top,
                );
              }}
              onBlur={onSliceLeave}
            >
              <span
                className="allocation-chart__swatch"
                style={{
                  backgroundColor: getAllocationChartColor(index),
                }}
              />
              <span>{slice.valueName}</span>
            </li>
          );
          return item;
        })}
      </ul>
    </div>
  );
  return result;
}
