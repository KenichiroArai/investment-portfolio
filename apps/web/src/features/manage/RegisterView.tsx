"use client";

import type { InstrumentListItemDto } from "@repo/shared";
import { useCallback, useEffect, useState } from "react";

import { FormSection } from "@/features/manage/FormSection";
import { ManageAsOfDateField } from "@/features/manage/ManageAsOfDateField";
import {
  listGenericMetricOptions,
  resolveGenericMetricLabel,
} from "@/features/manage/generic-metric-options";
import { ManageSubNav } from "@/features/manage/ManageSubNav";
import {
  buildReplaceSnapshotInput,
  mergeHoldingLine,
  snapshotToHoldingInputs,
  snapshotToMetricInputs,
  upsertMetric,
} from "@/features/manage/snapshot-input";
import { WritableGuard } from "@/features/manage/WritableGuard";
import {
  createInstrument,
  fetchClassificationSchemes,
  fetchCurrentSnapshot,
  fetchInstruments,
  replaceCurrentSnapshot,
  setInstrumentClassifications,
} from "@/lib/api-client";

type RegisterViewProps = {
  portfolioCode: string;
};

const SECTIONS = [
  { id: "instrument", label: "銘柄" },
  { id: "holding", label: "保有明細" },
  { id: "generic", label: "汎用指標" },
];

