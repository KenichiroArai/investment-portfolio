"use client";

import type {
  ClassificationSchemeWithValuesDto,
  ClassificationValueDto,
  CopyClassificationMode,
} from "@repo/shared";
import { buildClassificationGraph, getRootValueIds } from "@repo/shared";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ClassificationValueTreeProps = {
  scheme: ClassificationSchemeWithValuesDto;
  allSchemes: ClassificationSchemeWithValuesDto[];
  disabled?: boolean;
  onUpdateValue: (valueId: string, name: string, sortOrder: number) => void;
  onDeleteValue: (valueId: string) => void;
  onCopyValue: (valueId: string, mode: CopyClassificationMode) => void;
  onAddLink: (parentValueId: string, childValueId: string) => void;
};

type TreeNodeProps = {
  value: ClassificationValueDto;
  scheme: ClassificationSchemeWithValuesDto;
  allValues: ClassificationValueDto[];
  depth: number;
  expandedIds: Set<string>;
  disabled?: boolean;
  onToggleExpand: (valueId: string) => void;
  onUpdateValue: (valueId: string, name: string, sortOrder: number) => void;
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
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-medium">{value.name}</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">{value.code}</span>
          {value.isLeaf === false ? (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">親</span>
          ) : null}
          {(value.parentIds?.length ?? 0) > 1 ? (
            <span className="ml-2 text-xs text-muted-foreground">
              親 {value.parentIds?.length} 件
            </span>
          ) : null}
        </span>
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
            onUpdateValue(value.id, nextName.trim(), value.sortOrder);
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

export function ClassificationValueTree({
  scheme,
  allSchemes,
  disabled,
  onUpdateValue,
  onDeleteValue,
  onCopyValue,
  onAddLink,
}: ClassificationValueTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [linkParentId, setLinkParentId] = useState("");
  const [linkChildId, setLinkChildId] = useState("");

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

  const onToggleExpand = (valueId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(valueId)) {
        next.delete(valueId);
      } else {
        next.add(valueId);
      }
      return next;
    });
  };

  let result = (
    <div className="space-y-4">
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">親子リンクを追加</p>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Select value={linkParentId} onValueChange={setLinkParentId}>
            <SelectTrigger>
              <SelectValue placeholder="親分類値" />
            </SelectTrigger>
            <SelectContent>
              {allValues.map((value) => {
                const ownerScheme =
                  allSchemes.find((item) => item.id === value.schemeId)?.name ?? scheme.name;
                let item = (
                  <SelectItem key={`parent-${value.id}`} value={value.id}>
                    {ownerScheme} / {value.name}
                  </SelectItem>
                );
                return item;
              })}
            </SelectContent>
          </Select>
          <Select value={linkChildId} onValueChange={setLinkChildId}>
            <SelectTrigger>
              <SelectValue placeholder="子分類値" />
            </SelectTrigger>
            <SelectContent>
              {allValues.map((value) => {
                const ownerScheme =
                  allSchemes.find((item) => item.id === value.schemeId)?.name ?? scheme.name;
                let item = (
                  <SelectItem key={`child-${value.id}`} value={value.id}>
                    {ownerScheme} / {value.name}
                  </SelectItem>
                );
                return item;
              })}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={disabled || !linkParentId || !linkChildId}
            onClick={() => {
              onAddLink(linkParentId, linkChildId);
              setLinkParentId("");
              setLinkChildId("");
            }}
          >
            リンク追加
          </Button>
        </div>
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
