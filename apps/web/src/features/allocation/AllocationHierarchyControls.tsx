"use client";

import type { ClassificationSchemeWithValuesDto } from "@repo/shared";
import type { ClassificationGraphValue } from "@repo/shared";

import { Button } from "@/components/ui/button";

type AllocationHierarchyControlsProps = {
  activeScheme: ClassificationSchemeWithValuesDto | null;
  parentValueId: string | null;
  onParentChange: (valueId: string | null) => void;
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
        description: value.description ?? null,
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
  activeScheme,
  parentValueId,
  onParentChange,
}: AllocationHierarchyControlsProps) {
  const parentValue =
    parentValueId !== null
      ? activeScheme?.values.find((value) => value.id === parentValueId) ?? null
      : null;

  let result = (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
      {parentValue ? (
        <>
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
        </>
      ) : (
        <span className="text-muted-foreground">
          親分類ごとの構成比を表示しています。分類名の矢印から子分類にドリルダウンできます。
        </span>
      )}
    </div>
  );

  return result;
}
