"use client";

import type {
  ClassificationSchemeWithValuesDto,
  InstrumentListItemDto,
} from "@repo/shared";
import Link from "next/link";
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
import { WritableGuard } from "@/features/manage/WritableGuard";
import {
  createClassificationScheme,
  createClassificationValue,
  deleteClassificationScheme,
  deleteClassificationValue,
  fetchClassificationSchemes,
  fetchInstruments,
  setInstrumentClassifications,
  updateClassificationScheme,
  updateClassificationValue,
} from "@/lib/api-client";
import { buildPortfolioPath } from "@/lib/portfolio-path";

type AnalysisSettingsViewProps = {
  portfolioCode: string;
};

export function AnalysisSettingsView({ portfolioCode }: AnalysisSettingsViewProps) {
  const [schemes, setSchemes] = useState<ClassificationSchemeWithValuesDto[]>([]);
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [schemeCode, setSchemeCode] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [valueSchemeId, setValueSchemeId] = useState("");
  const [valueCode, setValueCode] = useState("");
  const [valueName, setValueName] = useState("");
  const [valueSortOrder, setValueSortOrder] = useState("0");
  const [tagInstrumentId, setTagInstrumentId] = useState("");
  const [tagValueIds, setTagValueIds] = useState<string[]>([]);
  const [deleteSchemeId, setDeleteSchemeId] = useState<string | null>(null);
  const [deleteValueId, setDeleteValueId] = useState<string | null>(null);

  const load = useCallback(async () => {
    let result: void = undefined;
    setLoading(true);

    const [schemeResponse, instrumentResponse] = await Promise.all([
      fetchClassificationSchemes(portfolioCode),
      fetchInstruments(),
    ]);

    if (!schemeResponse.ok) {
      toast.error(schemeResponse.message);
      setLoading(false);
      return result;
    }

    setSchemes(schemeResponse.data);
    if (!valueSchemeId && schemeResponse.data.length > 0) {
      setValueSchemeId(schemeResponse.data[0].id);
    }

    if (instrumentResponse.ok) {
      setInstruments(instrumentResponse.data);
      if (!tagInstrumentId && instrumentResponse.data.length > 0) {
        setTagInstrumentId(instrumentResponse.data[0].id);
      }
    }

    setLoading(false);
    return result;
  }, [portfolioCode, tagInstrumentId, valueSchemeId]);

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
      sortOrder: Number.parseInt(valueSortOrder, 10) || 0,
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setValueCode("");
    setValueName("");
    setValueSortOrder("0");
    toast.success("カテゴリ値を追加しました。");
    await load();
    return result;
  }

  async function handleUpdateValue(valueId: string, name: string, sortOrder: number) {
    let result: void = undefined;
    setSubmitting(true);

    const response = await updateClassificationValue(valueId, { name, sortOrder });
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
    await load();
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

            <Card>
              <CardHeader>
                <CardTitle>カテゴリ値</CardTitle>
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

                {schemes.map((scheme) => {
                  let block = (
                    <div key={scheme.id} className="space-y-3">
                      <h3 className="text-sm font-semibold">{scheme.name}</h3>
                      {scheme.values.length === 0 ? (
                        <EmptyState title="値がありません" className="py-6" />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>コード</TableHead>
                              <TableHead>名称</TableHead>
                              <TableHead>表示順</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scheme.values.map((value) => {
                              let row = (
                                <ValueTableRow
                                  key={value.id}
                                  valueCode={value.code}
                                  initialName={value.name}
                                  initialSortOrder={value.sortOrder}
                                  disabled={submitting}
                                  onSave={(name, sortOrder) => {
                                    void handleUpdateValue(value.id, name, sortOrder);
                                  }}
                                  onDelete={() => {
                                    setDeleteValueId(value.id);
                                  }}
                                />
                              );
                              return row;
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                  return block;
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>銘柄タグ</CardTitle>
                <CardDescription>銘柄に分類値を複数付与できます。</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid max-w-lg gap-4" onSubmit={handleSetTags}>
                  <FormField label="銘柄" htmlFor="tag-instrument">
                    <Select
                      value={tagInstrumentId}
                      onValueChange={(value) => {
                        setTagInstrumentId(value);
                        setTagValueIds([]);
                      }}
                    >
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
                  <div className="grid gap-3">
                    <p className="text-sm font-medium">分類値（複数選択可）</p>
                    {schemes.map((scheme) => {
                      let group = (
                        <div key={scheme.id} className="rounded-lg border p-3">
                          <p className="mb-2 text-sm font-medium">{scheme.name}</p>
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
                  <Button type="submit" disabled={submitting || !tagInstrumentId}>
                    タグを保存
                  </Button>
                </form>
              </CardContent>
            </Card>

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
  onDelete: () => void;
};

function SchemeTableRow({ scheme, disabled, onSave, onDelete }: SchemeTableRowProps) {
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
          <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onDelete}>
            削除
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
  return result;
}

type ValueTableRowProps = {
  valueCode: string;
  initialName: string;
  initialSortOrder: number;
  disabled: boolean;
  onSave: (name: string, sortOrder: number) => void;
  onDelete: () => void;
};

function ValueTableRow({
  valueCode,
  initialName,
  initialSortOrder,
  disabled,
  onSave,
  onDelete,
}: ValueTableRowProps) {
  const [name, setName] = useState(initialName);
  const [sortOrder, setSortOrder] = useState(String(initialSortOrder));

  let result = (
    <TableRow>
      <TableCell className="font-mono text-xs">{valueCode}</TableCell>
      <TableCell>
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          required
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={sortOrder}
          onChange={(event) => {
            setSortOrder(event.target.value);
          }}
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
              onSave(name, Number.parseInt(sortOrder, 10) || 0);
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
