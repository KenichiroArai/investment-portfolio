"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabSummarySegment = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  valueSize?: "primary" | "default" | "compact";
};

type TabSummaryBarProps = {
  segments: TabSummarySegment[];
  note?: ReactNode;
  className?: string;
  title?: string;
};

function resolveValueSizeClassName(
  valueSize: TabSummarySegment["valueSize"],
  isFirstSegment: boolean,
): string {
  let result = "tab-summary-bar__value";

  if (valueSize === "primary" || (valueSize === undefined && isFirstSegment)) {
    result = `${result} tab-summary-bar__value--primary`;
    return result;
  }

  if (valueSize === "compact") {
    result = `${result} tab-summary-bar__value--compact`;
    return result;
  }

  return result;
}

export function TabSummaryBar({
  segments,
  note = null,
  className,
  title = "概要",
}: TabSummaryBarProps) {
  let result: ReactNode = null;

  if (segments.length === 0) {
    return result;
  }

  result = (
    <section className={cn("tab-summary-bar-container", className)} aria-label={title}>
      {title ? <h3 className="tab-summary-bar__heading">{title}</h3> : null}
      <div className="tab-summary-bar">
        {segments.map((segment, index) => {
          let segmentNode = (
            <div key={segment.label} className="tab-summary-bar__segment">
              <span className="tab-summary-bar__label">{segment.label}</span>
              <span
                className={cn(
                  resolveValueSizeClassName(segment.valueSize, index === 0),
                  segment.valueClassName,
                )}
              >
                {segment.value}
              </span>
            </div>
          );
          return segmentNode;
        })}
      </div>
      {note ? <p className="tab-summary-bar__note">{note}</p> : null}
    </section>
  );
  return result;
}
