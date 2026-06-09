"use client";

import type {
  ClassificationSchemeWithValuesDto,
  InstrumentListItemDto,
} from "@repo/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/features/manage/ConfirmDialog";
import { FormSection } from "@/features/manage/FormSection";
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

type AnalysisSettingsViewProps = {
  portfolioCode: string;
};

export function AnalysisSettingsView({ portfolioCode }: AnalysisSettingsViewProps) {
  const [schemes, setSchemes] = useState<ClassificationSchemeWithValuesDto[]>([]);
  const [instruments, setInstruments] = useState<InstrumentListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);

    const [schemeResponse, instrumentResponse] = await Promise.all([
      fetchClassificationSchemes(portfolioCode),
      fetchInstruments(),
    ]);

    if (!schemeResponse.ok) {
      setError(schemeResponse.message);
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
    setError(null);

    const response = await createClassificationScheme(portfolioCode, {
      code: schemeCode.trim(),
      name: schemeName.trim(),
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setSchemeCode("");
    setSchemeName("");
    await load();
    return result;
  }

  async function handleRenameScheme(schemeId: string, name: string) {
    let result: void = undefined;
    setSubmitting(true);
    setError(null);

    const response = await updateClassificationScheme(schemeId, { name: name.trim() });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    await load();
    return result;
  }

  async function handleDeleteScheme() {
    let result: void = undefined;
    if (!deleteSchemeId) {
      return result;
    }

    setSubmitting(true);
    setError(null);

    const response = await deleteClassificationScheme(deleteSchemeId);
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setDeleteSchemeId(null);
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
    setError(null);

    const response = await createClassificationValue(valueSchemeId, {
      code: valueCode.trim(),
      name: valueName.trim(),
      sortOrder: Number.parseInt(valueSortOrder, 10) || 0,
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setValueCode("");
    setValueName("");
    setValueSortOrder("0");
    await load();
    return result;
  }

  async function handleUpdateValue(
    valueId: string,
    name: string,
    sortOrder: number,
  ) {
    let result: void = undefined;
    setSubmitting(true);
    setError(null);

    const response = await updateClassificationValue(valueId, { name, sortOrder });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    await load();
    return result;
  }

  async function handleDeleteValue() {
    let result: void = undefined;
    if (!deleteValueId) {
      return result;
    }

    setSubmitting(true);
    setError(null);

    const response = await deleteClassificationValue(deleteValueId);
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setDeleteValueId(null);
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
    setError(null);

    const response = await setInstrumentClassifications(tagInstrumentId, {
      classificationValueIds: tagValueIds,
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    await load();
    return result;
  }

  let result = (
    <main className="manage-page">
      <h1>分析設定（{portfolioCode}）</h1>
      <p>
        <Link href={`/portfolios/${portfolioCode}/analysis/`}>資産配分表示へ戻る</Link>
      </p>

      {loading ? <p>読み込み中…</p> : null}
      {error ? <p className="holdings-error">{error}</p> : null}

      <WritableGuard>
        <FormSection title="分析軸">
          <form className="manage-form" onSubmit={handleCreateScheme}>
            <label>
              軸コード
              <input
                value={schemeCode}
                onChange={(event) => {
                  setSchemeCode(event.target.value);
                }}
                required
              />
            </label>
            <label>
              軸名
              <input
                value={schemeName}
                onChange={(event) => {
                  setSchemeName(event.target.value);
                }}
                required
              />
            </label>
            <button type="submit" disabled={submitting}>
              軸を追加
            </button>
          </form>

          {schemes.length === 0 ? (
            <p className="note">分析軸が未登録です。</p>
          ) : (
            <ul className="manage-list">
              {schemes.map((scheme) => {
                let item = (
                  <li key={scheme.id}>
                    <span>
                      {scheme.name}（{scheme.code}）
                    </span>
                    <SchemeRenameForm
                      initialName={scheme.name}
                      disabled={submitting}
                      onSave={(name) => {
                        void handleRenameScheme(scheme.id, name);
                      }}
                    />
                    <button
                      type="button"
                      className="manage-dialog__danger"
                      onClick={() => {
                        setDeleteSchemeId(scheme.id);
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

        <FormSection title="カテゴリ値">
          <form className="manage-form" onSubmit={handleCreateValue}>
            <label>
              分析軸
              <select
                value={valueSchemeId}
                onChange={(event) => {
                  setValueSchemeId(event.target.value);
                }}
              >
                {schemes.map((scheme) => {
                  let option = (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  );
                  return option;
                })}
              </select>
            </label>
            <label>
              値コード
              <input
                value={valueCode}
                onChange={(event) => {
                  setValueCode(event.target.value);
                }}
                required
              />
            </label>
            <label>
              値名
              <input
                value={valueName}
                onChange={(event) => {
                  setValueName(event.target.value);
                }}
                required
              />
            </label>
            <label>
              表示順
              <input
                type="number"
                value={valueSortOrder}
                onChange={(event) => {
                  setValueSortOrder(event.target.value);
                }}
              />
            </label>
            <button type="submit" disabled={submitting || schemes.length === 0}>
              値を追加
            </button>
          </form>

          {schemes.map((scheme) => {
            let block = (
              <div key={scheme.id} className="manage-subblock">
                <h3>{scheme.name}</h3>
                {scheme.values.length === 0 ? (
                  <p className="note">値がありません。</p>
                ) : (
                  <ul className="manage-list">
                    {scheme.values.map((value) => {
                      let item = (
                        <li key={value.id}>
                          <ValueEditForm
                            initialName={value.name}
                            initialSortOrder={value.sortOrder}
                            disabled={submitting}
                            onSave={(name, sortOrder) => {
                              void handleUpdateValue(value.id, name, sortOrder);
                            }}
                          />
                          <span className="manage-meta">（{value.code}）</span>
                          <button
                            type="button"
                            className="manage-dialog__danger"
                            onClick={() => {
                              setDeleteValueId(value.id);
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
              </div>
            );
            return block;
          })}
        </FormSection>

        <FormSection title="銘柄タグ">
          <form className="manage-form" onSubmit={handleSetTags}>
            <label>
              銘柄
              <select
                value={tagInstrumentId}
                onChange={(event) => {
                  setTagInstrumentId(event.target.value);
                  setTagValueIds([]);
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
            <fieldset className="manage-fieldset">
              <legend>分類値（複数選択可）</legend>
              {schemes.map((scheme) => {
                let group = (
                  <div key={scheme.id} className="manage-tag-group">
                    <p>{scheme.name}</p>
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
            <button type="submit" disabled={submitting || !tagInstrumentId}>
              タグを保存
            </button>
          </form>
        </FormSection>

        <ConfirmDialog
          open={deleteSchemeId !== null}
          title="分析軸を削除"
          message="この分析軸と配下のカテゴリ値を削除します。"
          onConfirm={() => {
            void handleDeleteScheme();
          }}
          onCancel={() => {
            setDeleteSchemeId(null);
          }}
        />

        <ConfirmDialog
          open={deleteValueId !== null}
          title="カテゴリ値を削除"
          message="このカテゴリ値を削除します。"
          onConfirm={() => {
            void handleDeleteValue();
          }}
          onCancel={() => {
            setDeleteValueId(null);
          }}
        />
      </WritableGuard>
    </main>
  );
  return result;
}

type SchemeRenameFormProps = {
  initialName: string;
  disabled: boolean;
  onSave: (name: string) => void;
};

function SchemeRenameForm({
  initialName,
  disabled,
  onSave,
}: SchemeRenameFormProps) {
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
        名称更新
      </button>
    </form>
  );
  return result;
}

type ValueEditFormProps = {
  initialName: string;
  initialSortOrder: number;
  disabled: boolean;
  onSave: (name: string, sortOrder: number) => void;
};

function ValueEditForm({
  initialName,
  initialSortOrder,
  disabled,
  onSave,
}: ValueEditFormProps) {
  const [name, setName] = useState(initialName);
  const [sortOrder, setSortOrder] = useState(String(initialSortOrder));

  let result = (
    <form
      className="manage-inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(name, Number.parseInt(sortOrder, 10) || 0);
      }}
    >
      <input
        value={name}
        onChange={(event) => {
          setName(event.target.value);
        }}
        required
      />
      <input
        type="number"
        value={sortOrder}
        onChange={(event) => {
          setSortOrder(event.target.value);
        }}
      />
      <button type="submit" disabled={disabled}>
        更新
      </button>
    </form>
  );
  return result;
}
