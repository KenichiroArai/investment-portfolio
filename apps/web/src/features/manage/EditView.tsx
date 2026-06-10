"use client";

import type { CurrentSnapshotDto, InstrumentListItemDto } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/features/manage/ConfirmDialog";
import { FormSection } from "@/features/manage/FormSection";
import { ManageAsOfDateField } from "@/features/manage/ManageAsOfDateField";
import { resolveGenericMetricLabel } from "@/features/manage/generic-metric-options";
import { ManageSubNav } from "@/features/manage/ManageSubNav";
import {
  buildReplaceSnapshotInput,
  removeHoldingLineAtIndex,
  removeMetricByCode,
  snapshotToHoldingInputs,
  snapshotToMetricInputs,
  updateHoldingLineAtIndex,
  upsertMetric,
} from "@/features/manage/snapshot-input";
import { WritableGuard } from "@/features/manage/WritableGuard";
import {
  deleteInstrument,
  fetchCurrentSnapshot,
  fetchInstruments,
  replaceCurrentSnapshot,
  updateInstrument,
} from "@/lib/api-client";
import { formatYen } from "@/lib/format-yen";

type EditViewProps = {
  portfolioCode: string;
};

const SECTIONS = [
  { id: "holding", label: "保有明細" },
  { id: "instrument", label: "銘柄" },
  { id: "generic", label: "汎用指標" },
];

export function EditView({ portfolioCode }: EditViewProps) {
  const [activeSection, setActiveSection] = useState("holding");
  const [snapshot, setSnapshot] = useState<CurrentSnapshotDto | null>(null);
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteInstrumentId, setDeleteInstrumentId] = useState<string | null>(null);
  const [deleteMetricCode, setDeleteMetricCode] = useState<string | null>(null);
  const [deleteLineIndex, setDeleteLineIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    let result: void = undefined;
    setLoading(true);
    setError(null);

    const [snapshotResponse, instrumentResponse] = await Promise.all([
      fetchCurrentSnapshot(portfolioCode),
      fetchInstruments(),
    ]);

    if (snapshotResponse.ok) {
      setSnapshot(snapshotResponse.data);
    } else if (snapshotResponse.status === 404) {
      setSnapshot(null);
    } else {
      setError(snapshotResponse.message);
    }

    if (instrumentResponse.ok) {
      setInstruments(instrumentResponse.data);
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

  async function saveSnapshot(
    lines: ReturnType<typeof snapshotToHoldingInputs>,
    metrics: ReturnType<typeof snapshotToMetricInputs>,
  ) {
    let result = false;

    if (!snapshot) {
      setError("更新対象のスナップショットがありません。");
      return result;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await replaceCurrentSnapshot(
      portfolioCode,
      buildReplaceSnapshotInput(snapshot, {
        asOfDate: snapshot.asOfDate,
        lines,
        metrics,
      }),
    );
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setSuccess("保存しました。");
    await load();
    result = true;
    return result;
  }

  async function handleDeleteLine() {
    let result: void = undefined;
    if (!snapshot || deleteLineIndex === null) {
      return result;
    }

    const lines = removeHoldingLineAtIndex(
      snapshotToHoldingInputs(snapshot),
      deleteLineIndex,
    );
    const saved = await saveSnapshot(lines, snapshotToMetricInputs(snapshot));
    if (saved) {
      setDeleteLineIndex(null);
    }
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
    const saved = await saveSnapshot(snapshotToHoldingInputs(snapshot), metrics);
    if (saved) {
      setDeleteMetricCode(null);
    }
    return result;
  }

  async function handleUpdateInstrument(
    instrumentId: string,
    name: string,
  ) {
    let result: void = undefined;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await updateInstrument(instrumentId, { name: name.trim() });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setSuccess("銘柄を更新しました。");
    await load();
    return result;
  }

  async function handleDeleteInstrument() {
    let result: void = undefined;
    if (!deleteInstrumentId) {
      return result;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await deleteInstrument(deleteInstrumentId);
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setDeleteInstrumentId(null);
    setSuccess("銘柄を削除しました。");
    await load();
    return result;
  }

  let result = (
    <main className="manage-page">
      <h1>更新（{portfolioCode}）</h1>
      {snapshot ? (
        <ManageAsOfDateField mode="readonly" value={snapshot.asOfDate} />
      ) : null}
      <ManageSubNav
        sections={SECTIONS}
        activeId={activeSection}
        onSelect={setActiveSection}
      />

      {loading ? <p>読み込み中…</p> : null}
      {error ? <p className="holdings-error">{error}</p> : null}
      {success ? <p className="manage-success">{success}</p> : null}

      <WritableGuard>
        {activeSection === "holding" ? (
          <FormSection title="保有明細の更新・削除">
            {!snapshot ? (
              <p className="note">更新対象のスナップショットがありません。</p>
            ) : (
              <ul className="manage-list">
                {snapshot.lines.map((line, index) => {
                  let item = (
                    <li key={line.id}>
                      <HoldingLineEditForm
                        instrumentName={line.instrumentName}
                        initialQuantity={line.quantity}
                        initialMarketValueMinor={line.marketValueMinor}
                        disabled={submitting}
                        onSave={async (quantity, marketValueMinor) => {
                          const lines = updateHoldingLineAtIndex(
                            snapshotToHoldingInputs(snapshot),
                            index,
                            {
                              instrumentId: line.instrumentId,
                              quantity,
                              marketValueMinor,
                              bookValueMinor: line.bookValueMinor,
                              sortOrder: line.sortOrder,
                            },
                          );
                          await saveSnapshot(
                            lines,
                            snapshotToMetricInputs(snapshot),
                          );
                        }}
                      />
                      <button
                        type="button"
                        className="manage-dialog__danger"
                        onClick={() => {
                          setDeleteLineIndex(index);
                        }}
                      >
                        削除
                      </button>
                    </li>
                  );
                  return item;
                })}
              </ul>
            )}
          </FormSection>
        ) : null}

        {activeSection === "instrument" ? (
          <FormSection title="銘柄の更新・削除">
            {instruments.length === 0 ? (
              <p className="note">銘柄がありません。</p>
            ) : (
              <ul className="manage-list">
                {instruments.map((instrument) => {
                  let item = (
                    <li key={instrument.id}>
                      <InstrumentEditForm
                        initialName={instrument.name}
                        disabled={submitting}
                        onSave={(name) => {
                          void handleUpdateInstrument(instrument.id, name);
                        }}
                      />
                      <button
                        type="button"
                        className="manage-dialog__danger"
                        onClick={() => {
                          setDeleteInstrumentId(instrument.id);
                        }}
                      >
                        削除
                      </button>
                    </li>
                  );
                  return item;
                })}
              </ul>
            )}
          </FormSection>
        ) : null}

        {activeSection === "generic" ? (
          <FormSection title="汎用指標の更新・削除">
            {!snapshot || snapshot.metrics.length === 0 ? (
              <p className="note">汎用指標がありません。</p>
            ) : (
              <ul className="manage-list">
                {snapshot.metrics.map((metric) => {
                  let item = (
                    <li key={metric.code}>
                      <span>{resolveGenericMetricLabel(metric.code)}</span>
                      <MetricEditForm
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
                          );
                        }}
                      />
                      <span className="manage-meta">
                        現在: {formatYen(metric.integerValue ?? 0)}
                      </span>
                      <button
                        type="button"
                        className="manage-dialog__danger"
                        onClick={() => {
                          setDeleteMetricCode(metric.code);
                        }}
                      >
                        削除
                      </button>
                    </li>
                  );
                  return item;
                })}
              </ul>
            )}
          </FormSection>
        ) : null}

        <ConfirmDialog
          open={deleteLineIndex !== null}
          title="明細行を削除"
          message="この保有明細行を削除します。"
          onConfirm={() => {
            void handleDeleteLine();
          }}
          onCancel={() => {
            setDeleteLineIndex(null);
          }}
        />

        <ConfirmDialog
          open={deleteInstrumentId !== null}
          title="銘柄を削除"
          message="この銘柄を削除します。保有明細で使用中の場合は削除できません。"
          onConfirm={() => {
            void handleDeleteInstrument();
          }}
          onCancel={() => {
            setDeleteInstrumentId(null);
          }}
        />

        <ConfirmDialog
          open={deleteMetricCode !== null}
          title="汎用指標を削除"
          message="この汎用指標を削除します。"
          onConfirm={() => {
            void handleDeleteMetric();
          }}
          onCancel={() => {
            setDeleteMetricCode(null);
          }}
        />
      </WritableGuard>
    </main>
  );
  return result;
}

