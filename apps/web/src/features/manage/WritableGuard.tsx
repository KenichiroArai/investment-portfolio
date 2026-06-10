"use client";

import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isWritableDataSource } from "@/lib/api-client";

type WritableGuardProps = {
  children: ReactNode;
};

export function WritableGuard({ children }: WritableGuardProps) {
  let result: ReactNode = null;

  if (!isWritableDataSource()) {
    result = (
      <Alert role="status">
        <AlertTitle>読み取り専用</AlertTitle>
        <AlertDescription>
          編集はローカル開発環境（API 接続時）でのみ可能です。本番サイトは読み取り専用です。
        </AlertDescription>
      </Alert>
    );
    return result;
  }

  result = children;
  return result;
}
