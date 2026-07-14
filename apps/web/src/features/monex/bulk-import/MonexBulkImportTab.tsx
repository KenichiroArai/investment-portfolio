"use client";

import type {
  CurrentSnapshotDto,
  HoldingLineInput,
  MonexInstrumentAssetClassBreakdownEntry,
  PortfolioSnapshotMetricInput,
} from "@repo/shared";
import { MonexCsvError, parseMonexPaste } from "@repo/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildReplaceSnapshotInput,
  snapshotToMetricInputs,
} from "@/features/manage/snapshot-input";
import {
  applyMonexAssetClassWeights,
  createInstrument,
  fetchCurrentSnapshot,
  replaceCurrentSnapshot,
} from "@/lib/api-client";

import { fetchPasteInstruments } from "./fetch-paste-instruments";
import {
  buildAssetClassAssignments,
  draftRowsToHoldingInputs,
  hasUnmatchedDraftRows,
  listUnmatchedInstrumentCandidates,
  pasteRowsToDrafts,
  rematchDraftRows,
  type UnmatchedInstrumentCandidate,
} from "./holding-draft";
import { MonexBulkImportDraftTable } from "./MonexBulkImportDraftTable";
import { MonexBulkImportPasteCard } from "./MonexBulkImportPasteCard";
import { MonexUnmatchedInstrumentsPanel } from "./MonexUnmatchedInstrumentsPanel";
import type { MonexHoldingDraftRow, PasteInstrumentDto } from "./types";

type MonexBulkImportTabProps = {
  portfolioCode: string;
  asOfDate: string;
  disabled: boolean;
  onReload: () => Promise<void>;
};

