"use client";

import type {
  ClassificationSchemeWithValuesDto,
  CopyClassificationMode,
  CopyClassificationSchemeInput,
  InstrumentListItemDto,
} from "@repo/shared";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WritableGuard } from "@/features/manage/WritableGuard";
import { ClassificationValueTree } from "@/features/manage/ClassificationValueTree";
import { InstrumentTagHierarchyPicker } from "@/features/manage/InstrumentTagHierarchyPicker";
import { SchemeInstrumentTagPanel } from "@/features/manage/SchemeInstrumentTagPanel";
import {
  addInstrumentsToClassificationValue,
  removeInstrumentsFromClassificationValue,
  copyClassificationScheme,
  copyClassificationValue,
  createClassificationScheme,
  createClassificationValue,
  createClassificationValueLink,
  deleteClassificationScheme,
  deleteClassificationValue,
  deleteClassificationValueLink,
  fetchClassificationSchemes,
  fetchInstrumentClassifications,
  fetchInstruments,
  fetchPortfolioInstrumentClassifications,
  setInstrumentClassifications,
  updateClassificationScheme,
  updateClassificationValue,
} from "@/lib/api-client";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AnalysisSettingsViewProps = {
  portfolioCode: string;
  initialTab?: string;
};

function resolveClassificationTab(tab: string | null | undefined): string {
  let result = "scheme";

  if (tab === "scheme" || tab === "value" || tab === "tag") {
    result = tab;
  }

  return result;
}

