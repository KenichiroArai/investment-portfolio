"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  findSimilarInstruments,
  filterInstrumentsByQuery,
  sourceLabel,
  type UnmatchedInstrumentCandidate,
} from "./holding-draft";
import type { PasteInstrumentDto } from "./types";

type SbiWrapUnmatchedInstrumentsPanelProps = {
  candidates: UnmatchedInstrumentCandidate[];
  instruments: PasteInstrumentDto[];
  disabled: boolean;
  onCreate: (candidate: UnmatchedInstrumentCandidate) => Promise<void>;
};

export function SbiWrapUnmatchedInstrumentsPanel({
  candidates,
  instruments,
  disabled,
  onCreate,
}: SbiWrapUnmatchedInstrumentsPanelProps) {
  const [query, setQuery] = useState("");
  const [creatingName, setCreatingName] = useState<string | null>(null);

  const filteredInstruments = useMemo(() => {
    let result = filterInstrumentsByQuery(instruments, query);
    return result;
  }, [instruments, query]);

  if (candidates.length === 0) {
    let emptyResult = null;
    return emptyResult;
  }

  let result = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>未マッチ銘柄の登録</CardTitle>
          <CardDescription>
            既存マスタに無い銘柄です。先に登録すると下書きへ自動で割り当てられます。表記ゆれの可能性がある場合は右の一覧で確認してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.map((candidate) => {
            const similar = findSimilarInstruments(instruments, candidate.instrumentName);
            const candidateKey = `${candidate.instrumentName}:${candidate.accountId}`;
            let row = (
              <div
                key={candidateKey}
                className="space-y-2 rounded-md border border-border p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {sourceLabel(candidate.source)}
                      {` / ${candidate.productName}`}
                    </p>
                    <p className="text-sm font-medium leading-snug">
                      {candidate.instrumentName}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled || creatingName !== null}
                    onClick={() => {
                      void (async () => {
                        setCreatingName(candidateKey);
                        await onCreate(candidate);
                        setCreatingName(null);
                      })();
                    }}
                  >
                    {creatingName === candidateKey ? "登録中…" : "銘柄を登録"}
                  </Button>
                </div>
                {similar.length > 0 ? (
                  <div className="space-y-1 rounded-md bg-muted/40 p-2">
                    <p className="text-xs text-muted-foreground">既存の近い名称</p>
                    <ul className="space-y-1">
                      {similar.map((instrument) => {
                        let item = (
                          <li key={instrument.id} className="text-xs leading-snug">
                            {instrument.name}
                            {instrument.accountId
                              ? ` [${instrument.accountId.replace(/^sbi-wrap:/, "")}]`
                              : ""}
                          </li>
                        );
                        return item;
                      })}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">近い既存銘柄はありません。</p>
                )}
              </div>
            );
            return row;
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>既存銘柄を検索</CardTitle>
          <CardDescription>
            文言違いでマッチしていない可能性を確認できます。検索して名称を見比べてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={query}
            disabled={disabled}
            placeholder="銘柄名・商品で検索"
            aria-label="既存銘柄の検索"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          <div className="max-h-80 overflow-y-auto rounded-md border border-border">
            {filteredInstruments.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">該当する銘柄がありません。</p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredInstruments.map((instrument) => {
                  let item = (
                    <li key={instrument.id} className="px-3 py-2 text-sm leading-snug">
                      {instrument.name}
                      {instrument.accountId
                        ? ` [${instrument.accountId.replace(/^sbi-wrap:/, "")}]`
                        : ""}
                    </li>
                  );
                  return item;
                })}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredInstruments.length} / {instruments.length} 件
          </p>
        </CardContent>
      </Card>
    </div>
  );
  return result;
}
