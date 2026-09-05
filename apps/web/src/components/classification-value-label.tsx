"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ClassificationValueLabelProps = {
  name: string;
  description?: string | null;
  code?: string | null;
  href?: string | null;
  className?: string;
  nameClassName?: string;
  /** 名前を truncate してホバーで全文を出す（既定 true） */
  truncateName?: boolean;
  /** 説明があるとき左にヘルプアイコンを出す（既定 true） */
  showDescriptionIcon?: boolean;
};

function buildTooltipBody(name: string, description?: string | null): ReactNode {
  const trimmedDescription = description?.trim() ?? "";
  let result = (
    <div className="max-w-xs space-y-1">
      <p className="font-medium">{name}</p>
      {trimmedDescription !== "" ? (
        <p className="whitespace-pre-wrap text-primary-foreground/90">{trimmedDescription}</p>
      ) : null}
    </div>
  );
  return result;
}

export function ClassificationValueLabel({
  name,
  description,
  code,
  href,
  className,
  nameClassName,
  truncateName = true,
  showDescriptionIcon = true,
}: ClassificationValueLabelProps) {
  const trimmedDescription = description?.trim() ?? "";
  const hasDescription = trimmedDescription !== "";
  const tooltipBody = buildTooltipBody(name, description);

  const nameContent = (
    <>
      <span className="font-medium">{name}</span>
      {code ? (
        <span className="ml-2 font-mono text-xs text-muted-foreground">{code}</span>
      ) : null}
    </>
  );

  let result = (
    <TooltipProvider delayDuration={200}>
      <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", className)}>
        {showDescriptionIcon && hasDescription ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
                aria-label={`${name} の説明`}
              >
                <CircleHelp className="size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              {tooltipBody}
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            {href ? (
              <Link
                href={href}
                className={cn(
                  "min-w-0 text-primary hover:underline",
                  truncateName ? "truncate" : undefined,
                  nameClassName,
                )}
              >
                {nameContent}
              </Link>
            ) : (
              <span
                className={cn(
                  "min-w-0",
                  truncateName ? "truncate" : undefined,
                  nameClassName,
                )}
              >
                {nameContent}
              </span>
            )}
          </TooltipTrigger>
          <TooltipContent side="top" align="start">
            {tooltipBody}
          </TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  );

  return result;
}

export function buildClassificationDescriptionByCode(
  values: Array<{ code: string; description?: string | null }>,
): Map<string, string | null> {
  let result = new Map<string, string | null>();

  for (const value of values) {
    result.set(value.code, value.description ?? null);
  }

  return result;
}
