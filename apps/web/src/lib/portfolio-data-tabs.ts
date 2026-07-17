export type DataManageTabItem = {
  id: string;
  label: string;
};

export const BASE_DATA_MANAGE_TABS: DataManageTabItem[] = [
  { id: "instrument", label: "銘柄" },
  { id: "holding", label: "保有明細" },
  { id: "generic", label: "汎用指標" },
  { id: "backup", label: "バックアップ" },
];

export type PortfolioKindExtraDataTab = {
  id: string;
  label: string;
  insertAfter: string;
};

export const PORTFOLIO_KIND_EXTRA_DATA_TABS: Record<string, PortfolioKindExtraDataTab[]> = {
  ideco: [
    {
      id: "ideco-bulk-import",
      label: "iDeCo一括取り込み",
      insertAfter: "holding",
    },
  ],
  monex: [
    {
      id: "monex-bulk-import",
      label: "マネックス一括取り込み",
      insertAfter: "holding",
    },
  ],
  rakuten: [
    {
      id: "rakuten-bulk-import",
      label: "楽天証券一括取り込み",
      insertAfter: "holding",
    },
  ],
  "sbi-wrap": [
    {
      id: "sbi-wrap-bulk-import",
      label: "SBIラップ一括取り込み",
      insertAfter: "holding",
    },
  ],
};

export function buildDataManageTabs(portfolioKind: string): DataManageTabItem[] {
  let result: DataManageTabItem[] = [...BASE_DATA_MANAGE_TABS];
  const extraTabs = PORTFOLIO_KIND_EXTRA_DATA_TABS[portfolioKind] ?? [];

  for (const extraTab of extraTabs) {
    const insertIndex = result.findIndex((tab) => tab.id === extraTab.insertAfter);
    if (insertIndex === -1) {
      continue;
    }
    result.splice(insertIndex + 1, 0, {
      id: extraTab.id,
      label: extraTab.label,
    });
  }

  return result;
}

export function resolveDataManageTab(
  tab: string | null | undefined,
  portfolioKind: string,
  fallbackTab?: string,
): string {
  let result = fallbackTab ?? BASE_DATA_MANAGE_TABS[0].id;
  const tabs = buildDataManageTabs(portfolioKind);

  if (tab && tabs.some((item) => item.id === tab)) {
    result = tab;
  }

  return result;
}

export function listDataSettingsChildren(portfolioKind: string): DataManageTabItem[] {
  let result = buildDataManageTabs(portfolioKind);
  return result;
}