export function RegisterView({ portfolioCode }: RegisterViewProps) {
  const [activeSection, setActiveSection] = useState("instrument");
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [instrumentName, setInstrumentName] = useState("");
  const [tagValueIds, setTagValueIds] = useState<string[]>([]);
  const [schemeOptions, setSchemeOptions] = useState<
    Array<{ schemeName: string; values: Array<{ id: string; name: string }> }>
  >([]);
  const [holdingInstrumentId, setHoldingInstrumentId] = useState("");
  const [holdingQuantity, setHoldingQuantity] = useState("");
  const [holdingMarketValue, setHoldingMarketValue] = useState("");
  const [holdingAsOfDate, setHoldingAsOfDate] = useState("");
  const [metricCode, setMetricCode] = useState(
    listGenericMetricOptions()[0]?.code ?? "",
  );
  const [metricValue, setMetricValue] = useState("");

  const load = useCallback(async () => {
    let result: void = undefined;
    setLoading(true);
    setError(null);

    const [instrumentResponse, schemeResponse] = await Promise.all([
      fetchInstruments(),
      fetchClassificationSchemes(portfolioCode),
    ]);

    if (instrumentResponse.ok) {
      setInstruments(instrumentResponse.data);
      if (!holdingInstrumentId && instrumentResponse.data.length > 0) {
        setHoldingInstrumentId(instrumentResponse.data[0].id);
      }
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

    const snapshotResponse = await fetchCurrentSnapshot(portfolioCode);
    if (snapshotResponse.ok) {
      setHoldingAsOfDate(snapshotResponse.data.asOfDate);
    }

    setLoading(false);
    return result;
  }, [holdingInstrumentId, portfolioCode]);

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

  async function handleCreateInstrument(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await createInstrument({ name: instrumentName.trim() });
    if (!response.ok) {
      setSubmitting(false);
      setError(response.message);
      return result;
    }

    if (tagValueIds.length > 0) {
      const tagResponse = await setInstrumentClassifications(response.data.id, {
        classificationValueIds: tagValueIds,
      });
      if (!tagResponse.ok) {
        setSubmitting(false);
        setError(tagResponse.message);
        return result;
      }
    }

    setSubmitting(false);
    setInstrumentName("");
    setTagValueIds([]);
    setSuccess("銘柄を登録しました。");
    await load();
    return result;
  }

  async function handleAddHolding(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const quantity = Number.parseFloat(holdingQuantity);
    const marketValueMinor = Number.parseInt(holdingMarketValue, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setSubmitting(false);
      setError("数量は正の数で入力してください。");
      return result;
    }
    if (!Number.isInteger(marketValueMinor) || marketValueMinor < 0) {
      setSubmitting(false);
      setError("評価額は 0 以上の整数で入力してください。");
      return result;
    }

    const snapshotResponse = await fetchCurrentSnapshot(portfolioCode);
    const asOfDate =
      holdingAsOfDate.trim() ||
      (snapshotResponse.ok ? snapshotResponse.data.asOfDate : "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      setSubmitting(false);
      setError("操作対象の基準日を YYYY-MM-DD 形式で入力してください。");
      return result;
    }

    const existingLines = snapshotResponse.ok
      ? snapshotToHoldingInputs(snapshotResponse.data)
      : [];
    const existingMetrics = snapshotResponse.ok
      ? snapshotToMetricInputs(snapshotResponse.data)
      : [];

    const lines = mergeHoldingLine(existingLines, {
      instrumentId: holdingInstrumentId,
      quantity,
      marketValueMinor,
    });

    const putResponse = await replaceCurrentSnapshot(
      portfolioCode,
      buildReplaceSnapshotInput(snapshotResponse.ok ? snapshotResponse.data : null, {
        asOfDate,
        lines,
        metrics: existingMetrics,
      }),
    );
    setSubmitting(false);

    if (!putResponse.ok) {
      setError(putResponse.message);
      return result;
    }

    setHoldingQuantity("");
    setHoldingMarketValue("");
    setSuccess("保有明細を登録しました。");
    await load();
    return result;
  }

  async function handleAddMetric(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const integerValue = Number.parseInt(metricValue, 10);
    if (!Number.isInteger(integerValue)) {
      setSubmitting(false);
      setError("汎用値は整数で入力してください。");
      return result;
    }

    const snapshotResponse = await fetchCurrentSnapshot(portfolioCode);
    const asOfDate = snapshotResponse.ok
      ? snapshotResponse.data.asOfDate
      : holdingAsOfDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
      setSubmitting(false);
      setError("先に保有明細を登録するか、操作対象の基準日を設定してください。");
      return result;
    }

    const existingLines = snapshotResponse.ok
      ? snapshotToHoldingInputs(snapshotResponse.data)
      : [];
    const existingMetrics = snapshotResponse.ok
      ? snapshotToMetricInputs(snapshotResponse.data)
      : [];
    const metrics = upsertMetric(existingMetrics, {
      code: metricCode,
      integerValue,
    });

    const putResponse = await replaceCurrentSnapshot(
      portfolioCode,
      buildReplaceSnapshotInput(snapshotResponse.ok ? snapshotResponse.data : null, {
        asOfDate,
        lines: existingLines,
        metrics,
      }),
    );
    setSubmitting(false);

    if (!putResponse.ok) {
      setError(putResponse.message);
      return result;
    }

    setMetricValue("");
    setSuccess("汎用指標を登録しました。");
    await load();
    return result;
  }

  let result = (
    <main className="manage-page">
      <h1>登録（{portfolioCode}）</h1>
      <ManageAsOfDateField
        mode="editable"
        value={holdingAsOfDate}
        disabled={loading || submitting}
        onChange={setHoldingAsOfDate}
      />
      <ManageSubNav
        sections={SECTIONS}
        activeId={activeSection}
        onSelect={setActiveSection}
      />

      {loading ? <p>読み込み中…</p> : null}
      {error ? <p className="holdings-error">{error}</p> : null}
      {success ? <p className="manage-success">{success}</p> : null}

      <WritableGuard>
        {activeSection === "instrument" ? (
          <FormSection title="銘柄登録">
            <form className="manage-form" onSubmit={handleCreateInstrument}>
              <label>
                銘柄名
                <input
                  value={instrumentName}
                  onChange={(event) => {
                    setInstrumentName(event.target.value);
                  }}
                  required
                />
              </label>
              <fieldset className="manage-fieldset">
                <legend>分類タグ（任意）</legend>
                {schemeOptions.map((scheme) => {
                  let group = (
                    <div key={scheme.schemeName} className="manage-tag-group">
                      <p>{scheme.schemeName}</p>
                      {scheme.values.map((value) => {
                        let checkbox = (
                          <label key={value.id} className="manage-checkbox">
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
                  );
                  return group;
                })}
              </fieldset>
              <button type="submit" disabled={submitting}>
                銘柄を登録
              </button>
            </form>
          </FormSection>
        ) : null}

        {activeSection === "holding" ? (
          <FormSection title="保有明細登録">
            <form className="manage-form" onSubmit={handleAddHolding}>
              <label>
                銘柄
                <select
                  value={holdingInstrumentId}
                  onChange={(event) => {
                    setHoldingInstrumentId(event.target.value);
                  }}
                >
                  {instruments.map((instrument) => {
                    let option = (
                      <option key={instrument.id} value={instrument.id}>
                        {instrument.name}
                      </option>
                    );
                    return option;
                  })}
                </select>
              </label>
              <label>
                数量
                <input
                  type="number"
                  step="any"
                  value={holdingQuantity}
                  onChange={(event) => {
                    setHoldingQuantity(event.target.value);
                  }}
                  required
                />
              </label>
              <label>
                評価額（円）
                <input
                  type="number"
                  value={holdingMarketValue}
                  onChange={(event) => {
                    setHoldingMarketValue(event.target.value);
                  }}
                  required
                />
              </label>
              <button type="submit" disabled={submitting || !holdingInstrumentId}>
                明細行を追加
              </button>
            </form>
          </FormSection>
        ) : null}

        {activeSection === "generic" ? (
          <FormSection title="汎用指標登録">
            <form className="manage-form" onSubmit={handleAddMetric}>
              <label>
                汎用名
                <select
                  value={metricCode}
                  onChange={(event) => {
                    setMetricCode(event.target.value);
                  }}
                >
                  {listGenericMetricOptions().map((option) => {
                    let item = (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    );
                    return item;
                  })}
                </select>
              </label>
              <label>
                値（{resolveGenericMetricLabel(metricCode)}）
                <input
                  type="number"
                  value={metricValue}
                  onChange={(event) => {
                    setMetricValue(event.target.value);
                  }}
                  required
                />
              </label>
              <button type="submit" disabled={submitting}>
                汎用指標を登録
              </button>
            </form>
          </FormSection>
        ) : null}
      </WritableGuard>
    </main>
  );
  return result;
}
