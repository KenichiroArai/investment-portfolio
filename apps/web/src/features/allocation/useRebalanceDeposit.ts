import type { RebalanceMode } from "@repo/shared";
import { useMemo, useState } from "react";

export function useRebalanceDeposit() {
  const [depositInput, setDepositInput] = useState("0");

  const depositMinor = useMemo(() => {
    let result = 0;
    const parsed = Number.parseInt(depositInput.replace(/,/g, ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      result = parsed;
    }
    return result;
  }, [depositInput]);

  const mode: RebalanceMode = depositMinor > 0 ? "deposit_only" : "full";

  let result = {
    depositInput,
    setDepositInput,
    depositMinor,
    mode,
  };
  return result;
}
