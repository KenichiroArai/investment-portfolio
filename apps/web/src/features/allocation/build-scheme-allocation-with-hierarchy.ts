import type {
  AllocationSliceWithLines,
  ClassificationSchemeWithValuesDto,
  HoldingLineDto,
} from "@repo/shared";
import {
  buildHierarchicalAllocationBySchemeWithLines,
  buildAllocationBySchemeWithLines,
  type AllocationBySchemeWithLines,
  type HierarchyAllocationOptions,
} from "@repo/shared";

import {
  buildClassificationGraphValues,
  mergeClassificationLinks,
} from "@/features/allocation/AllocationHierarchyControls";

type BuildSchemeAllocationInput = {
  lines: HoldingLineDto[];
  schemeCode: string;
  schemeName: string;
  classificationSchemes: ClassificationSchemeWithValuesDto[];
  parentValueId: string | null;
};

type BuildChildAllocationSlicesInput = {
  lines: HoldingLineDto[];
  schemeCode: string;
  schemeName: string;
  classificationSchemes: ClassificationSchemeWithValuesDto[];
  rootTotalMarketValueMinor: number;
};

function rescaleSliceWeightsToRootTotal(
  slices: AllocationSliceWithLines[],
  rootTotalMarketValueMinor: number,
): AllocationSliceWithLines[] {
  let result: AllocationSliceWithLines[] = [];

  for (const slice of slices) {
    result.push({
      ...slice,
      weight:
        rootTotalMarketValueMinor > 0
          ? slice.marketValueMinor / rootTotalMarketValueMinor
          : 0,
    });
  }

  return result;
}

export function buildSchemeAllocationWithHierarchy(
  input: BuildSchemeAllocationInput,
): AllocationBySchemeWithLines {
  let result: AllocationBySchemeWithLines = {
    schemeCode: input.schemeCode,
    schemeName: input.schemeName,
    totalMarketValueMinor: 0,
    slices: [],
  };

  const activeScheme =
    input.classificationSchemes.find((scheme) => scheme.code === input.schemeCode) ??
    null;
  const links = mergeClassificationLinks(input.classificationSchemes);

  if (!activeScheme || links.length === 0) {
    result = buildAllocationBySchemeWithLines(
      input.lines,
      input.schemeCode,
      input.schemeName,
    );
    return result;
  }

  const hierarchyOptions: HierarchyAllocationOptions = {
    parentValueId: input.parentValueId,
    links,
    schemeValues: buildClassificationGraphValues(input.classificationSchemes),
    schemeId: activeScheme.id,
  };

  result = buildHierarchicalAllocationBySchemeWithLines(
    input.lines,
    input.schemeCode,
    input.schemeName,
    hierarchyOptions,
  );
  return result;
}

/**
 * 各非葉分類を展開したときの直下スライス（子 + 親残差）を返す。
 * weight はルート集計の合計評価額基準に付け替える。
 */
export function buildChildAllocationSlicesByParentId(
  input: BuildChildAllocationSlicesInput,
): Map<string, AllocationSliceWithLines[]> {
  let result = new Map<string, AllocationSliceWithLines[]>();

  const activeScheme =
    input.classificationSchemes.find((scheme) => scheme.code === input.schemeCode) ??
    null;
  const links = mergeClassificationLinks(input.classificationSchemes);

  if (!activeScheme || links.length === 0) {
    return result;
  }

  const schemeValues = buildClassificationGraphValues(input.classificationSchemes);

  for (const value of activeScheme.values) {
    if ((value.childIds?.length ?? 0) === 0) {
      continue;
    }

    const hierarchyOptions: HierarchyAllocationOptions = {
      parentValueId: value.id,
      links,
      schemeValues,
      schemeId: activeScheme.id,
    };
    const childAllocation = buildHierarchicalAllocationBySchemeWithLines(
      input.lines,
      input.schemeCode,
      input.schemeName,
      hierarchyOptions,
    );

    if (childAllocation.slices.length === 0) {
      continue;
    }

    result.set(
      value.id,
      rescaleSliceWeightsToRootTotal(
        childAllocation.slices,
        input.rootTotalMarketValueMinor,
      ),
    );
  }

  return result;
}

export function getAllocationSliceExpandKey(slice: AllocationSliceWithLines): string {
  let result = slice.valueCode;

  if (slice.isParentResidual === true) {
    result = `${slice.valueCode}__residual`;
  }

  return result;
}

/**
 * 多親 DAG で同一 valueCode が複数親の下に出ても、展開状態が連動しないようにする。
 */
export function buildAllocationRowExpandKey(
  pathPrefix: string,
  slice: AllocationSliceWithLines,
): string {
  let result = getAllocationSliceExpandKey(slice);

  if (pathPrefix !== "") {
    result = `${pathPrefix}/${result}`;
  }

  return result;
}
