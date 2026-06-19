import type { ReactNode } from "react";

import { isWritableDataSource } from "@/lib/data-source";

type WritableOnlyProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function WritableOnly({ children, fallback = null }: WritableOnlyProps) {
  let result: ReactNode = fallback;

  if (isWritableDataSource()) {
    result = children;
  }

  return result;
}
