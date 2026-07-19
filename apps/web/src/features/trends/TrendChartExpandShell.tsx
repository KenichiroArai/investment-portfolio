"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXPANDED_TREND_CHART_NOTE } from "@/features/trends/trend-chart-layout";

type TrendChartExpandButtonProps = {
  onClick: () => void;
  ariaLabel?: string;
};

export function TrendChartExpandButton({
  onClick,
  ariaLabel = "チャートを拡大表示",
}: TrendChartExpandButtonProps) {
  let result: ReactNode = (
    <button
      type="button"
      className="trend-chart__expand-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      拡大
    </button>
  );
  return result;
}

type TrendChartExpandMeasureProps = {
  children: (plotWidth: number) => ReactNode;
};

function TrendChartExpandMeasure({ children }: TrendChartExpandMeasureProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [plotWidth, setPlotWidth] = useState(640);

  useEffect(() => {
    let result: () => void = () => {};
    const element = containerRef.current;
    if (!element) {
      return result;
    }

    const updateWidth = () => {
      let result: void = undefined;
      const nextWidth = element.clientWidth;
      if (nextWidth > 0) {
        setPlotWidth(nextWidth);
      }
      return result;
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return result;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    result = () => {
      observer.disconnect();
    };
    return result;
  }, []);

  let result: ReactNode = (
    <div ref={containerRef} className="trend-chart-expand-dialog__body">
      {children(plotWidth)}
    </div>
  );
  return result;
}

type TrendChartExpandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: (plotWidth: number) => ReactNode;
};

export function TrendChartExpandDialog({
  open,
  onOpenChange,
  title,
  description = EXPANDED_TREND_CHART_NOTE,
  children,
}: TrendChartExpandDialogProps) {
  let result: ReactNode = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="trend-chart-expand-dialog max-w-[min(96vw,80rem)] w-[min(96vw,80rem)]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="trend-chart-expand-dialog__note">
            {description}
          </DialogDescription>
        </DialogHeader>
        {open ? <TrendChartExpandMeasure>{children}</TrendChartExpandMeasure> : null}
      </DialogContent>
    </Dialog>
  );
  return result;
}
