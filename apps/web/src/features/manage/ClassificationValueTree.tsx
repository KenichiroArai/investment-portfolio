"use client";

import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
  CopyClassificationMode,
} from "@repo/shared";
import { buildClassificationGraph, getRootValueIds } from "@repo/shared";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { ClassificationValueLabel } from "@/components/classification-value-label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ClassificationValueUpdatePayload = {
  name: string;
  description: string | null;
  sortOrder: number;
};

type ClassificationLinkPair = {
  parentValueId: string;
  childValueId: string;
};

type ClassificationLinkDiff = {
  toAdd: ClassificationLinkPair[];
  toRemove: ClassificationLinkPair[];
};

type LinkEditMode = "children" | "parents";

type ClassificationValueTreeProps = {
  scheme: ClassificationSchemeWithValuesDto;
  allSchemes: ClassificationSchemeWithValuesDto[];
  disabled?: boolean;
  onUpdateValue: (valueId: string, payload: ClassificationValueUpdatePayload) => void;
  onDeleteValue: (valueId: string) => void;
  onCopyValue: (valueId: string, mode: CopyClassificationMode) => void;
  onApplyLinkChanges: (diff: ClassificationLinkDiff) => void;
};

type TreeNodeProps = {
  value: ClassificationValueDto;
  scheme: ClassificationSchemeWithValuesDto;
  allValues: ClassificationValueDto[];
  depth: number;
  expandedIds: Set<string>;
  disabled?: boolean;
  onToggleExpand: (valueId: string) => void;
  onUpdateValue: (valueId: string, payload: ClassificationValueUpdatePayload) => void;
  onDeleteValue: (valueId: string) => void;
  onCopyValue: (valueId: string, mode: CopyClassificationMode) => void;
};

function TreeNode({
  value,
  scheme,
  allValues,
  depth,
  expandedIds,
  disabled,
  onToggleExpand,
  onUpdateValue,
  onDeleteValue,
  onCopyValue,
}: TreeNodeProps) {
  const childIds = value.childIds ?? [];
  const hasChildren = childIds.length > 0;
  const isExpanded = expandedIds.has(value.id);
  const childValues = childIds
    .map((childId) => allValues.find((item) => item.id === childId))
    .filter((item): item is ClassificationValueDto => item !== undefined);
  const descriptionPreview = value.description?.trim() ?? "";

  let result = (
    <div className="space-y-1">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5",
          depth > 0 ? "ml-4 border-dashed" : "",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded hover:bg-muted"
            aria-expanded={isExpanded}
            onClick={() => {
              onToggleExpand(value.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        ) : (
          <span className="inline-block size-6" />
        )}
        <div className="min-w-0 flex-1 space-y-0.5 text-sm">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ClassificationValueLabel
              name={value.name}
              description={value.description}
              code={value.code}
              nameClassName="max-w-[14rem]"
            />
            {value.isLeaf === false ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">親</span>
            ) : null}
            {(value.parentIds?.length ?? 0) > 1 ? (
              <span className="text-xs text-muted-foreground">
                親 {value.parentIds?.length} 件
              </span>
            ) : null}
          </div>
          {descriptionPreview !== "" ? (
            <p className="truncate text-xs text-muted-foreground" title={descriptionPreview}>
              {descriptionPreview}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onCopyValue(value.id, "with_subtree");
          }}
        >
          <Copy className="size-3.5" aria-hidden />
          コピー
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const nextName = window.prompt("名称", value.name);
            if (nextName === null || nextName.trim() === "") {
              return;
            }
            onUpdateValue(value.id, {
              name: nextName.trim(),
              description: value.description ?? null,
              sortOrder: value.sortOrder,
            });
          }}
        >
          名称編集
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const nextDescription = window.prompt(
              "説明（空でクリア）",
              value.description ?? "",
            );
            if (nextDescription === null) {
              return;
            }
            onUpdateValue(value.id, {
              name: value.name,
              description: nextDescription.trim() === "" ? null : nextDescription.trim(),
              sortOrder: value.sortOrder,
            });
          }}
        >
          説明編集
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onDeleteValue(value.id);
          }}
        >
          削除
        </Button>
      </div>
      {hasChildren && isExpanded
        ? childValues.map((child) => {
            let node = (
              <TreeNode
                key={`${value.id}-${child.id}`}
                value={child}
                scheme={scheme}
                allValues={allValues}
                depth={depth + 1}
                expandedIds={expandedIds}
                disabled={disabled}
                onToggleExpand={onToggleExpand}
                onUpdateValue={onUpdateValue}
                onDeleteValue={onDeleteValue}
                onCopyValue={onCopyValue}
              />
            );
            return node;
          })
        : null}
    </div>
  );

  return result;
}

