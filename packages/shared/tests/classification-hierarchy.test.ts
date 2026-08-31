import { describe, expect, it } from "vitest";

import {
  buildClassificationGraph,
  collectSubtreeLinks,
  collectSubtreeValueIds,
  enrichClassificationValues,
  getDescendantLeafIds,
  getRootValueIds,
  validateLinkAddition,
} from "../src/classification-hierarchy";

const schemeA = "scheme-a";
const schemeB = "scheme-b";

const values = [
  {
    id: "stock",
    code: "stock",
    name: "株式",
    sortOrder: 1,
    schemeId: schemeA,
    schemeCode: "asset_class",
  },
  {
    id: "domestic",
    code: "domestic",
    name: "国内株式",
    sortOrder: 1,
    schemeId: schemeA,
    schemeCode: "asset_class",
  },
  {
    id: "developed",
    code: "developed",
    name: "先進国株式",
    sortOrder: 2,
    schemeId: schemeA,
    schemeCode: "asset_class",
  },
  {
    id: "region-developed",
    code: "developed",
    name: "先進国",
    sortOrder: 1,
    schemeId: schemeB,
    schemeCode: "region",
  },
];

const links = [
  { parentValueId: "stock", childValueId: "domestic", sortOrder: 1 },
  { parentValueId: "stock", childValueId: "developed", sortOrder: 2 },
  { parentValueId: "stock", childValueId: "region-developed", sortOrder: 3 },
];

describe("classification-hierarchy", () => {
  it("builds graph with leaf detection", () => {
    const graph = buildClassificationGraph(values, links);

    expect(graph.leafValueIds.has("domestic")).toBe(true);
    expect(graph.leafValueIds.has("developed")).toBe(true);
    expect(graph.leafValueIds.has("stock")).toBe(false);
  });

  it("returns descendant leaf ids", () => {
    const graph = buildClassificationGraph(values, links);
    const leafIds = getDescendantLeafIds("stock", graph);

    expect([...leafIds].sort()).toEqual(["developed", "domestic", "region-developed"]);
  });

  it("returns root value ids within scheme", () => {
    const graph = buildClassificationGraph(values, links);
    const roots = getRootValueIds(schemeA, graph);

    expect(roots).toEqual(["stock"]);
  });

  it("rejects cyclic link addition", () => {
    const graph = buildClassificationGraph(values, links);
    const validation = validateLinkAddition(graph, "domestic", "stock");

    expect(validation.ok).toBe(false);
  });

  it("enriches values with parent and child ids", () => {
    const enriched = enrichClassificationValues(values, links);
    const stock = enriched.find((value) => value.id === "stock");

    expect(stock?.childIds).toEqual(["domestic", "developed", "region-developed"]);
    expect(stock?.isLeaf).toBe(false);
  });

  it("collects subtree ids for copy modes", () => {
    const graph = buildClassificationGraph(values, links);

    expect(collectSubtreeValueIds("stock", graph, "value_only")).toEqual(["stock"]);
    expect(collectSubtreeValueIds("stock", graph, "with_children").sort()).toEqual(
      ["developed", "domestic", "region-developed", "stock"].sort(),
    );
    expect(collectSubtreeValueIds("stock", graph, "with_subtree").sort()).toEqual(
      ["developed", "domestic", "region-developed", "stock"].sort(),
    );
  });

  it("collects subtree links", () => {
    const valueIds = new Set(["stock", "domestic"]);
    const subtreeLinks = collectSubtreeLinks(valueIds, links);

    expect(subtreeLinks).toEqual([
      { parentValueId: "stock", childValueId: "domestic", sortOrder: 1 },
    ]);
  });
});
