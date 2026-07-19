import type { ReactNode } from "react";

type TrendChartHeaderProps = {
  title: string;
  titleLevel?: "h2" | "h3";
  caption?: string;
  actions?: ReactNode;
};

export function TrendChartHeader({
  title,
  titleLevel = "h2",
  caption,
  actions,
}: TrendChartHeaderProps) {
  let result: ReactNode = null;
  const titleClassName =
    titleLevel === "h2" ? "trend-chart__title" : "trend-chart__title trend-chart__title--sub";

  result = (
    <div className="trend-chart__header">
      <div className="trend-chart__header-main">
        {titleLevel === "h2" ? (
          <h2 className={titleClassName}>{title}</h2>
        ) : (
          <h3 className={titleClassName}>{title}</h3>
        )}
        {caption ? <span className="trend-chart__caption">{caption}</span> : null}
      </div>
      {actions ? <div className="trend-chart__header-actions">{actions}</div> : null}
    </div>
  );
  return result;
}
