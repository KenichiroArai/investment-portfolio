import type { ClassificationSchemeWithValuesDto, HoldingLineDto } from "@repo/shared";
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
import type { AllocationAggregationLevel } from "@/features/allocation/useAllocationHierarchyParam";

type BuildSchemeAllocationInput = {
  lines: HoldingLineDto[];
  schemeCode: string;
  schemeName: string;
  classificationSchemes: ClassificationSchemeWithValuesDto[];
  parentValueId: string | null;
  aggregationLevel: AllocationAggregationLevel;
  includeOrphans: boolean;
};

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
    aggregationLevel: input.aggregationLevel,
    includeOrphans: input.includeOrphans,
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