function getLinkedIdsForAnchor(
  anchor: ClassificationValueDto | undefined,
  linkMode: LinkEditMode,
): string[] {
  let result: string[] = [];

  if (!anchor) {
    return result;
  }

  if (linkMode === "children") {
    result = [...(anchor.childIds ?? [])];
    return result;
  }

  result = [...(anchor.parentIds ?? [])];
  return result;
}

function buildLinkDiff(
  anchorValueId: string,
  linkMode: LinkEditMode,
  baselineIds: string[],
  selectedIds: string[],
): ClassificationLinkDiff {
  let result: ClassificationLinkDiff = { toAdd: [], toRemove: [] };
  const baselineSet = new Set(baselineIds);
  const selectedSet = new Set(selectedIds);

  for (const valueId of selectedIds) {
    if (baselineSet.has(valueId)) {
      continue;
    }

    if (linkMode === "children") {
      result.toAdd.push({ parentValueId: anchorValueId, childValueId: valueId });
      continue;
    }

    result.toAdd.push({ parentValueId: valueId, childValueId: anchorValueId });
  }

  for (const valueId of baselineIds) {
    if (selectedSet.has(valueId)) {
      continue;
    }

    if (linkMode === "children") {
      result.toRemove.push({ parentValueId: anchorValueId, childValueId: valueId });
      continue;
    }

    result.toRemove.push({ parentValueId: valueId, childValueId: anchorValueId });
  }

  return result;
}