type HoldingLineEditFormProps = {
  instrumentName: string;
  initialQuantity: number;
  initialMarketValueMinor: number;
  disabled: boolean;
  onSave: (quantity: number, marketValueMinor: number) => void;
};

function HoldingLineEditForm({
  instrumentName,
  initialQuantity,
  initialMarketValueMinor,
  disabled,
  onSave,
}: HoldingLineEditFormProps) {
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [marketValueMinor, setMarketValueMinor] = useState(
    String(initialMarketValueMinor),
  );

  let result = (
    <form
      className="manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(
          Number.parseFloat(quantity),
          Number.parseInt(marketValueMinor, 10),
        );
      }}
    >
      <span>{instrumentName}</span>
      <input
        type="number"
        step="any"
        value={quantity}
        onChange={(event) => {
          setQuantity(event.target.value);
        }}
      />
      <input
        type="number"
        value={marketValueMinor}
        onChange={(event) => {
          setMarketValueMinor(event.target.value);
        }}
      />
      <button type="submit" disabled={disabled}>
        更新
      </button>
    </form>
  );
  return result;
}

type InstrumentEditFormProps = {
  initialName: string;
  disabled: boolean;
  onSave: (name: string) => void;
};

function InstrumentEditForm({
  initialName,
  disabled,
  onSave,
}: InstrumentEditFormProps) {
  const [name, setName] = useState(initialName);

  let result = (
    <form
      className="manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(name);
      }}
    >
      <input
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        required
      />
      <button type="submit" disabled={disabled}>
        更新
      </button>
    </form>
  );
  return result;
}

type MetricEditFormProps = {
  initialValue: number;
  disabled: boolean;
  onSave: (value: number) => void;
};

function MetricEditForm({ initialValue, disabled, onSave }: MetricEditFormProps) {
  const [value, setValue] = useState(String(initialValue));

  let result = (
    <form
      className="manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(Number.parseInt(value, 10));
      }}
    >
      <input
        type="number"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <button type="submit" disabled={disabled}>
        更新
      </button>
    </form>
  );
  return result;
}
