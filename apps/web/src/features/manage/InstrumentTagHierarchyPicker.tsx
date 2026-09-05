"use client";

import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
} from "@repo/shared";
import {
  buildClassificationGraph,
  getDescendantValueIds,
  getDirectChildIds,
  getRootValueIds,
  isLeafValue,
} from "@repo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type InstrumentTagHierarchyPickerProps = {
  schemes: ClassificationSchemeWithValuesDto[];
  selectedValueIds: string[];
  onSelectedValueIdsChange: (valueIds: string[]) => void;
  disabled?: boolean;
};

function findValueAcrossSchemes(
  schemes: ClassificationSchemeWithValuesDto[],
  valueId: string,
): ClassificationValueDto | null {
  let result: ClassificationValueDto | null = null;

  for (const scheme of schemes) {
    const found = scheme.values.find((value) => value.id === valueId);
    if (!found) {
      continue;
    }
    result = {
      ...found,
      schemeId: found.schemeId ?? scheme.id,
    };
    break;
  }

  return result;
}

export function InstrumentTagHierarchyPicker({
  schemes,
  selectedValueIds,
  onSelectedValueIdsChange,
  disabled,
}: InstrumentTagHierarchyPickerProps) {
  const [schemeId, setSchemeId] = useState(() => schemes[0]?.id ?? "");
  const [parentStack, setParentStack] = useState<string[]>([]);

  const activeScheme = schemes.find((scheme) => scheme.id === schemeId) ?? schemes[0] ?? null;
  const resolvedSchemeId = activeScheme?.id ?? "";

  useEffect(() => {
    let result: void = undefined;

    if (!resolvedSchemeId) {
      return result;
    }

    if (schemeId === resolvedSchemeId) {
      return result;
    }

    setSchemeId(resolvedSchemeId);
    setParentStack([]);
    return result;
  }, [resolvedSchemeId, schemeId]);

  const graph = useMemo(() => {
    let result = buildClassificationGraph(
      buildClassificationGraphValues(schemes),
      mergeClassificationLinks(schemes),
    );
    return result;
  }, [schemes]);

  const currentParentId = parentStack.length > 0 ? (parentStack[parentStack.length - 1] ?? null) : null;

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
    let result: ClassificationValueDto[] = [];

    for (const valueId of currentValueIds) {
      const value = findValueAcrossSchemes(schemes, valueId);
      if (!value) {
        continue;
      }
      result.push(value);
    }

    return result;
  }, [currentValueIds, schemes]);

  const breadcrumb = useMemo(() => {
    let result: Array<{ id: string | null; label: string }> = [
      { id: null, label: activeScheme?.name ?? "分析軸" },
    ];

    for (const valueId of parentStack) {
      const value = findValueAcrossSchemes(schemes, valueId);
      if (!value) {
        continue;
      }
      result.push({ id: valueId, label: value.name });
    }

    return result;
  }, [activeScheme?.name, parentStack, schemes]);

  const selectedInSchemeCount = useMemo(() => {
    let result = 0;
    if (!activeScheme) {
      return result;
    }

    const schemeValueIds = new Set(activeScheme.values.map((value) => value.id));
    for (const valueId of selectedValueIds) {
      if (schemeValueIds.has(valueId)) {
        result += 1;
      }
    }

    return result;
  }, [activeScheme, selectedValueIds]);

  function handleSchemeChange(nextSchemeId: string) {
    let result: void = undefined;
    setSchemeId(nextSchemeId);
    setParentStack([]);
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

  function handleToggleValue(valueId: string, checked: boolean) {
    let result: void = undefined;

    if (checked) {
      if (selectedValueIds.includes(valueId)) {
        return result;
      }
      onSelectedValueIdsChange([...selectedValueIds, valueId]);
      return result;
    }

    onSelectedValueIdsChange(selectedValueIds.filter((id) => id !== valueId));
    return result;
  }

  if (!activeScheme) {
    let emptyResult = (
      <p className="text-sm text-muted-foreground">分析軸が未登録です。</p>
    );
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
          分析軸 → カテゴリ値（親）→ カテゴリ値（子）の順に辿り、親・葉どちらもタグ付けできます。この軸の選択中:{" "}
          {selectedInSchemeCount} 件
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
                <span key={`${crumb.id ?? "root"}-${index}`} className="inline-flex items-center gap-1">
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
              const selectedSubtreeCount = [...getDescendantValueIds(value.id, graph)].filter(
                (subtreeId) => selectedValueIds.includes(subtreeId),
              ).length;
              const checked = selectedValueIds.includes(value.id);

              let row = (
                <div
                  key={value.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    disabled ? "opacity-60" : undefined,
                  )}
                >
                  <label
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3",
                      disabled ? "pointer-events-none" : "cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(event) => {
                        handleToggleValue(value.id, event.target.checked);
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{value.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {value.code}
                      </span>
                      {!leaf && selectedSubtreeCount > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          配下選択 {selectedSubtreeCount} 件
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        leaf ? "bg-muted text-muted-foreground" : "bg-muted",
                      )}
                    >
                      {leaf ? "葉" : "親"}
                    </span>
                  </label>
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
    </div>
  );

  return result;
}
