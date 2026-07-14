"use client";

import type { CurrentSnapshotDto, InstrumentListItemDto } from "@repo/shared";
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
import { ManageAsOfDateField } from "@/features/manage/ManageAsOfDateField";
import {
  listGenericMetricOptions,
  resolveGenericMetricLabel,
} from "@/features/manage/generic-metric-options";
import { HoldingsDataTab } from "@/features/manage/HoldingsDataTab";
import {
  buildReplaceSnapshotInput,
  removeMetricByCode,
  snapshotToHoldingInputs,
  snapshotToMetricInputs,
  upsertMetric,
} from "@/features/manage/snapshot-input";
import { WritableGuard } from "@/features/manage/WritableGuard";
import { BackupPanel } from "@/features/backup/BackupPanel";
import { PortfolioExtraDataTabContent } from "@/features/portfolios/PortfolioExtraDataTabContent";
import {
  createInstrument,
  deleteInstrument,
  fetchClassificationSchemes,
  fetchCurrentSnapshot,
  fetchInstruments,
  replaceCurrentSnapshot,
  setInstrumentClassifications,
  updateInstrument,
} from "@/lib/api-client";
import { formatYen } from "@/lib/format-yen";
import { findPortfolioByCode } from "@/lib/portfolio-catalog";
import {
  BASE_DATA_MANAGE_TABS,
  buildDataManageTabs,
  resolveDataManageTab,
} from "@/lib/portfolio-data-tabs";

type DataManageViewProps = {
  portfolioCode: string;
  portfolioKind?: string;
  initialTab?: string;
};

