"use client";

import type { BackupImportMode, BackupImportPreview } from "@repo/shared";
import { Download, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { downloadBackupZip, importBackupZip, previewBackupImport } from "@/lib/api-client";

type BackupPanelProps = {
  scope: "all" | "portfolio";
  portfolioCode?: string;
  onImported?: () => void;
};

type BackupImportSummary = {
  tables: BackupImportPreview["tables"];
  warnings: string[];
};

function triggerBlobDownload(blob: Blob, filename: string): void {
  let result: void = undefined;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return result;
}

export function BackupPanel({ scope, portfolioCode, onImported }: BackupPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<BackupImportMode>("merge");
  const [preview, setPreview] = useState<BackupImportSummary | null>(null);
  const [exporting, setExporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const scopeLabel = scope === "all" ? "全口座" : `口座 ${portfolioCode ?? ""}`;
  const replaceConfirmToken = scope === "all" ? "REPLACE-ALL" : "REPLACE";

  const handleExport = useCallback(async () => {
    let result: void = undefined;
    setExporting(true);

    const response = await downloadBackupZip(scope, portfolioCode);
    if (!response.ok) {
      toast.error(response.message);
      setExporting(false);
      return result;
    }

    triggerBlobDownload(response.blob, response.filename);
    toast.success("バックアップ ZIP をダウンロードしました。");
    setExporting(false);
    return result;
  }, [portfolioCode, scope]);

  const handlePreview = useCallback(async () => {
    let result: void = undefined;

    if (!selectedFile) {
      toast.error("ZIP ファイルを選択してください。");
      return result;
    }

    setPreviewing(true);
    const response = await previewBackupImport(scope, selectedFile, mode, portfolioCode);
    setPreviewing(false);

    if (!response.ok) {
      toast.error(response.message);
      setPreview(null);
      return result;
    }

    setPreview({
      tables: response.data.tables,
      warnings: response.data.warnings,
    });
    return result;
  }, [mode, portfolioCode, scope, selectedFile]);

  const runImport = useCallback(async () => {
    let result: void = undefined;

    if (!selectedFile) {
      toast.error("ZIP ファイルを選択してください。");
      return result;
    }

    setImporting(true);
    const response = await importBackupZip(scope, selectedFile, mode, portfolioCode);
    setImporting(false);

    if (!response.ok) {
      toast.error(response.message);
      return result;
    }

    toast.success("バックアップをインポートしました。");
    setPreview({
      tables: response.data.tables,
      warnings: [],
    });
    setSelectedFile(null);
    setConfirmOpen(false);
    setConfirmText("");

    if (onImported) {
      onImported();
    }

    return result;
  }, [mode, onImported, portfolioCode, scope, selectedFile]);

  const handleImportClick = useCallback(() => {
    let result: void = undefined;

    if (!selectedFile) {
      toast.error("ZIP ファイルを選択してください。");
      return result;
    }

    if (mode === "replace") {
      setConfirmOpen(true);
      return result;
    }

    void runImport();
    return result;
  }, [mode, runImport, selectedFile]);

  let result = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>エクスポート</CardTitle>
          <CardDescription>
            {scopeLabel} の DB データをテーブルごとの CSV にまとめた ZIP をダウンロードします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" disabled={exporting} onClick={() => void handleExport()}>
            <Download className="h-4 w-4" />
            ZIP をダウンロード
          </Button>
          {scope === "all" ? (
            <p className="text-sm text-muted-foreground">
              GitHub Pages の静的公開を更新する場合は、インポート後に `npm run pages:export` を実行してください。
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>インポート</CardTitle>
          <CardDescription>
            エクスポートと同じ形式の ZIP を取り込みます。事前にプレビューで差分を確認できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid max-w-lg gap-4">
            <div className="grid gap-2">
              <Label htmlFor="backup-file">ZIP ファイル</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setPreview(null);
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="backup-mode">インポートモード</Label>
              <Select
                value={mode}
                onValueChange={(value) => {
                  setMode(value as BackupImportMode);
                  setPreview(null);
                }}
              >
                <SelectTrigger id="backup-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">上書き・追加（既存データを保持）</SelectItem>
                  <SelectItem value="replace">全置き換え（スコープ内を削除してから投入）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedFile || previewing || importing}
              onClick={() => void handlePreview()}
            >
              プレビュー
            </Button>
            <Button
              type="button"
              disabled={!selectedFile || previewing || importing}
              onClick={handleImportClick}
            >
              <Upload className="h-4 w-4" />
              インポート
            </Button>
          </div>

          {preview ? (
            <div className="space-y-3">
              {preview.warnings.length > 0 ? (
                <Alert>
                  <AlertTitle>確認</AlertTitle>
                  <AlertDescription>{preview.warnings.join(" ")}</AlertDescription>
                </Alert>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テーブル</TableHead>
                    <TableHead className="text-right">新規</TableHead>
                    <TableHead className="text-right">更新</TableHead>
                    <TableHead className="text-right">削除</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.tables.map((table) => {
                    let row = (
                      <TableRow key={table.table}>
                        <TableCell>{table.table}</TableCell>
                        <TableCell className="text-right">{table.insert}</TableCell>
                        <TableCell className="text-right">{table.update}</TableCell>
                        <TableCell className="text-right">{table.delete}</TableCell>
                      </TableRow>
                    );
                    return row;
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>全置き換えの確認</AlertDialogTitle>
            <AlertDialogDescription>
              {scope === "all"
                ? "全口座の既存データを削除してから ZIP の内容で置き換えます。この操作は元に戻せません。"
                : `口座 ${portfolioCode ?? ""} の既存データを削除してから ZIP の内容で置き換えます。この操作は元に戻せません。`}
              {" "}
              続行するには `{replaceConfirmToken}` と入力してください。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(event) => {
              setConfirmText(event.target.value);
            }}
            placeholder={replaceConfirmToken}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={confirmText !== replaceConfirmToken || importing}
              onClick={() => {
                void runImport();
              }}
            >
              全置き換えを実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
  return result;
}
