import { describe, expect, it } from "vitest";

import {
  buildClassificationGraph,
  buildValueCodeToIdMap,
  buildValueIdToCodeMap,
  collectSubtreeLinks,
  collectSubtreeValueIds,
  enrichClassificationValues,
  getDescendantLeafIds,
  getDescendantValueIds,
  getDirectChildIds,
  getLineLeafValueIdsByScheme,
  getOrphanValueIdsInScheme,
  getRootValueIds,
  isLeafValue,
  lineMatchesCrossSchemeChildFilter,
  lineMatchesDescendantFilter,
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

  it("ignores links whose endpoints are missing from values", () => {
    const graph = buildClassificationGraph(values, [
      { parentValueId: "missing-parent", childValueId: "domestic", sortOrder: 1 },
      { parentValueId: "stock", childValueId: "missing-child", sortOrder: 2 },
      ...links,
    ]);

    expect(graph.childIdsByParentId.get("stock")).toEqual([
      "domestic",
      "developed",
      "region-developed",
    ]);
  });

  it("exposes leaf, child, descendant, and orphan helpers", () => {
    const graph = buildClassificationGraph(values, links);

    expect(isLeafValue("domestic", graph)).toBe(true);
    expect(isLeafValue("stock", graph)).toBe(false);
    expect(getDirectChildIds("stock", graph)).toEqual([
      "domestic",
      "developed",
      "region-developed",
    ]);
    expect([...getDescendantValueIds("stock", graph)].sort()).toEqual(
      ["developed", "domestic", "region-developed", "stock"].sort(),
    );
    expect(getOrphanValueIdsInScheme(schemeA, graph)).toEqual(["stock"]);
    expect(getOrphanValueIdsInScheme(schemeB, graph)).toEqual([]);
  });

  it("validates link addition errors", () => {
    const graph = buildClassificationGraph(values, links);

    expect(validateLinkAddition(graph, "stock", "stock")).toEqual({
      ok: false,
      reason: "親と子に同じ分類値は指定できません。",
    });
    expect(validateLinkAddition(graph, "missing", "domestic")).toEqual({
      ok: false,
      reason: "親分類値が見つかりません。",
    });
    expect(validateLinkAddition(graph, "stock", "missing")).toEqual({
      ok: false,
      reason: "子分類値が見つかりません。",
    });
    expect(validateLinkAddition(graph, "stock", "domestic")).toEqual({
      ok: false,
      reason: "同じ親子リンクが既に存在します。",
    });
  });

  it("builds code and id maps for scheme lookup", () => {
    const schemeIdByCode = new Map([["asset_class", schemeA]]);
    const codeToId = buildValueCodeToIdMap(values, "asset_class", schemeIdByCode);
    const idToCode = buildValueIdToCodeMap(values);

    expect(codeToId.get("domestic")).toBe("domestic");
    expect(buildValueCodeToIdMap(values, "missing", schemeIdByCode).size).toBe(0);
    expect(idToCode.get("stock")).toBe("stock");
  });

  it("ignores duplicate links when building the graph", () => {
    const graph = buildClassificationGraph(values, [
      ...links,
      { parentValueId: "stock", childValueId: "domestic", sortOrder: 99 },
    ]);

    expect(graph.parentIdsByChildId.get("domestic")).toEqual(["stock"]);
  });

  it("sorts enriched values by code when name and sort order tie", () => {
    const tieValues = [
      {
        id: "code-b",
        code: "b",
        name: "同順位",
        sortOrder: 1,
        schemeId: schemeA,
      },
      {
        id: "code-a",
        code: "a",
        name: "同順位",
        sortOrder: 1,
        schemeId: schemeA,
      },
    ];
    const enriched = enrichClassificationValues(tieValues, []);

    expect(enriched.map((value) => value.code)).toEqual(["a", "b"]);
  });

  it("sorts children by code when display name and sort order tie", () => {
    const tiedChildren = [
      ...values.filter((value) => value.id === "stock"),
      {
        id: "child-b",
        code: "b",
        name: "同順位",
        sortOrder: 1,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
      {
        id: "child-a",
        code: "a",
        name: "同順位",
        sortOrder: 1,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
    ];
    const graph = buildClassificationGraph(tiedChildren, [
      { parentValueId: "stock", childValueId: "child-b", sortOrder: 1 },
      { parentValueId: "stock", childValueId: "child-a", sortOrder: 1 },
    ]);

    expect(graph.childIdsByParentId.get("stock")).toEqual(["child-a", "child-b"]);
  });

  it("sorts children by display order when link sort order ties", () => {
    const tiedChildren = [
      ...values.filter((value) => value.id === "stock"),
      {
        id: "child-z",
        code: "zulu",
        name: "Zulu",
        sortOrder: 1,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
      {
        id: "child-a",
        code: "alpha",
        name: "Alpha",
        sortOrder: 1,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
    ];
    const graph = buildClassificationGraph(tiedChildren, [
      { parentValueId: "stock", childValueId: "child-z", sortOrder: 1 },
      { parentValueId: "stock", childValueId: "child-a", sortOrder: 1 },
    ]);

    expect(graph.childIdsByParentId.get("stock")).toEqual(["child-a", "child-z"]);
  });

  it("sorts root values within a scheme", () => {
    const rootedValues = [
      ...values.filter((value) => value.id !== "region-developed"),
      {
        id: "bond",
        code: "bond",
        name: "債券",
        sortOrder: 2,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
    ];
    const graph = buildClassificationGraph(rootedValues, links.filter(
      (link) => link.childValueId !== "region-developed",
    ));

    expect(getRootValueIds(schemeA, graph)).toEqual(["stock", "bond"]);
  });

  it("collects tagged leaf ids by scheme", () => {
    const schemeCodeById = new Map([[schemeA, "asset_class"]]);
    const valueCodeBySchemeCode = new Map([
      ["asset_class", new Map([["domestic", "domestic"]])],
    ]);

    const tagged = getLineLeafValueIdsByScheme(
      [{ schemeCode: "asset_class", valueCode: "domestic" }],
      values,
      schemeCodeById,
      valueCodeBySchemeCode,
    );
    expect([...tagged.get("asset_class") ?? []]).toEqual(["domestic"]);
    expect(
      getLineLeafValueIdsByScheme(
        [{ schemeCode: "asset_class", valueCode: "missing-code" }],
        values,
        schemeCodeById,
        valueCodeBySchemeCode,
      ).size,
    ).toBe(0);
    expect(
      getLineLeafValueIdsByScheme(
        [{ schemeCode: "missing", valueCode: "domestic" }],
        values,
        schemeCodeById,
        valueCodeBySchemeCode,
      ).size,
    ).toBe(0);
  });

  it("matches descendant and cross-scheme child filters", () => {
    const graph = buildClassificationGraph(values, links);
    const lineLeafIdsByScheme = new Map([
      ["asset_class", new Set(["domestic"])],
      ["region", new Set(["region-developed"])],
    ]);

    expect(
      lineMatchesDescendantFilter(
        lineLeafIdsByScheme,
        "asset_class",
        new Set(["domestic"]),
        graph,
        values,
        new Map([[schemeA, "asset_class"]]),
      ),
    ).toBe(true);
    expect(
      lineMatchesDescendantFilter(
        lineLeafIdsByScheme,
        "asset_class",
        new Set(["developed"]),
        graph,
        values,
        new Map([[schemeA, "asset_class"]]),
      ),
    ).toBe(false);
    expect(
      lineMatchesDescendantFilter(
        new Map(),
        "asset_class",
        new Set(["domestic"]),
        graph,
        values,
        new Map([[schemeA, "asset_class"]]),
      ),
    ).toBe(false);

    expect(
      lineMatchesCrossSchemeChildFilter(
        lineLeafIdsByScheme,
        "asset_class",
        new Set(["domestic"]),
        "stock",
        graph,
        "region",
      ),
    ).toBe(true);
    expect(
      lineMatchesCrossSchemeChildFilter(
        lineLeafIdsByScheme,
        "asset_class",
        new Set(["developed"]),
        "stock",
        graph,
        "region",
      ),
    ).toBe(false);
    expect(
      lineMatchesCrossSchemeChildFilter(
        new Map([["asset_class", new Set(["domestic"])]]),
        "region",
        new Set(["region-developed"]),
        "developed",
        graph,
        "asset_class",
      ),
    ).toBe(false);
    expect(
      lineMatchesCrossSchemeChildFilter(
        lineLeafIdsByScheme,
        "asset_class",
        new Set(["domestic"]),
        "developed",
        graph,
        "asset_class",
      ),
    ).toBe(false);
    expect(
      lineMatchesCrossSchemeChildFilter(
        new Map([["asset_class", new Set(["domestic"])]]),
        "asset_class",
        new Set(["domestic"]),
        "developed",
        graph,
        "region",
      ),
    ).toBe(false);
  });

  it("skips revisiting nodes while walking descendants", () => {
    const cyclicValues = [
      {
        id: "node-a",
        code: "a",
        name: "A",
        sortOrder: 1,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
      {
        id: "node-b",
        code: "b",
        name: "B",
        sortOrder: 2,
        schemeId: schemeA,
        schemeCode: "asset_class",
      },
    ];
    const cyclicGraph = buildClassificationGraph(cyclicValues, [
      { parentValueId: "node-a", childValueId: "node-b", sortOrder: 1 },
      { parentValueId: "node-b", childValueId: "node-a", sortOrder: 2 },
    ]);

    expect([...getDescendantValueIds("node-a", cyclicGraph)].sort()).toEqual(
      ["node-a", "node-b"].sort(),
    );
  });
});