export function DataManageView({
  portfolioCode,
  portfolioKind: portfolioKindProp,
  initialTab,
}: DataManageViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const portfolioKind = portfolioKindProp ?? findPortfolioByCode(portfolioCode)?.kind ?? "";
  const dataTabs = buildDataManageTabs(portfolioKind);
  const resolvedInitialTab = resolveDataManageTab(initialTab, portfolioKind);
  const activeTab = resolveDataManageTab(
    searchParams.get("tab") ?? resolvedInitialTab,
    portfolioKind,
    resolvedInitialTab,
  );
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schemeOptions, setSchemeOptions] = useState<
    Array<{ schemeName: string; values: Array<{ id: string; name: string }> }>
  >([]);

  const [asOfDate, setAsOfDate] = useState("");
  const [instrumentName, setInstrumentName] = useState("");
  const [tagValueIds, setTagValueIds] = useState<string[]>([]);
  const genericMetricOptions = listGenericMetricOptions(portfolioKind);
  const [metricCode, setMetricCode] = useState(
    genericMetricOptions[0]?.code ?? "",
  );
  const [metricValue, setMetricValue] = useState("");

  const [deleteInstrumentId, setDeleteInstrumentId] = useState<string | null>(null);
  const [deleteMetricCode, setDeleteMetricCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    let result: void = undefined;
    setLoading(true);

    const [snapshotResponse, instrumentResponse, schemeResponse] = await Promise.all([
      fetchCurrentSnapshot(portfolioCode),
      fetchInstruments(portfolioCode),
      fetchClassificationSchemes(portfolioCode),
    ]);

    if (snapshotResponse.ok) {
      setSnapshot(snapshotResponse.data);
      setAsOfDate(snapshotResponse.data.asOfDate);
    } else if (snapshotResponse.status === 404) {
      setSnapshot(null);
    } else {
      toast.error(snapshotResponse.message);
    }

    if (instrumentResponse.ok) {
      setInstruments(instrumentResponse.data);
    }

    if (schemeResponse.ok) {
      setSchemeOptions(
        schemeResponse.data.map((scheme) => ({
          schemeName: scheme.name,
          values: scheme.values.map((value) => ({
            id: value.id,
            name: value.name,
          })),
        })),
      );
    }

    setLoading(false);
    setInitialLoadDone(true);
    return result;
  }, [portfolioCode]);

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

  const onTabValueChange = useCallback(
    (nextTab: string) => {
      let result: void = undefined;
      const resolvedTab = resolveDataManageTab(nextTab, portfolioKind);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", resolvedTab);
      const query = params.toString();
      router.replace(query === "" ? pathname : `${pathname}?${query}`);
      return result;
    },
    [pathname, portfolioKind, router, searchParams],
  );

  async function saveSnapshot(
    lines: ReturnType<typeof snapshotToHoldingInputs>,
    metrics: ReturnType<typeof snapshotToMetricInputs>,
    successMessage: string,
  ) {
    let result = false;
    const date = asOfDate.trim() || snapshot?.asOfDate || "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("操作対象の基準日を YYYY-MM-DD 形式で入力してください。");
      return result;
    }

    setSubmitting(true);

    const response = await replaceCurrentSnapshot(
      portfolioCode,
      buildReplaceSnapshotInput(snapshot, {
        asOfDate: date,
        lines,
        metrics,
      }),
    );
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success(successMessage);
    await load();
    result = true;
    return result;
  }

  async function handleCreateInstrument(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);

    const response = await createInstrument({
      portfolioCode,
      accountId: `${portfolioCode}:manual`,
      name: instrumentName.trim(),
    });
    if (!response.ok) {
      setSubmitting(false);
      toast.error(response.message);
      return result;
    }

    if (tagValueIds.length > 0) {
      const tagResponse = await setInstrumentClassifications(response.data.id, {
        classificationValueIds: tagValueIds,
      });
      if (!tagResponse.ok) {
        setSubmitting(false);
        toast.error(tagResponse.message);
        return result;
      }
    }

    setSubmitting(false);
    setInstrumentName("");
    setTagValueIds([]);
    toast.success("銘柄を登録しました。");
    await load();
    return result;
  }

  async function handleAddMetric(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();

    const integerValue = Number.parseInt(metricValue, 10);
    if (!Number.isInteger(integerValue)) {
      toast.error("汎用値は整数で入力してください。");
      return result;
    }

    const existingLines = snapshot ? snapshotToHoldingInputs(snapshot) : [];
    const existingMetrics = snapshot ? snapshotToMetricInputs(snapshot) : [];
    const metrics = upsertMetric(existingMetrics, { code: metricCode, integerValue });

    const saved = await saveSnapshot(existingLines, metrics, "汎用指標を登録しました。");
    if (saved) {
      setMetricValue("");
    }
    return result;
  }

  async function handleUpdateInstrument(instrumentId: string, name: string) {
    let result: void = undefined;
    setSubmitting(true);

    const response = await updateInstrument(instrumentId, { name: name.trim() });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("銘柄を更新しました。");
    await load();
    return result;
  }

  async function handleDeleteInstrument() {
    let result: void = undefined;
    if (!deleteInstrumentId) {
      return result;
    }

    setSubmitting(true);
    const response = await deleteInstrument(deleteInstrumentId);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setDeleteInstrumentId(null);
    toast.success("銘柄を削除しました。");
    await load();
    return result;
  }

  async function handleDeleteMetric() {
    let result: void = undefined;
    if (!snapshot || !deleteMetricCode) {
      return result;
    }

    const metrics = removeMetricByCode(
      snapshotToMetricInputs(snapshot),
      deleteMetricCode,
    );
    const saved = await saveSnapshot(snapshotToHoldingInputs(snapshot), metrics, "汎用指標を削除しました。");
    if (saved) {
      setDeleteMetricCode(null);
    }
    return result;
  }

  let result = (
    <div className="space-y-6">
      <PageHeader
        title="データ管理"
        description={`${portfolioCode} の銘柄・保有明細・汎用指標を登録・更新・削除します。`}
      />

      <ManageAsOfDateField
        mode="editable"
        value={asOfDate}
        disabled={loading || submitting}
        onChange={setAsOfDate}
      />

      {loading && !initialLoadDone ? <LoadingSkeleton variant="table" /> : null}

      <WritableGuard>
        {initialLoadDone ? (
          <Tabs value={activeTab} onValueChange={onTabValueChange}>
            <TabsList>
              {dataTabs.map((tab) => {
                let trigger = (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                );
                return trigger;
              })}
            </TabsList>

            <TabsContent value="instrument" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>銘柄を登録</CardTitle>
                  <CardDescription>新しい銘柄を追加し、任意で分類タグを付与します。</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid max-w-lg gap-4" onSubmit={handleCreateInstrument}>
                    <FormField label="銘柄名" htmlFor="instrument-name">
                      <Input
                        id="instrument-name"
                        value={instrumentName}
                        onChange={(event) => {
                          setInstrumentName(event.target.value);
                        }}
                        required
                      />
                    </FormField>
                    {schemeOptions.length > 0 ? (
                      <div className="grid gap-3">
                        <p className="text-sm font-medium">分類タグ（任意）</p>
                        {schemeOptions.map((scheme) => {
                          let group = (
                            <div key={scheme.schemeName} className="rounded-lg border p-3">
                              <p className="mb-2 text-sm font-medium">{scheme.schemeName}</p>
                              <div className="flex flex-wrap gap-3">
                                {scheme.values.map((value) => {
                                  let checkbox = (
                                    <label
                                      key={value.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={tagValueIds.includes(value.id)}
                                        onChange={(event) => {
                                          if (event.target.checked) {
                                            setTagValueIds((current) => [...current, value.id]);
                                            return;
                                          }
                                          setTagValueIds((current) =>
                                            current.filter((id) => id !== value.id),
                                          );
                                        }}
                                      />
                                      {value.name}
                                    </label>
                                  );
                                  return checkbox;
                                })}
                              </div>
                            </div>
                          );
                          return group;
                        })}
                      </div>
                    ) : null}
                    <Button type="submit" disabled={submitting}>
                      銘柄を登録
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>登録済み銘柄</CardTitle>
                </CardHeader>
                <CardContent>
                  {instruments.length === 0 ? (
                    <EmptyState title="銘柄がありません" description="上のフォームから銘柄を登録してください。" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>銘柄名</TableHead>
                          <TableHead className="w-32 text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instruments.map((instrument) => {
                          let row = (
                            <InstrumentTableRow
                              key={instrument.id}
                              instrument={instrument}
                              disabled={submitting}
                              onSave={(name) => {
                                void handleUpdateInstrument(instrument.id, name);
                              }}
                              onDelete={() => {
                                setDeleteInstrumentId(instrument.id);
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

            <TabsContent value="holding" className="space-y-6">
              <HoldingsDataTab
                snapshot={snapshot}
                instruments={instruments}
                disabled={loading || submitting}
                onSaveSnapshot={saveSnapshot}
              />
            </TabsContent>

            {dataTabs
              .filter((tab) => !BASE_DATA_MANAGE_TABS.some((baseTab) => baseTab.id === tab.id))
              .map((tab) => {
                let content = (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                    <PortfolioExtraDataTabContent
                      tabId={tab.id}
                      portfolioCode={portfolioCode}
                      asOfDate={asOfDate}
                      disabled={loading || submitting}
                      onReload={load}
                    />
                  </TabsContent>
                );
                return content;
              })}

            <TabsContent value="generic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>汎用指標を登録</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid max-w-lg gap-4" onSubmit={handleAddMetric}>
                    <FormField label="汎用名" htmlFor="metric-code">
                      <Select value={metricCode} onValueChange={setMetricCode}>
                        <SelectTrigger id="metric-code">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {genericMetricOptions.map((option) => {
                            let item = (
                              <SelectItem key={option.code} value={option.code}>
                                {option.label}
                              </SelectItem>
                            );
                            return item;
                          })}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField
                      label={`値（${resolveGenericMetricLabel(metricCode)}）`}
                      htmlFor="metric-value"
                    >
                      <Input
                        id="metric-value"
                        type="number"
                        value={metricValue}
                        onChange={(event) => {
                          setMetricValue(event.target.value);
                        }}
                        required
                      />
                    </FormField>
                    <Button type="submit" disabled={submitting}>
                      汎用指標を登録
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>汎用指標一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  {!snapshot || snapshot.metrics.length === 0 ? (
                    <EmptyState title="汎用指標がありません" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>指標</TableHead>
                          <TableHead>値</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshot.metrics.map((metric) => {
                          let row = (
                            <MetricTableRow
                              key={metric.code}
                              metricCode={metric.code}
                              label={resolveGenericMetricLabel(metric.code)}
                              initialValue={metric.integerValue ?? 0}
                              disabled={submitting}
                              onSave={async (integerValue) => {
                                const metrics = upsertMetric(
                                  snapshotToMetricInputs(snapshot),
                                  { code: metric.code, integerValue },
                                );
                                await saveSnapshot(
                                  snapshotToHoldingInputs(snapshot),
                                  metrics,
                                  "汎用指標を更新しました。",
                                );
                              }}
                              onDelete={() => {
                                setDeleteMetricCode(metric.code);
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

            <TabsContent value="backup" className="space-y-6">
              <BackupPanel
                scope="portfolio"
                portfolioCode={portfolioCode}
                onImported={() => {
                  void load();
                }}
              />
            </TabsContent>
          </Tabs>
        ) : null}

        <AlertDialog open={deleteInstrumentId !== null} onOpenChange={(open) => {
          if (!open) {
            setDeleteInstrumentId(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>銘柄を削除</AlertDialogTitle>
              <AlertDialogDescription>
                この銘柄を削除します。保有明細で使用中の場合は削除できません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDeleteInstrument();
                }}
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteMetricCode !== null} onOpenChange={(open) => {
          if (!open) {
            setDeleteMetricCode(null);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>汎用指標を削除</AlertDialogTitle>
              <AlertDialogDescription>この汎用指標を削除します。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void handleDeleteMetric();
                }}
              >
                削除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </WritableGuard>
    </div>
  );
  return result;
}

type InstrumentTableRowProps = {
  instrument: InstrumentListItemDto;
  disabled: boolean;
  onSave: (name: string) => void;
  onDelete: () => void;
};

function InstrumentTableRow({
  instrument,
  disabled,
  onSave,
  onDelete,
}: InstrumentTableRowProps) {
  const [name, setName] = useState(instrument.name);

  let result = (
    <TableRow>
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
          <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onDelete}>
            削除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
  return result;
}

type MetricTableRowProps = {
  metricCode: string;
  label: string;
  initialValue: number;
  disabled: boolean;
  onSave: (value: number) => void;
  onDelete: () => void;
};

function MetricTableRow({
  label,
  initialValue,
  disabled,
  onSave,
  onDelete,
}: MetricTableRowProps) {
  const [value, setValue] = useState(String(initialValue));

  let result = (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            現在: {formatYen(initialValue)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              onSave(Number.parseInt(value, 10));
            }}
          >
            更新
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