export function MonexBulkImportTab({
  portfolioCode,
  asOfDate,
  disabled,
  onReload,
}: MonexBulkImportTabProps) {
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [instruments, setInstruments] = useState<PasteInstrumentDto[]>([]);
  const [drafts, setDrafts] = useState<MonexHoldingDraftRow[] | null>(null);
  const [assetClassBreakdown, setAssetClassBreakdown] = useState<
    Map<string, MonexInstrumentAssetClassBreakdownEntry[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    let result: void = undefined;
    setLoading(true);

    const [snapshotResponse, instrumentsResponse] = await Promise.all([
      fetchCurrentSnapshot(portfolioCode),
      fetchPasteInstruments(portfolioCode),
    ]);

    if (snapshotResponse.ok) {
      setSnapshot(snapshotResponse.data);
    } else if (snapshotResponse.status === 404) {
      setSnapshot(null);
    } else {
      toast.error(snapshotResponse.message);
    }

    if (instrumentsResponse.ok) {
      setInstruments(instrumentsResponse.data);
    } else {
      toast.error(instrumentsResponse.message);
    }

    setLoading(false);
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

  const isDraftMode = drafts !== null && drafts.length > 0;
  const hasUnmatched = drafts !== null && hasUnmatchedDraftRows(drafts);
  const unmatchedCandidates = useMemo(() => {
    let result: UnmatchedInstrumentCandidate[] = [];
    if (drafts) {
      result = listUnmatchedInstrumentCandidates(drafts);
    }
    return result;
  }, [drafts]);
  const isBusy = disabled || loading || submitting;

  async function saveSnapshot(
    lines: HoldingLineInput[],
    metrics: PortfolioSnapshotMetricInput[],
    successMessage: string,
  ) {
    let result = false;
    const date = asOfDate.trim();

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
    await onReload();
    result = true;
    return result;
  }

  async function handleImport(pasteText: string) {
    let result: void = undefined;

    try {
      const parsed = parseMonexPaste(pasteText);
      const nextDrafts = pasteRowsToDrafts(parsed.holdings, instruments);
      setDrafts(nextDrafts);
      setAssetClassBreakdown(parsed.assetClassBreakdownByInstrumentName);

      if (hasUnmatchedDraftRows(nextDrafts)) {
        toast.warning(
          "一部の銘柄を自動マッチできませんでした。下の候補から銘柄登録するか、一覧で選択してください。",
        );
      } else {
        toast.success(`${nextDrafts.length} 件の明細を取り込みました。`);
      }
    } catch (error) {
      if (error instanceof MonexCsvError) {
        toast.error(error.message);
        return result;
      }
      toast.error("貼り付けデータの解析に失敗しました。");
    }

    return result;
  }

  function handleCancelDraft() {
    let result: void = undefined;
    setDrafts(null);
    setAssetClassBreakdown(new Map());
    return result;
  }

  async function handleCreateUnmatchedInstrument(candidate: UnmatchedInstrumentCandidate) {
    let result: void = undefined;

    const isUs = candidate.source === "us";
    const response = await createInstrument({
      portfolioCode,
      accountId: `${portfolioCode}:unknown`,
      name: candidate.instrumentName,
      instrumentType: isUs ? "equity" : "mutual_fund",
      currency: isUs ? "USD" : "JPY",
      externalId: candidate.ticker,
    });

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    const instrumentsResponse = await fetchPasteInstruments(portfolioCode);
    if (!instrumentsResponse.ok) {
      toast.error(instrumentsResponse.message);
      return result;
    }

    const nextInstruments = instrumentsResponse.data;
    setInstruments(nextInstruments);
    setDrafts((current) => {
      let nextDrafts: MonexHoldingDraftRow[] | null = current;
      if (current) {
        nextDrafts = rematchDraftRows(current, nextInstruments);
      }
      return nextDrafts;
    });

    toast.success(`銘柄「${candidate.instrumentName}」を登録しました。`);
    await onReload();
    return result;
  }

  async function handleRegisterDraft() {
    let result: void = undefined;

    if (!drafts || drafts.length === 0) {
      return result;
    }

    if (hasUnmatchedDraftRows(drafts)) {
      toast.error(
        "未割当の銘柄があります。先に銘柄登録するか、すべての行で銘柄を選択してください。",
      );
      return result;
    }

    const lines = draftRowsToHoldingInputs(drafts);
    if (lines.length !== drafts.length) {
      toast.error("保有明細の変換に失敗しました。");
      return result;
    }

    const assignments = buildAssetClassAssignments(drafts, assetClassBreakdown);
    if (assignments.length > 0) {
      setSubmitting(true);
      const weightsResponse = await applyMonexAssetClassWeights(portfolioCode, {
        assignments,
      });
      setSubmitting(false);
      if (!weightsResponse.ok) {
        toast.error(weightsResponse.message);
        return result;
      }
    }

    const saved = await saveSnapshot(
      lines,
      snapshot ? snapshotToMetricInputs(snapshot) : [],
      "保有明細と資産クラスを登録しました。",
    );
    if (saved) {
      setDrafts(null);
      setAssetClassBreakdown(new Map());
    }
    return result;
  }

  let result = (
    <div className="space-y-6">
      <MonexBulkImportPasteCard disabled={isBusy} onImport={handleImport} />

      {isDraftMode && unmatchedCandidates.length > 0 ? (
        <MonexUnmatchedInstrumentsPanel
          candidates={unmatchedCandidates}
          instruments={instruments}
          disabled={isBusy}
          onCreate={handleCreateUnmatchedInstrument}
        />
      ) : null}

      {isDraftMode ? (
        <>
          <Alert>
            <AlertTitle>下書き編集中</AlertTitle>
            <AlertDescription>
              取り込んだ明細はまだ登録されていません。内容を確認・編集して「一括登録」を押すと、登録済み明細をすべて置き換え、資産クラス按分も更新します。
              {hasUnmatched
                ? " 未割当がある場合は、上の候補から銘柄登録するか、下書きで銘柄を選択してください。"
                : null}
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>取り込み下書き一覧</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={handleCancelDraft}
                >
                  取り消し
                </Button>
                <Button
                  type="button"
                  disabled={isBusy || hasUnmatched}
                  onClick={() => {
                    void handleRegisterDraft();
                  }}
                >
                  一括登録
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {drafts ? (
                <MonexBulkImportDraftTable
                  drafts={drafts}
                  instruments={instruments}
                  disabled={isBusy}
                  onChange={setDrafts}
                />
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
  return result;
}
