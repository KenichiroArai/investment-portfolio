"use client";

import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
  InstrumentListItemDto,
} from "@repo/shared";
import {
  buildClassificationGraph,
  getDirectChildIds,
  getRootValueIds,
  isLeafValue,
} from "@repo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { ClassificationValueLabel } from "@/components/classification-value-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildClassificationGraphValues,
  mergeClassificationLinks,
} from "@/features/allocation/AllocationHierarchyControls";
import {
  buildClassificationBreadcrumb,
  findValueAcrossSchemes,
  resolveValuesByIds,
} from "@/features/manage/classification-picker-utils";
import { cn } from "@/lib/utils";

type SchemeInstrumentTagPanelProps = {
  schemes: ClassificationSchemeWithValuesDto[];
  instruments: InstrumentListItemDto[];
  instrumentTagMap: Record<string, string[]>;
  disabled?: boolean;
  onAssign: (childValueId: string, instrumentIds: string[]) => void;
};

export function SchemeInstrumentTagPanel({
  schemes,
  instruments,
  instrumentTagMap,
  disabled,
  onAssign,
}: SchemeInstrumentTagPanelProps) {
  const [schemeId, setSchemeId] = useState(() => schemes[0]?.id ?? "");
  const [parentStack, setParentStack] = useState<string[]>([]);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [childValueId, setChildValueId] = useState("");

  const activeScheme = schemes.find((scheme) => scheme.id === schemeId) ?? schemes[0] ?? null;
  const resolvedSchemeId = activeScheme?.id ?? "";

  const graph = useMemo(() => {
    let result = buildClassificationGraph(
      buildClassificationGraphValues(schemes),
      mergeClassificationLinks(schemes),
    );
    return result;
  }, [schemes]);

  const currentParentId =
    parentStack.length > 0 ? (parentStack[parentStack.length - 1] ?? null) : null;

  const currentValueIds = useMemo(() => {
    let result: string[] = [];

    if (!resolvedSchemeId) {
      return result;
    }

    if (currentParentId) {
      result = getDirectChildIds(currentParentId, graph);
      return result;
    }

    result = getRootValueIds(resolvedSchemeId, graph);
    return result;
  }, [currentParentId, graph, resolvedSchemeId]);

  const currentValues = useMemo(() => {
    let result: ClassificationValueDto[] = resolveValuesByIds(schemes, currentValueIds);
    return result;
  }, [currentValueIds, schemes]);

  const breadcrumb = useMemo(() => {
    let result = buildClassificationBreadcrumb(
      schemes,
      parentStack,
      activeScheme?.name ?? "分析軸",
    );
    return result;
  }, [activeScheme?.name, parentStack, schemes]);

  const targetParentValue = useMemo(() => {
    let result: ClassificationValueDto | null = null;

    if (!targetParentId) {
      return result;
    }

    result = findValueAcrossSchemes(schemes, targetParentId);
    return result;
  }, [schemes, targetParentId]);

  const childValues = useMemo(() => {
    let result: ClassificationValueDto[] = [];

    if (!targetParentId) {
      return result;
    }

    result = resolveValuesByIds(schemes, getDirectChildIds(targetParentId, graph));
    return result;
  }, [graph, schemes, targetParentId]);

  const taggedInstruments = useMemo(() => {
    let result: InstrumentListItemDto[] = [];

    if (!targetParentId) {
      return result;
    }

    const query = instrumentQuery.trim().toLowerCase();
    for (const instrument of instruments) {
      const valueIds = instrumentTagMap[instrument.id] ?? [];
      if (!valueIds.includes(targetParentId)) {
        continue;
      }
      if (query !== "" && !instrument.name.toLowerCase().includes(query)) {
        continue;
      }
      result.push(instrument);
    }

    return result;
  }, [instrumentQuery, instrumentTagMap, instruments, targetParentId]);

  const selectedCount = useMemo(() => {
    let result = 0;
    const visibleIds = new Set(taggedInstruments.map((instrument) => instrument.id));
    for (const instrumentId of selectedInstrumentIds) {
      if (visibleIds.has(instrumentId)) {
        result += 1;
      }
    }
    return result;
  }, [selectedInstrumentIds, taggedInstruments]);

  function handleSchemeChange(nextSchemeId: string) {
    let result: void = undefined;
    setSchemeId(nextSchemeId);
    setParentStack([]);
    setTargetParentId(null);
    setSelectedInstrumentIds([]);
    setChildValueId("");
    return result;
  }

  function handleDrillDown(valueId: string) {
    let result: void = undefined;
    setParentStack((current) => [...current, valueId]);
    return result;
  }

  function handleBreadcrumbNavigate(index: number) {
    let result: void = undefined;

    if (index <= 0) {
      setParentStack([]);
      return result;
    }

    setParentStack((current) => current.slice(0, index));
    return result;
  }

  function handleSelectParent(valueId: string) {
    let result: void = undefined;
    setTargetParentId(valueId);
    setSelectedInstrumentIds([]);
    setChildValueId("");
    setInstrumentQuery("");
    return result;
  }

  function handleToggleInstrument(instrumentId: string, checked: boolean) {
    let result: void = undefined;

    if (checked) {
      setSelectedInstrumentIds((current) => {
        if (current.includes(instrumentId)) {
          return current;
        }
        return [...current, instrumentId];
      });
      return result;
    }

    setSelectedInstrumentIds((current) => current.filter((id) => id !== instrumentId));
    return result;
  }

  function handleSelectAll() {
    let result: void = undefined;
    setSelectedInstrumentIds(taggedInstruments.map((instrument) => instrument.id));
    return result;
  }

  function handleClearSelection() {
    let result: void = undefined;
    setSelectedInstrumentIds([]);
    return result;
  }

  function handleAssign() {
    let result: void = undefined;

    if (!childValueId || selectedCount === 0) {
      return result;
    }

    const visibleIds = new Set(taggedInstruments.map((instrument) => instrument.id));
    const targetIds = selectedInstrumentIds.filter((id) => visibleIds.has(id));
    onAssign(childValueId, targetIds);
    setSelectedInstrumentIds([]);
    return result;
  }

  function renderChildTagLabels(instrumentId: string) {
    let result = "";

    const valueIds = instrumentTagMap[instrumentId] ?? [];
    const names: string[] = [];
    for (const child of childValues) {
      if (!valueIds.includes(child.id)) {
        continue;
      }
      names.push(child.name);
    }
    result = names.join(" / ");

    return result;
  }

  if (!activeScheme) {
    let emptyResult = <p className="text-sm text-muted-foreground">分析軸が未登録です。</p>;
    return emptyResult;
  }

  let result = (
    <div className="space-y-4">
      <div className="grid gap-3">
        <p className="text-sm font-medium">分析軸</p>
        <Select
          value={resolvedSchemeId}
          onValueChange={handleSchemeChange}
          disabled={disabled || schemes.length === 0}
        >
          <SelectTrigger aria-label="分析軸を選択">
            <SelectValue placeholder="分析軸を選択" />
          </SelectTrigger>
          <SelectContent>
            {schemes.map((scheme) => {
              let item = (
                <SelectItem key={scheme.id} value={scheme.id}>
                  {scheme.name}
                </SelectItem>
              );
              return item;
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          親カテゴリ値を選ぶと、その値が付いた銘柄だけを一覧化します。銘柄を選んで子カテゴリ値を付与すると、親タグは残したまま子タグが追加されます。
        </p>
      </div>

      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          {parentStack.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                handleBreadcrumbNavigate(parentStack.length - 1);
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
              戻る
            </Button>
          ) : null}
          <nav aria-label="分類階層" className="flex flex-wrap items-center gap-1 text-sm">
            {breadcrumb.map((crumb, index) => {
              const isLast = index === breadcrumb.length - 1;
              let crumbNode = (
                <span
                  key={`${crumb.id ?? "root"}-${index}`}
                  className="inline-flex items-center gap-1"
                >
                  {index > 0 ? (
                    <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                  ) : null}
                  {isLast ? (
                    <span className="font-medium">{crumb.label}</span>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                      disabled={disabled}
                      onClick={() => {
                        handleBreadcrumbNavigate(index);
                      }}
                    >
                      {crumb.label}
                    </button>
                  )}
                </span>
              );
              return crumbNode;
            })}
          </nav>
        </div>

        <div className="divide-y">
          {currentValues.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              この階層に分類値がありません。
            </p>
          ) : (
            currentValues.map((value) => {
              const leaf = isLeafValue(value.id, graph);
              const isTarget = targetParentId === value.id;

              let row = (
                <div
                  key={value.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    isTarget ? "bg-muted/60" : undefined,
                    disabled ? "opacity-60" : undefined,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <ClassificationValueLabel
                      name={value.name}
                      description={value.description}
                      code={value.code}
                      nameClassName="max-w-[16rem]"
                    />
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-xs",
                      leaf ? "bg-muted text-muted-foreground" : "bg-muted",
                    )}
                  >
                    {leaf ? "葉" : "親"}
                  </span>
                  {!leaf ? (
                    <Button
                      type="button"
                      variant={isTarget ? "secondary" : "outline"}
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        handleSelectParent(value.id);
                      }}
                    >
                      銘柄を表示
                    </Button>
                  ) : (
                    <span className="inline-block" />
                  )}
                  {!leaf ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled}
                      aria-label={`${value.name} の子分類へ`}
                      onClick={() => {
                        handleDrillDown(value.id);
                      }}
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </Button>
                  ) : (
                    <span className="inline-block size-9" />
                  )}
                </div>
              );
              return row;
            })
          )}
        </div>
      </div>

      {targetParentValue ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              「{targetParentValue.name}」が付いている銘柄（{taggedInstruments.length} 件）
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || taggedInstruments.length === 0}
                onClick={handleSelectAll}
              >
                すべて選択
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || selectedCount === 0}
                onClick={handleClearSelection}
              >
                選択解除
              </Button>
            </div>
          </div>

          <Input
            value={instrumentQuery}
            placeholder="銘柄名で絞り込み"
            disabled={disabled}
            onChange={(event) => {
              setInstrumentQuery(event.target.value);
            }}
          />

          <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
            {taggedInstruments.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                この親カテゴリ値が付いた銘柄はありません。
              </p>
            ) : (
              taggedInstruments.map((instrument) => {
                const checked = selectedInstrumentIds.includes(instrument.id);
                const childLabels = renderChildTagLabels(instrument.id);

                let row = (
                  <label
                    key={instrument.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm",
                      disabled ? "opacity-60" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => {
                        handleToggleInstrument(instrument.id, event.target.checked);
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{instrument.name}</span>
                    {childLabels !== "" ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        指定済み: {childLabels}
                      </span>
                    ) : null}
                  </label>
                );
                return row;
              })
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Select
              value={childValueId}
              onValueChange={setChildValueId}
              disabled={disabled || childValues.length === 0}
            >
              <SelectTrigger aria-label="付与する子カテゴリ値">
                <SelectValue placeholder="付与する子カテゴリ値を選択" />
              </SelectTrigger>
              <SelectContent>
                {childValues.map((child) => {
                  let item = (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  );
                  return item;
                })}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={disabled || !childValueId || selectedCount === 0}
              onClick={handleAssign}
            >
              選択した {selectedCount} 銘柄に付与
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          親カテゴリ値の「銘柄を表示」を押すと、その値が付いた銘柄を一覧化します。
        </p>
      )}
    </div>
  );

  return result;
}
