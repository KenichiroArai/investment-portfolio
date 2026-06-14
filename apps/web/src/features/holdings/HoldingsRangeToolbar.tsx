"use client";

import type { AnalysisSchemeConfig } from "@repo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAsOfDateJa } from "@/lib/format-yen";

export const HOLDINGS_RANGE_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const HOLDINGS_RANGE_DEFAULT_PAGE_SIZE = 50;

type HoldingsRangeToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  asOfDateFilter: string;
  onAsOfDateFilterChange: (value: string) => void;
  availableDates: string[];
  classificationSchemes: AnalysisSchemeConfig[];
  classificationSchemeCode: string;
  classificationValue: string;
  onClassificationSchemeChange: (value: string) => void;
  onClassificationValueChange: (value: string) => void;
  classificationValues: string[];
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  totalPages: number;
  rangeLabel: string;
  portfolioCode?: string;
  analysisHref?: string;
};

export function HoldingsRangeToolbar({
  query,
  onQueryChange,
  asOfDateFilter,
  onAsOfDateFilterChange,
  availableDates,
  classificationSchemes,
  classificationSchemeCode,
  classificationValue,
  onClassificationSchemeChange,
  onClassificationValueChange,
  classificationValues,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalPages,
  rangeLabel,
  analysisHref,
}: HoldingsRangeToolbarProps) {
  const sortedDates = [...availableDates].sort((left, right) =>
    right.localeCompare(left),
  );

  let result = (
    <div className="space-y-3 border-b px-4 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="銘柄名で検索"
          className="w-full max-w-xs"
          aria-label="銘柄名で検索"
        />
        <Select value={asOfDateFilter} onValueChange={onAsOfDateFilterChange}>
          <SelectTrigger className="w-[10rem]" aria-label="基準日で絞り込み">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">すべての基準日</SelectItem>
            {sortedDates.map((date) => {
              let item = (
                <SelectItem key={date} value={date}>
                  {formatAsOfDateJa(date)}
                </SelectItem>
              );
              return item;
            })}
          </SelectContent>
        </Select>
        {classificationSchemes.length > 0 ? (
          <>
            <Select
              value={classificationSchemeCode}
              onValueChange={onClassificationSchemeChange}
            >
              <SelectTrigger className="w-[9rem]" aria-label="分類で絞り込み">
                <SelectValue placeholder="分類" />
              </SelectTrigger>
              <SelectContent>
                {classificationSchemes.map((scheme) => {
                  let item = (
                    <SelectItem key={scheme.schemeCode} value={scheme.schemeCode}>
                      {scheme.schemeName}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
            <Select
              value={classificationValue}
              onValueChange={onClassificationValueChange}
            >
              <SelectTrigger className="w-[9rem]" aria-label="分類値で絞り込み">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">すべて</SelectItem>
                {classificationValues.map((value) => {
                  let item = (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
          </>
        ) : null}
        {analysisHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={analysisHref}>資産配分で見る</Link>
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="w-[7rem]" aria-label="1ページあたりの件数">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLDINGS_RANGE_PAGE_SIZE_OPTIONS.map((size) => {
                let item = (
                  <SelectItem key={size} value={String(size)}>
                    {size} 件
                  </SelectItem>
                );
                return item;
              })}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="前のページ"
            disabled={page <= 1 || totalPages === 0}
            onClick={() => {
              onPageChange(page - 1);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-sm text-muted-foreground">
            {totalPages === 0 ? "0 / 0" : `${page} / ${totalPages}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="次のページ"
            disabled={page >= totalPages || totalPages === 0}
            onClick={() => {
              onPageChange(page + 1);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
  return result;
}
