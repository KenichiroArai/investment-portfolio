"use client";

import type { ClassificationSchemeWithValuesDto } from "@repo/shared";
import type { ClassificationGraphValue } from "@repo/shared";

import type { AllocationAggregationLevel } from "@/features/allocation/useAllocationHierarchyParam";
import { Button } from "@/components/ui/button";

type AllocationHierarchyControlsProps = {
  hasHierarchy: boolean;
  activeScheme: ClassificationSchemeWithValuesDto | null;
  parentValueId: string | null;
  aggregationLevel: AllocationAggregationLevel;
  includeOrphans: boolean;
  onParentChange: (valueId: string | null) => void;
  onAggregationLevelChange: (level: AllocationAggregationLevel) => void;
  onIncludeOrphansChange: (include: boolean) => void;
};

export function buildClassificationGraphValues(
  schemes: ClassificationSchemeWithValuesDto[],
): ClassificationGraphValue[] {
  let result: ClassificationGraphValue[] = [];

  for (const scheme of schemes) {
    for (const value of scheme.values) {
      result.push({
        id: value.id,
        code: value.code,
        name: value.name,
        sortOrder: value.sortOrder,
        schemeId: value.schemeId ?? scheme.id,
        schemeCode: scheme.code,
      });
    }
  }

  return result;
}

export function mergeClassificationLinks(
  schemes: ClassificationSchemeWithValuesDto[],
) {
  let result: NonNullable<ClassificationSchemeWithValuesDto["links"]> = [];
  const merged = new Map<string, NonNullable<ClassificationSchemeWithValuesDto["links"]>[number]>();

  for (const scheme of schemes) {
    for (const link of scheme.links ?? []) {
      merged.set(`${link.parentValueId}:${link.childValueId}`, link);
    }
  }

  result = [...merged.values()];
  return result;
}

export function AllocationHierarchyControls({
  hasHierarchy,
  activeScheme,
  parentValueId,
  aggregationLevel,
  includeOrphans,
  onParentChange,
  onAggregationLevelChange,
  onIncludeOrphansChange,
}: AllocationHierarchyControlsProps) {
  const parentValue =
    parentValueId !== null
      ? activeScheme?.values.find((value) => value.id === parentValueId) ?? null
      : null;

  let result = (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Button
        type="button"
        variant={aggregationLevel === "parent" ? "default" : "outline"}
        size="sm"
        disabled={!hasHierarchy}
        onClick={() => {
          onAggregationLevelChange("parent");
        }}
      >
        親単位
      </Button>
      <Button
        type="button"
        variant={aggregationLevel === "leaf" ? "default" : "outline"}
        size="sm"
        disabled={!hasHierarchy}
        onClick={() => {
          onAggregationLevelChange("leaf");
        }}
      >
        葉単位
      </Button>
      <Button
        type="button"
        variant={includeOrphans ? "default" : "outline"}
        size="sm"
        disabled={!hasHierarchy}
        onClick={() => {
          onIncludeOrphansChange(!includeOrphans);
        }}
      >
        親未所属を{includeOrphans ? "含める" : "除外"}
      </Button>
      {parentValue ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">ドリルダウン:</span>
          <span className="font-medium">{parentValue.name}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onParentChange(null);
            }}
          >
            ルートに戻る
          </Button>
        </div>
      ) : null}
    </div>
  );

  return result;
}
