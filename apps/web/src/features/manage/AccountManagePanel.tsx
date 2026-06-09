"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/features/manage/ConfirmDialog";
import { PORTFOLIO_KIND_OPTIONS } from "@/features/manage/portfolio-kind-options";
import { WritableGuard } from "@/features/manage/WritableGuard";
import {
  createPortfolio,
  deletePortfolio,
  updatePortfolio,
} from "@/lib/api-client";
import type { PortfolioListItem } from "@/lib/data-source";

type AccountManagePanelProps = {
  portfolios: PortfolioListItem[];
  onChanged: () => void;
};

type EditTarget = {
  code: string;
  name: string;
  kind: string;
};

export function AccountManagePanel({
  portfolios,
  onChanged,
}: AccountManagePanelProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");
  const [createKind, setCreateKind] = useState("ideco");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EditTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await createPortfolio({
      code: createCode.trim(),
      name: createName.trim(),
      kind: createKind as "ideco" | "nisa" | "taxable" | "satellite",
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setShowCreate(false);
    setCreateCode("");
    setCreateName("");
    setCreateKind("ideco");
    onChanged();
    router.push(`/portfolios/${response.data.code}/`);
    return result;
  }

  async function handleUpdate(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    if (!editTarget) {
      return result;
    }

    setSubmitting(true);
    setError(null);

    const response = await updatePortfolio(editTarget.code, {
      name: editTarget.name.trim(),
      kind: editTarget.kind as "ideco" | "nisa" | "taxable" | "satellite",
    });
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setEditTarget(null);
    onChanged();
    return result;
  }

  async function handleDelete() {
    let result: void = undefined;
    if (!deleteTarget) {
      return result;
    }

    setSubmitting(true);
    setError(null);

    const response = await deletePortfolio(deleteTarget.code);
    setSubmitting(false);

    if (!response.ok) {
      setError(response.message);
      return result;
    }

    setDeleteTarget(null);
    onChanged();
    return result;
  }

  let result = (
    <WritableGuard>
      <div className="manage-actions">
        <button
          type="button"
          onClick={() => {
            setShowCreate((value) => !value);
          }}
        >
          口座を追加
        </button>
      </div>

      {error ? <p className="holdings-error">{error}</p> : null}

      {showCreate ? (
        <form className="manage-form" onSubmit={handleCreate}>
          <h3>口座を追加</h3>
          <label>
            口座コード
            <input
              value={createCode}
              onChange={(event) => {
                setCreateCode(event.target.value);
              }}
              required
              maxLength={64}
            />
          </label>
          <label>
            口座名
            <input
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value);
              }}
              required
              maxLength={256}
            />
          </label>
          <label>
            口座種別
            <select
              value={createKind}
              onChange={(event) => {
                setCreateKind(event.target.value);
              }}
            >
              {PORTFOLIO_KIND_OPTIONS.map((option) => {
                let item = (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
                return item;
              })}
            </select>
          </label>
          <button type="submit" disabled={submitting}>
            登録
          </button>
        </form>
      ) : null}

      {portfolios.length > 0 ? (
        <ul className="manage-account-list">
          {portfolios.map((portfolio) => {
            let item = (
              <li key={portfolio.code}>
                <span>
                  {portfolio.name}（{portfolio.code}）
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditTarget({
                      code: portfolio.code,
                      name: portfolio.name,
                      kind: portfolio.kind,
                    });
                  }}
                >
                  設定
                </button>
                <button
                  type="button"
                  className="manage-dialog__danger"
                  onClick={() => {
                    setDeleteTarget({
                      code: portfolio.code,
                      name: portfolio.name,
                      kind: portfolio.kind,
                    });
                  }}
                >
                  削除
                </button>
              </li>
            );
            return item;
          })}
        </ul>
      ) : null}

      {editTarget ? (
        <form className="manage-form" onSubmit={handleUpdate}>
          <h3>口座設定（{editTarget.code}）</h3>
          <label>
            口座名
            <input
              value={editTarget.name}
              onChange={(event) => {
                setEditTarget({ ...editTarget, name: event.target.value });
              }}
              required
              maxLength={256}
            />
          </label>
          <label>
            口座種別
            <select
              value={editTarget.kind}
              onChange={(event) => {
                setEditTarget({ ...editTarget, kind: event.target.value });
              }}
            >
              {PORTFOLIO_KIND_OPTIONS.map((option) => {
                let item = (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
                return item;
              })}
            </select>
          </label>
          <div className="manage-form__actions">
            <button type="submit" disabled={submitting}>
              更新
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
              }}
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="口座を削除"
        message={
          deleteTarget
            ? `「${deleteTarget.name}」を削除します。関連する分類・スナップショットも削除されます。`
            : ""
        }
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => {
          setDeleteTarget(null);
        }}
      />
    </WritableGuard>
  );
  return result;
}
