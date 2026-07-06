"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/form-field";
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
import { PORTFOLIO_KIND_OPTIONS } from "@/features/manage/portfolio-kind-options";
import { WritableGuard } from "@/features/manage/WritableGuard";
import {
  createPortfolio,
  deletePortfolio,
  updatePortfolio,
} from "@/lib/api-client";
import type { PortfolioListItem } from "@/lib/data-source";
import { buildPortfolioPath } from "@/lib/portfolio-path";

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
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    setSubmitting(true);

    const response = await createPortfolio({
      code: createCode.trim(),
      name: createName.trim(),
      kind: createKind as "ideco" | "monex" | "nisa" | "taxable" | "satellite",
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setShowCreate(false);
    setCreateCode("");
    setCreateName("");
    setCreateKind("ideco");
    toast.success("口座を登録しました。");
    onChanged();
    router.push(buildPortfolioPath(response.data.code));
    return result;
  }

  async function handleUpdate(event: React.FormEvent) {
    let result: void = undefined;
    event.preventDefault();
    if (!editTarget) {
      return result;
    }

    setSubmitting(true);
    const response = await updatePortfolio(editTarget.code, {
      name: editTarget.name.trim(),
      kind: editTarget.kind as
        | "ideco"
        | "monex"
        | "nisa"
        | "taxable"
        | "satellite",
    });
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setEditTarget(null);
    toast.success("口座を更新しました。");
    onChanged();
    return result;
  }

  async function handleDelete() {
    let result: void = undefined;
    if (!deleteTarget) {
      return result;
    }

    setSubmitting(true);
    const response = await deletePortfolio(deleteTarget.code);
    setSubmitting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    setDeleteTarget(null);
    toast.success("口座を削除しました。");
    onChanged();
    return result;
  }

  let result = (
    <WritableGuard>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCreate(true);
          }}
        >
          <Plus className="h-4 w-4" />
          口座を追加
        </Button>
        {portfolios.map((portfolio) => {
          let actions = (
            <div key={portfolio.code} className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditTarget({
                    code: portfolio.code,
                    name: portfolio.name,
                    kind: portfolio.kind,
                  });
                }}
              >
                {portfolio.name}
              </Button>
            </div>
          );
          return actions;
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>口座を追加</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreate}>
            <FormField label="口座コード" htmlFor="create-code">
              <Input
                id="create-code"
                value={createCode}
                onChange={(event) => {
                  setCreateCode(event.target.value);
                }}
                required
                maxLength={64}
              />
            </FormField>
            <FormField label="口座名" htmlFor="create-name">
              <Input
                id="create-name"
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                }}
                required
                maxLength={256}
              />
            </FormField>
            <FormField label="口座種別" htmlFor="create-kind">
              <Select value={createKind} onValueChange={setCreateKind}>
                <SelectTrigger id="create-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTFOLIO_KIND_OPTIONS.map((option) => {
                    let item = (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    );
                    return item;
                  })}
                </SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                登録
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>口座設定（{editTarget?.code}）</DialogTitle>
          </DialogHeader>
          {editTarget ? (
            <form className="grid gap-4" onSubmit={handleUpdate}>
              <FormField label="口座名" htmlFor="edit-name">
                <Input
                  id="edit-name"
                  value={editTarget.name}
                  onChange={(event) => {
                    setEditTarget({ ...editTarget, name: event.target.value });
                  }}
                  required
                  maxLength={256}
                />
              </FormField>
              <FormField label="口座種別" htmlFor="edit-kind">
                <Select
                  value={editTarget.kind}
                  onValueChange={(value) => {
                    setEditTarget({ ...editTarget, kind: value });
                  }}
                >
                  <SelectTrigger id="edit-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTFOLIO_KIND_OPTIONS.map((option) => {
                      let item = (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      );
                      return item;
                    })}
                  </SelectContent>
                </Select>
              </FormField>
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={submitting}
                  onClick={() => {
                    setDeleteTarget(editTarget);
                  }}
                >
                  削除
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditTarget(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    更新
                  </Button>
                </div>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>口座を削除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `「${deleteTarget.name}」を削除します。関連する分類・スナップショットも削除されます。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void handleDelete();
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WritableGuard>
  );
  return result;
}