export function AnalysisSettingsView({ portfolioCode, initialTab }: AnalysisSettingsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const resolvedInitialTab = resolveClassificationTab(initialTab);
  const activeTab = resolveClassificationTab(searchParams.get("tab") ?? resolvedInitialTab);
  const [schemes, setSchemes] = useState<ClassificationSchemeWithValuesDto[]>([]);
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schemeCode, setSchemeCode] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [valueSchemeId, setValueSchemeId] = useState("");
  const [valueCode, setValueCode] = useState("");
  const [valueName, setValueName] = useState("");
  const [valueDescription, setValueDescription] = useState("");
  const [valueSortOrder, setValueSortOrder] = useState("0");
  const [tagInstrumentId, setTagInstrumentId] = useState("");
  const [tagValueIds, setTagValueIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState("instrument");
  const [instrumentTagMap, setInstrumentTagMap] = useState<Record<string, string[]>>({});
  const [deleteSchemeId, setDeleteSchemeId] = useState<string | null>(null);
  const [deleteValueId, setDeleteValueId] = useState<string | null>(null);
  const [copySchemeTarget, setCopySchemeTarget] =
    useState<ClassificationSchemeWithValuesDto | null>(null);
  const [copySchemeCode, setCopySchemeCode] = useState("");
  const [copySchemeName, setCopySchemeName] = useState("");
  const [copySchemeHierarchy, setCopySchemeHierarchy] =
    useState<CopyClassificationSchemeInput["hierarchy"]>("as_is");

  const onTabValueChange = useCallback(
    (nextTab: string) => {
      let result: void = undefined;
      const resolvedTab = resolveClassificationTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", resolvedTab);
      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async (options?: { quiet?: boolean }) => {
    let result: void = undefined;
    const quiet = options?.quiet === true;

    if (!quiet) {
      setLoading(true);
    }

    const [schemeResponse, instrumentResponse, instrumentTagResponse] = await Promise.all([
      fetchClassificationSchemes(portfolioCode),
      fetchInstruments(portfolioCode),
      fetchPortfolioInstrumentClassifications(portfolioCode),
    ]);

    if (!schemeResponse.ok) {
      toast.error(schemeResponse.message);
      if (!quiet) {
        setLoading(false);
      }
      return result;
    }

    setSchemes(schemeResponse.data);
    setValueSchemeId((current) => {
      if (current) {
        return current;
      }
      return schemeResponse.data[0]?.id ?? "";
    });

    if (instrumentResponse.ok) {
      setInstruments(instrumentResponse.data);
      setTagInstrumentId((current) => {
        if (current) {
          return current;
        }
        return instrumentResponse.data[0]?.id ?? "";
      });
    }

    if (instrumentTagResponse.ok) {
      const tagMap: Record<string, string[]> = {};
      for (const entry of instrumentTagResponse.data) {
        tagMap[entry.instrumentId] = entry.classificationValueIds;
      }
      setInstrumentTagMap(tagMap);
    }

    if (!quiet) {
      setLoading(false);
    }
    return result;
  }, [portfolioCode]);

  const loadInstrumentTags = useCallback(async (instrumentId: string) => {
    let result: void = undefined;

    if (!instrumentId) {
      setTagValueIds([]);
      return result;
    }

    const response = await fetchInstrumentClassifications(instrumentId);
    if (!response.ok) {
      toast.error(response.message);
      setTagValueIds([]);
      return result;
    }

    setTagValueIds(response.data.classificationValueIds);
    return result;
  }, []);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function run() {
      let result: void = undefined;
      if (cancelled) {
        return result;
      }
      await load();
      return result;
    }

    void run();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [load]);

  useEffect(() => {
    let result: () => void = () => {};
    let cancelled = false;

    async function run() {
      let result: void = undefined;
      if (cancelled) {
        return result;
      }

      if (!tagInstrumentId) {
        setTagValueIds([]);
        return result;
      }

      const response = await fetchInstrumentClassifications(tagInstrumentId);
      if (cancelled) {
        return result;
      }

      if (!response.ok) {
        toast.error(response.message);
        setTagValueIds([]);
        return result;
      }

      setTagValueIds(response.data.classificationValueIds);
      return result;
    }

    void run();
    result = () => {
      cancelled = true;
    };
    return result;
  }, [tagInstrumentId]);

  async function handleCreateScheme(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);

    const response = await createClassificationScheme(portfolioCode, {
      code: schemeCode.trim(),
      name: schemeName.trim(),
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setSchemeCode("");
    setSchemeName("");
    toast.success("分析軸を追加しました。");
    await load();
    return result;
  }

  async function handleRenameScheme(schemeId: string, name: string) {
    let result: void = undefined;
    setSubmitting(true);

    const response = await updateClassificationScheme(schemeId, { name: name.trim() });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("分析軸を更新しました。");
    await load();
    return result;
  }

  async function handleDeleteScheme() {
    let result: void = undefined;
    if (!deleteSchemeId) {
      return result;
    }

    setSubmitting(true);
    const response = await deleteClassificationScheme(deleteSchemeId);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setDeleteSchemeId(null);
    toast.success("分析軸を削除しました。");
    await load();
    return result;
  }

  function openCopySchemeDialog(scheme: ClassificationSchemeWithValuesDto) {
    let result: void = undefined;
    setCopySchemeTarget(scheme);
    setCopySchemeCode(`${scheme.code}_copy`);
    setCopySchemeName(`${scheme.name}（コピー）`);
    setCopySchemeHierarchy("as_is");
    return result;
  }

  async function handleCopyScheme(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    if (!copySchemeTarget) {
      return result;
    }

    setSubmitting(true);
    const response = await copyClassificationScheme(copySchemeTarget.id, {
      code: copySchemeCode.trim(),
      name: copySchemeName.trim(),
      hierarchy: copySchemeHierarchy,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setCopySchemeTarget(null);
    toast.success("分析軸をコピーしました。");
    await load();
    return result;
  }

  async function handleCreateValue(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    if (!valueSchemeId) {
      return result;
    }

    setSubmitting(true);
    const response = await createClassificationValue(valueSchemeId, {
      code: valueCode.trim(),
      name: valueName.trim(),
      description: valueDescription.trim() === "" ? null : valueDescription.trim(),
      sortOrder: Number.parseInt(valueSortOrder, 10) || 0,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setValueCode("");
    setValueName("");
    setValueDescription("");
    setValueSortOrder("0");
    toast.success("カテゴリ値を追加しました。");
    await load();
    return result;
  }

  async function handleUpdateValue(
    valueId: string,
    payload: { name: string; description: string | null; sortOrder: number },
  ) {
    let result: void = undefined;
    setSubmitting(true);

    const response = await updateClassificationValue(valueId, payload);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("カテゴリ値を更新しました。");
    await load();
    return result;
  }

  async function handleDeleteValue() {
    let result: void = undefined;
    if (!deleteValueId) {
      return result;
    }

    setSubmitting(true);
    const response = await deleteClassificationValue(deleteValueId);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setDeleteValueId(null);
    toast.success("カテゴリ値を削除しました。");
    await load();
    return result;
  }

  async function handleApplyLinkChanges(diff: {
    toAdd: Array<{ parentValueId: string; childValueId: string }>;
    toRemove: Array<{ parentValueId: string; childValueId: string }>;
  }) {
    let result: void = undefined;

    if (diff.toAdd.length === 0 && diff.toRemove.length === 0) {
      return result;
    }

    setSubmitting(true);
    let addedCount = 0;
    let removedCount = 0;
    const errorMessages: string[] = [];

    for (const link of diff.toAdd) {
      const response = await createClassificationValueLink(link);
      if (!response.ok) {
        errorMessages.push(response.message);
        continue;
      }
      addedCount += 1;
    }

    for (const link of diff.toRemove) {
      const response = await deleteClassificationValueLink(link);
      if (!response.ok) {
        errorMessages.push(response.message);
        continue;
      }
      removedCount += 1;
    }

    setSubmitting(false);

    for (const message of errorMessages) {
      toast.error(message);
    }

    if (addedCount > 0 || removedCount > 0) {
      const parts: string[] = [];
      if (addedCount > 0) {
        parts.push(`${addedCount}件追加`);
      }
      if (removedCount > 0) {
        parts.push(`${removedCount}件解除`);
      }
      toast.success(`${parts.join("、")}しました。`);
      await load();
    }

    return result;
  }

  async function handleCopyValue(valueId: string, mode: CopyClassificationMode) {
    let result: void = undefined;
    setSubmitting(true);
    const response = await copyClassificationValue(valueId, { mode });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("分類値をコピーしました。");
    await load();
    return result;
  }

  async function handleSetTags(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    if (!tagInstrumentId) {
      return result;
    }

    setSubmitting(true);
    const response = await setInstrumentClassifications(tagInstrumentId, {
      classificationValueIds: tagValueIds,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("銘柄タグを保存しました。");
    await loadInstrumentTags(tagInstrumentId);
    await load();
    return result;
  }

  async function handleAssignChildValue(childValueId: string, instrumentIds: string[]) {
    let result: void = undefined;

    if (!childValueId || instrumentIds.length === 0) {
      return result;
    }

    setSubmitting(true);
    const response = await addInstrumentsToClassificationValue(childValueId, {
      instrumentIds,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success(`${response.data.updated} 件の銘柄にタグを追加しました。`);
    // 分析軸パネルの選択状態（親一覧表示）を保つためフルローディングは使わない
    await load({ quiet: true });
    if (tagInstrumentId) {
      await loadInstrumentTags(tagInstrumentId);
    }
    return result;
  }

  async function handleRemoveClassificationValue(
    valueId: string,
    instrumentIds: string[],
    label: string,
  ) {
    let result: void = undefined;

    if (!valueId || instrumentIds.length === 0) {
      return result;
    }

    setSubmitting(true);
    const response = await removeInstrumentsFromClassificationValue(valueId, {
      instrumentIds,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success(`${response.data.updated} 件の銘柄から${label}を外しました。`);
    await load({ quiet: true });
    if (tagInstrumentId) {
      await loadInstrumentTags(tagInstrumentId);
    }
    return result;
  }

  let result = (
    <div className="space-y-6">
      <PageHeader
        title="分類設定"
        description={`${portfolioCode} の分析軸・カテゴリ値・銘柄タグを管理します。`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPortfolioPath(portfolioCode, "analysis")}>資産配分へ</Link>
          </Button>
        }
      />

      {loading ? <LoadingSkeleton variant="table" /> : null}

      <WritableGuard>
        {!loading ? (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={onTabValueChange}>
              <TabsList>
                <TabsTrigger value="scheme">分析軸</TabsTrigger>
                <TabsTrigger value="value">カテゴリ値</TabsTrigger>
                <TabsTrigger value="tag">銘柄タグ</TabsTrigger>
              </TabsList>
              <TabsContent value="scheme" className="space-y-6">
                <Card>
              <CardHeader>
                <CardTitle>分析軸</CardTitle>
                <CardDescription>資産配分の集計軸を追加・編集します。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="grid max-w-lg gap-4" onSubmit={handleCreateScheme}>
                  <FormField label="軸コード" htmlFor="scheme-code">
                    <Input
                      id="scheme-code"
                      value={schemeCode}
                      onChange={(event) => {
                        setSchemeCode(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="軸名" htmlFor="scheme-name">
                    <Input
                      id="scheme-name"
                      value={schemeName}
                      onChange={(event) => {
                        setSchemeName(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <Button type="submit" disabled={submitting}>
                    軸を追加
                  </Button>
                </form>

                {schemes.length === 0 ? (
                  <EmptyState title="分析軸が未登録です" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>コード</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schemes.map((scheme) => {
                        let row = (
                          <SchemeTableRow
                            key={scheme.id}
                            scheme={scheme}
                            disabled={submitting}
                            onSave={(name) => {
                              void handleRenameScheme(scheme.id, name);
                            }}
                            onCopy={() => {
                              openCopySchemeDialog(scheme);
                            }}
                            onDelete={() => {
                              setDeleteSchemeId(scheme.id);
                            }}
                          />
                        );
                        return row;
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="value" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>カテゴリ値</CardTitle>
                    <CardDescription>
                      分析軸を選んでからカテゴリ値を追加し、親子リンクで階層を組み立てます。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                <form className="grid max-w-lg gap-4" onSubmit={handleCreateValue}>
                  <FormField label="分析軸" htmlFor="value-scheme">
                    <Select value={valueSchemeId} onValueChange={setValueSchemeId}>
                      <SelectTrigger id="value-scheme">
                        <SelectValue placeholder="分析軸を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {schemes.map((scheme) => {
                          let item = (
                            <SelectItem key={scheme.id} value={scheme.id}>
                              {scheme.name}
                            </SelectItem>
                          );
                          return item;
                        })}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="値コード" htmlFor="value-code">
                    <Input
                      id="value-code"
                      value={valueCode}
                      onChange={(event) => {
                        setValueCode(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="値名" htmlFor="value-name">
                    <Input
                      id="value-name"
                      value={valueName}
                      onChange={(event) => {
                        setValueName(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="説明" htmlFor="value-description">
                    <textarea
                      id="value-description"
                      className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={valueDescription}
                      onChange={(event) => {
                        setValueDescription(event.target.value);
                      }}
                      placeholder="任意。一覧では先頭だけ表示されます。"
                    />
                  </FormField>
                  <FormField label="表示順" htmlFor="value-sort">
                    <Input
                      id="value-sort"
                      type="number"
                      value={valueSortOrder}
                      onChange={(event) => {
                        setValueSortOrder(event.target.value);
                      }}
                    />
                  </FormField>
                  <Button type="submit" disabled={submitting || schemes.length === 0}>
                    値を追加
                  </Button>
                </form>

                {schemes.length === 0 ? (
                  <EmptyState title="分析軸が未登録です" />
                ) : (
                  <SelectedSchemeValuePanel
                    schemes={schemes}
                    schemeId={valueSchemeId}
                    disabled={submitting}
                    onUpdateValue={(valueId, payload) => {
                      void handleUpdateValue(valueId, payload);
                    }}
                    onDeleteValue={(valueId) => {
                      setDeleteValueId(valueId);
                    }}
                    onCopyValue={(valueId, mode) => {
                      void handleCopyValue(valueId, mode);
                    }}
                    onApplyLinkChanges={(diff) => {
                      void handleApplyLinkChanges(diff);
                    }}
                  />
                )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tag" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>銘柄タグ</CardTitle>
                    <CardDescription>
                      銘柄を選んでタグ付けするか、分析軸から親カテゴリ値を選んで対象銘柄にまとめて子カテゴリ値を付与できます。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                <Tabs value={tagMode} onValueChange={setTagMode} className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="instrument">銘柄から選ぶ</TabsTrigger>
                    <TabsTrigger value="scheme">分析軸から選ぶ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="instrument">
                    <form className="grid max-w-2xl gap-4" onSubmit={handleSetTags}>
                      <FormField label="銘柄" htmlFor="tag-instrument">
                        <Select value={tagInstrumentId} onValueChange={setTagInstrumentId}>
                          <SelectTrigger id="tag-instrument">
                            <SelectValue placeholder="銘柄を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {instruments.map((instrument) => {
                              let item = (
                                <SelectItem key={instrument.id} value={instrument.id}>
                                  {instrument.name}
                                </SelectItem>
                              );
                              return item;
                            })}
                          </SelectContent>
                        </Select>
                      </FormField>
                      <InstrumentTagHierarchyPicker
                        schemes={schemes}
                        selectedValueIds={tagValueIds}
                        onSelectedValueIdsChange={setTagValueIds}
                        disabled={submitting || !tagInstrumentId}
                      />
                      <Button type="submit" disabled={submitting || !tagInstrumentId}>
                        タグを保存
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="scheme">
                    <div className="max-w-2xl">
                      <SchemeInstrumentTagPanel
                        schemes={schemes}
                        instruments={instruments}
                        instrumentTagMap={instrumentTagMap}
                        disabled={submitting}
                        onAssign={(childValueId, instrumentIds) => {
                          void handleAssignChildValue(childValueId, instrumentIds);
                        }}
                        onRemoveParent={(parentValueId, instrumentIds) => {
                          void handleRemoveClassificationValue(
                            parentValueId,
                            instrumentIds,
                            "親タグ",
                          );
                        }}
                        onRemoveChild={(childValueId, instrumentIds) => {
                          void handleRemoveClassificationValue(
                            childValueId,
                            instrumentIds,
                            "子タグ",
                          );
                        }}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <AlertDialog
              open={deleteSchemeId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteSchemeId(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>分析軸を削除</AlertDialogTitle>
                  <AlertDialogDescription>
                    この分析軸と配下のカテゴリ値を削除します。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      void handleDeleteScheme();
                    }}
                  >
                    削除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog
              open={copySchemeTarget !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setCopySchemeTarget(null);
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>分析軸をコピー</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCopyScheme}>
                  <FormField label="軸コード" htmlFor="copy-scheme-code">
                    <Input
                      id="copy-scheme-code"
                      value={copySchemeCode}
                      onChange={(event) => {
                        setCopySchemeCode(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="軸名" htmlFor="copy-scheme-name">
                    <Input
                      id="copy-scheme-name"
                      value={copySchemeName}
                      onChange={(event) => {
                        setCopySchemeName(event.target.value);
                      }}
                      required
                    />
                  </FormField>
                  <FormField label="階層の向き" htmlFor="copy-scheme-hierarchy">
                    <Select
                      value={copySchemeHierarchy}
                      onValueChange={(value) => {
                        if (value === "as_is" || value === "inverted") {
                          setCopySchemeHierarchy(value);
                        }
                      }}
                    >
                      <SelectTrigger id="copy-scheme-hierarchy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="as_is">そのまま</SelectItem>
                        <SelectItem value="inverted">逆方向（親と子を入れ替え）</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={submitting}
                      onClick={() => {
                        setCopySchemeTarget(null);
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      コピー
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={deleteValueId !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteValueId(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>カテゴリ値を削除</AlertDialogTitle>
                  <AlertDialogDescription>このカテゴリ値を削除します。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      void handleDeleteValue();
                    }}
                  >
                    削除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </WritableGuard>
    </div>
  );
  return result;
}

type SchemeTableRowProps = {
  scheme: ClassificationSchemeWithValuesDto;
  disabled: boolean;
  onSave: (name: string) => void;
  onCopy: () => void;
  onDelete: () => void;
};

function SchemeTableRow({ scheme, disabled, onSave, onCopy, onDelete }: SchemeTableRowProps) {
  const [name, setName] = useState(scheme.name);

  let result = (
    <TableRow>
      <TableCell className="font-mono text-xs">{scheme.code}</TableCell>
      <TableCell>
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          required
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onSave(name);
            }}
          >
            更新
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onCopy}>
            コピー
          </Button>
          <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onDelete}>
            削除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
  return result;
}

type SelectedSchemeValuePanelProps = {
  schemes: ClassificationSchemeWithValuesDto[];
  schemeId: string;
  disabled: boolean;
  onUpdateValue: (
    valueId: string,
    payload: { name: string; description: string | null; sortOrder: number },
  ) => void;
  onDeleteValue: (valueId: string) => void;
  onCopyValue: (valueId: string, mode: CopyClassificationMode) => void;
  onApplyLinkChanges: (diff: {
    toAdd: Array<{ parentValueId: string; childValueId: string }>;
    toRemove: Array<{ parentValueId: string; childValueId: string }>;
  }) => void;
};

function SelectedSchemeValuePanel({
  schemes,
  schemeId,
  disabled,
  onUpdateValue,
  onDeleteValue,
  onCopyValue,
  onApplyLinkChanges,
}: SelectedSchemeValuePanelProps) {
  const selectedScheme = schemes.find((scheme) => scheme.id === schemeId) ?? schemes[0];

  if (!selectedScheme) {
    let emptyResult = <EmptyState title="分析軸が未登録です" />;
    return emptyResult;
  }

  let result = (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{selectedScheme.name}</h3>
      {selectedScheme.values.length === 0 ? (
        <EmptyState title="値がありません" className="py-6" />
      ) : (
        <ClassificationValueTree
          scheme={selectedScheme}
          allSchemes={schemes}
          disabled={disabled}
          onUpdateValue={onUpdateValue}
          onDeleteValue={onDeleteValue}
          onCopyValue={onCopyValue}
          onApplyLinkChanges={onApplyLinkChanges}
        />
      )}
    </div>
  );
  return result;
}
