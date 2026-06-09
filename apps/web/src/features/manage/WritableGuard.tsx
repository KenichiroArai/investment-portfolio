"use client";

import type { ReactNode } from "react";

import { isWritableDataSource } from "@/lib/api-client";

type WritableGuardProps = {
  children: ReactNode;
};

export function WritableGuard({ children }: WritableGuardProps) {
  let result: ReactNode = null;

  if (!isWritableDataSource()) {
    result = (
      <p className="manage-readonly-banner" role="status">
        編集はローカル開発環境（API 接続時）でのみ可能です。本番サイトは読み取り専用です。
      </p>
    );
    return result;
  }

  result = children;
  return result;
}
