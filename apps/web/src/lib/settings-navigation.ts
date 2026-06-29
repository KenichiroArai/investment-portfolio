import { Database, Tags, type LucideIcon } from "lucide-react";

import { listDataSettingsChildren } from "@/lib/portfolio-data-tabs";

export type SettingsSubItem = {
  id: string;
  label: string;
  description?: string;
  tab?: string;
  hash?: string;
};

export type SettingsCategory = {
  segment: "data" | "classification";
  label: string;
  description: string;
  icon: LucideIcon;
  children: SettingsSubItem[];
};

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    segment: "data",
    label: "データ管理",
    description: "銘柄・明細・指標",
    icon: Database,
    children: [
      {
        id: "instrument",
        label: "銘柄",
        tab: "instrument",
      },
      {
        id: "holding",
        label: "保有明細",
        tab: "holding",
      },
      {
        id: "generic",
        label: "汎用指標",
        tab: "generic",
      },
    ],
  },
  {
    segment: "classification",
    label: "分類設定",
    description: "分析軸・タグ",
    icon: Tags,
    children: [
      {
        id: "scheme",
        label: "分析軸",
        tab: "scheme",
      },
      {
        id: "value",
        label: "カテゴリ値",
        tab: "value",
      },
      {
        id: "tag",
        label: "銘柄タグ",
        tab: "tag",
      },
    ],
  },
];

export function buildSettingsCategories(portfolioKind: string): SettingsCategory[] {
  let result: SettingsCategory[] = [];

  for (const category of SETTINGS_CATEGORIES) {
    if (category.segment !== "data") {
      result.push(category);
      continue;
    }

    result.push({
      ...category,
      children: listDataSettingsChildren(portfolioKind).map((tab) => ({
        id: tab.id,
        label: tab.label,
        tab: tab.id,
      })),
    });
  }

  return result;
}

export type SettingsViewMode = "category" | "overview";

export function getSettingsCategory(segment: string): SettingsCategory | undefined {
  let result = SETTINGS_CATEGORIES.find((category) => category.segment === segment);
  return result;
}

export function resolveSettingsViewMode(pathname: string): SettingsViewMode {
  let result: SettingsViewMode = "overview";
  const normalizedPathname = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  if (normalizedPathname.endsWith("/settings")) {
    return result;
  }

  if (
    normalizedPathname.includes("/settings/data") ||
    normalizedPathname.includes("/settings/classification")
  ) {
    result = "category";
  }

  return result;
}

export function resolveActiveCategory(pathname: string): SettingsCategory["segment"] | undefined {
  let result: SettingsCategory["segment"] | undefined = undefined;

  if (pathname.includes("/settings/data")) {
    result = "data";
    return result;
  }

  if (pathname.includes("/settings/classification")) {
    result = "classification";
  }

  return result;
}