export function ClassificationValueTree({
  scheme,
  allSchemes,
  disabled,
  onUpdateValue,
  onDeleteValue,
  onCopyValue,
  onApplyLinkChanges,
}: ClassificationValueTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [anchorValueId, setAnchorValueId] = useState("");
  const [linkMode, setLinkMode] = useState<LinkEditMode>("children");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allValues = useMemo(() => {
    let result: ClassificationValueDto[] = [];
    for (const item of allSchemes) {
      for (const value of item.values) {
        result.push({
          ...value,
          schemeId: value.schemeId ?? item.id,
        });
      }
    }
    return result;
  }, [allSchemes]);

  const graphValues = useMemo(() => {
    let result = allValues.map((value) => ({
      id: value.id,
      code: value.code,
      name: value.name,
      description: value.description ?? null,
      sortOrder: value.sortOrder,
      schemeId: value.schemeId ?? scheme.id,
      schemeCode:
        allSchemes.find((item) => item.id === (value.schemeId ?? scheme.id))?.code ??
        scheme.code,
    }));
    return result;
  }, [allSchemes, allValues, scheme.code, scheme.id]);

  const links = useMemo(() => {
    let result: NonNullable<ClassificationSchemeWithValuesDto["links"]> = [];
    const merged = new Map<string, NonNullable<ClassificationSchemeWithValuesDto["links"]>[number]>();
    for (const item of allSchemes) {
      for (const link of item.links ?? []) {
        merged.set(`${link.parentValueId}:${link.childValueId}`, link);
      }
    }
    result = [...merged.values()];
    return result;
  }, [allSchemes]);

  const rootIds = useMemo(() => {
    const graph = buildClassificationGraph(graphValues, links);
    let result = getRootValueIds(scheme.id, graph);
    return result;
  }, [graphValues, links, scheme.id]);

  const rootValues = rootIds
    .map((valueId) => scheme.values.find((value) => value.id === valueId))
    .filter((value): value is ClassificationValueDto => value !== undefined);

  const anchorValue = allValues.find((value) => value.id === anchorValueId);
  const baselineIds = getLinkedIdsForAnchor(anchorValue, linkMode);
  const candidateValues = allValues.filter((value) => value.id !== anchorValueId);
  const linkDiff = buildLinkDiff(anchorValueId, linkMode, baselineIds, selectedIds);
  const hasLinkDiff = linkDiff.toAdd.length > 0 || linkDiff.toRemove.length > 0;
  const candidateLabel = linkMode === "children" ? "子分類値" : "親分類値";

  const onToggleExpand = (valueId: string) => {
    let result: void = undefined;
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(valueId)) {
        next.delete(valueId);
      } else {
        next.add(valueId);
      }
      return next;
    });
    return result;
  };

  function resetSelection(nextAnchorId: string, nextMode: LinkEditMode) {
    let result: void = undefined;
    const nextAnchor = allValues.find((value) => value.id === nextAnchorId);
    setSelectedIds(getLinkedIdsForAnchor(nextAnchor, nextMode));
    return result;
  }

  function handleAnchorChange(nextAnchorId: string) {
    let result: void = undefined;
    setAnchorValueId(nextAnchorId);
    resetSelection(nextAnchorId, linkMode);
    return result;
  }

  function handleLinkModeChange(nextMode: LinkEditMode) {
    let result: void = undefined;
    if (nextMode === linkMode) {
      return result;
    }
    setLinkMode(nextMode);
    resetSelection(anchorValueId, nextMode);
    return result;
  }

  function handleToggleCandidate(valueId: string, checked: boolean) {
    let result: void = undefined;
    setSelectedIds((current) => {
      if (checked) {
        if (current.includes(valueId)) {
          return current;
        }
        return [...current, valueId];
      }
      return current.filter((id) => id !== valueId);
    });
    return result;
  }

  function handleSelectAllCandidates() {
    let result: void = undefined;
    setSelectedIds(candidateValues.map((value) => value.id));
    return result;
  }

  function handleClearCandidateSelection() {
    let result: void = undefined;
    setSelectedIds([]);
    return result;
  }

  function handleApplyLinkChanges() {
    let result: void = undefined;
    if (!anchorValueId || !hasLinkDiff) {
      return result;
    }
    onApplyLinkChanges(linkDiff);
    return result;
  }

  function formatValueOptionLabel(value: ClassificationValueDto): string {
    let result = "";
    const ownerScheme =
      allSchemes.find((item) => item.id === value.schemeId)?.name ?? scheme.name;
    result = `${ownerScheme} / ${value.name}`;
    return result;
  }

  let result = (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">親子リンクを編集</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Select value={anchorValueId} onValueChange={handleAnchorChange}>
            <SelectTrigger>
              <SelectValue placeholder="分類値を選択" />
            </SelectTrigger>
            <SelectContent>
              {allValues.map((value) => {
                let item = (
                  <SelectItem key={`anchor-${value.id}`} value={value.id}>
                    {formatValueOptionLabel(value)}
                  </SelectItem>
                );
                return item;
              })}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={linkMode === "children" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => {
                handleLinkModeChange("children");
              }}
            >
              子を紐づける
            </Button>
            <Button
              type="button"
              size="sm"
              variant={linkMode === "parents" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => {
                handleLinkModeChange("parents");
              }}
            >
              親を紐づける
            </Button>
          </div>
        </div>

        {anchorValueId === "" ? (
          <p className="text-sm text-muted-foreground">
            分類値を選ぶと、紐づけ候補をまとめて選択できます。
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {candidateLabel}を選択（{selectedIds.length} / {candidateValues.length}）
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || candidateValues.length === 0}
                  onClick={handleSelectAllCandidates}
                >
                  すべて選択
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || selectedIds.length === 0}
                  onClick={handleClearCandidateSelection}
                >
                  選択解除
                </Button>
              </div>
            </div>

            <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
              {candidateValues.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">
                  紐づけ候補がありません。
                </p>
              ) : (
                candidateValues.map((value) => {
                  const checked = selectedIds.includes(value.id);
                  const isLinked = baselineIds.includes(value.id);
                  let row = (
                    <label
                      key={`candidate-${value.id}`}
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
                          handleToggleCandidate(value.id, event.target.checked);
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {formatValueOptionLabel(value)}
                      </span>
                      {isLinked ? (
                        <span className="shrink-0 text-xs text-muted-foreground">リンク済み</span>
                      ) : null}
                    </label>
                  );
                  return row;
                })
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={disabled || !hasLinkDiff}
                onClick={handleApplyLinkChanges}
              >
                変更を適用
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {rootValues.length === 0 ? (
          <p className="text-sm text-muted-foreground">ルート分類値がありません。</p>
        ) : (
          rootValues.map((value) => {
            let node = (
              <TreeNode
                key={value.id}
                value={value}
                scheme={scheme}
                allValues={allValues}
                depth={0}
                expandedIds={expandedIds}
                disabled={disabled}
                onToggleExpand={onToggleExpand}
                onUpdateValue={onUpdateValue}
                onDeleteValue={onDeleteValue}
                onCopyValue={onCopyValue}
              />
            );
            return node;
          })
        )}
      </div>
    </div>
  );

  return result;
}
