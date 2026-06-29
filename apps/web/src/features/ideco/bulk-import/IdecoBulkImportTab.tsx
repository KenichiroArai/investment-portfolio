"use client";

import type { CurrentSnapshotDto, HoldingLineInput, PortfolioSnapshotMetricInput } from "@repo/shared";
import { IdecoCsvError, parseIdecoHoldingsPaste } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildReplaceSnapshotInput,
  snapshotToMetricInputs,
} from "@/features/manage/snapshot-input";
import { fetchCurrentSnapshot, replaceCurrentSnapshot } from "@/lib/api-client";

import { fetchPasteInstruments } from "./fetch-paste-instruments";
import { IdecoBulkImportDraftTable } from "./IdecoBulkImportDraftTable";
import { IdecoBulkImportPasteCard } from "./IdecoBulkImportPasteCard";
import {
  draftRowsToHoldingInputs,
  hasUnmatchedDraftRows,
  pasteRowsToDrafts,
} from "./holding-draft";
import type { IdecoHoldingDraftRow, PasteInstrumentDto } from "./types";

type IdecoBulkImportTabProps = {
  portfolioCode: string;
  asOfDate: string;
  disabled: boolean;
  onReload: () => Promise<void>;
};

export function IdecoBulkImportTab({
  portfolioCode,
  asOfDate,
  disabled,
  onReload,
}: IdecoBulkImportTabProps) {
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [instruments, setInstruments] = useState<PasteInstrumentDto[]>([]);
  const [drafts, setDrafts] = useState<IdecoHoldingDraftRow[] | null>(null);
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
      const parsed = parseIdecoHoldingsPaste(pasteText);
      const nextDrafts = pasteRowsToDrafts(parsed.rows, instruments);
      setDrafts(nextDrafts);

      if (hasUnmatchedDraftRows(nextDrafts)) {
        toast.warning("一部の銘柄を自動マッチできませんでした。銘柄を選択してください。");
      } else {
        toast.success(`${nextDrafts.length} 件の明細を取り込みました。`);
      }
    } catch (error) {
      if (error instanceof IdecoCsvError) {
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
    return result;
  }

  async function handleRegisterDraft() {
    let result: void = undefined;

    if (!drafts || drafts.length === 0) {
      return result;
    }

    if (hasUnmatchedDraftRows(drafts)) {
      toast.error("未割当の銘柄があります。すべての行で銘柄を選択してください。");
      return result;
    }

    const lines = draftRowsToHoldingInputs(drafts);
    if (lines.length !== drafts.length) {
      toast.error("保有明細の変換に失敗しました。");
      return result;
    }

    const saved = await saveSnapshot(
      lines,
      snapshot ? snapshotToMetricInputs(snapshot) : [],
      "保有明細を登録しました。",
    );
    if (saved) {
      setDrafts(null);
    }
    return result;
  }

  let result = (
    <div className="space-y-6">
      <IdecoBulkImportPasteCard disabled={isBusy} onImport={handleImport} />

      {isDraftMode ? (
        <>
          <Alert>
            <AlertTitle>下書き編集中</AlertTitle>
            <AlertDescription>
              取り込んだ明細はまだ登録されていません。内容を確認・編集して「一括登録」を押すと、登録済み明細をすべて置き換えます。
              {hasUnmatched ? " 未割当の銘柄がある行は赤枠で表示されます。" : null}
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
                <IdecoBulkImportDraftTable
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
