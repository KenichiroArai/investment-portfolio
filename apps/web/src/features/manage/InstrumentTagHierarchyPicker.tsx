"use client";

import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
} from "@repo/shared";
import {
  buildClassificationGraph,
  getAncestorValueIds,
  getDescendantValueIds,
  getDirectChildIds,
  getRootValueIds,
  isLeafValue,
} from "@repo/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

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
import {
  buildClassificationBreadcrumb,
  resolveValuesByIds,
} from "@/features/manage/classification-picker-utils";
import { ClassificationValueLabel } from "@/components/classification-value-label";
import { useKeyedState } from "@/hooks/useKeyedState";
import { cn } from "@/lib/utils";

const EMPTY_PARENT_STACK: string[] = [];

type InstrumentTagHierarchyPickerProps = {
  schemes: ClassificationSchemeWithValuesDto[];
  selectedValueIds: string[];
  onSelectedValueIdsChange: (valueIds: string[]) => void;
  disabled?: boolean;
};

export function InstrumentTagHierarchyPicker({
  schemes,
  selectedValueIds,
  onSelectedValueIdsChange,
  disabled,
}: InstrumentTagHierarchyPickerProps) {
  const [schemeId, setSchemeId] = useState(() => schemes[0]?.id ?? "");

  const activeScheme = schemes.find((scheme) => scheme.id === schemeId) ?? schemes[0] ?? null;
  const resolvedSchemeId = activeScheme?.id ?? "";

  // 対象の分析軸が変わったら階層の位置を先頭に戻す。
  const [parentStack, setParentStack] = useKeyedState(
    resolvedSchemeId,
    EMPTY_PARENT_STACK,
  );

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

  const selectedIdSet = useMemo(() => {
    let result = new Set(selectedValueIds);
    return result;
  }, [selectedValueIds]);

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
    const leaf = isLeafValue(valueId, graph);

    if (leaf) {
      if (checked) {
        const ancestorIds = getAncestorValueIds(valueId, graph);
        // 共有葉でもドリルダウン中の親は資産クラス帰属のため残す
        const keepParentId =
          currentParentId && ancestorIds.has(currentParentId) ? currentParentId : null;
        const nextIds = selectedValueIds.filter((id) => {
          if (id === valueId) {
            return false;
          }
          if (keepParentId && id === keepParentId) {
            return true;
          }
          // 単親ツリーの祖先は葉へ寄せる。多親の共有葉ではドリル親以外の祖先を外す
          if (ancestorIds.has(id)) {
            return false;
          }
          return true;
        });
        if (keepParentId && !nextIds.includes(keepParentId)) {
          nextIds.push(keepParentId);
        }
        if (!nextIds.includes(valueId)) {
          nextIds.push(valueId);
        }
        onSelectedValueIdsChange(nextIds);
        return result;
      }

      onSelectedValueIdsChange(selectedValueIds.filter((id) => id !== valueId));
      return result;
    }

    const descendantIds = getDescendantValueIds(valueId, graph);

    if (checked) {
      // 親直付けは未細分化。配下の選択は外し、親IDだけ残す
      const nextIds = selectedValueIds.filter((id) => !descendantIds.has(id));
      nextIds.push(valueId);
      onSelectedValueIdsChange(nextIds);
      return result;
    }

    // 親解除: 親自身と配下の選択をまとめて除去
    onSelectedValueIdsChange(
      selectedValueIds.filter((id) => id !== valueId && !descendantIds.has(id)),
    );
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
          葉にタグ付けすると親は構成比で自動集計されます。親直付けは未細分化分です。この軸の選択中:{" "}
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
              const descendantIds = getDescendantValueIds(value.id, graph);
              const selectedSubtreeIds = [...descendantIds].filter(
                (subtreeId) =>
                  subtreeId !== value.id && selectedIdSet.has(subtreeId),
              );
              const selfSelected = selectedIdSet.has(value.id);
              const hasSubtreeSelection = selectedSubtreeIds.length > 0;
              // 葉選択は親含意。親直付けまたは配下選択があれば checked
              const checked = selfSelected || hasSubtreeSelection;
              const indeterminate = !selfSelected && hasSubtreeSelection;

              let row = (
                <div
                  key={value.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm",
                    disabled ? "opacity-60" : undefined,
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    aria-label={value.name}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = indeterminate;
                      }
                    }}
                    onChange={(event) => {
                      if (indeterminate) {
                        // 配下含意（indeterminate）からのクリックは解除として扱う
                        handleToggleValue(value.id, false);
                        return;
                      }
                      handleToggleValue(value.id, event.target.checked);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <ClassificationValueLabel
                      name={value.name}
                      description={value.description}
                      code={value.code}
                      nameClassName="max-w-[16rem]"
                    />
                    {!leaf && hasSubtreeSelection ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        配下選択 {selectedSubtreeIds.length} 件（親含意）
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
