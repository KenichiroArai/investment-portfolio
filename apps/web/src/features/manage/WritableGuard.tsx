import type { ReactNode } from "react";

import { WritableOnly } from "@/components/WritableOnly";

type WritableGuardProps = {
  children: ReactNode;
};

export function WritableGuard({ children }: WritableGuardProps) {
  let result = <WritableOnly>{children}</WritableOnly>;
  return result;
}
