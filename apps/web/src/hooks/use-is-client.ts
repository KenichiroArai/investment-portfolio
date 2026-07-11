import { useSyncExternalStore } from "react";

function subscribeNoop(): () => void {
  let result: () => void = () => {};
  return result;
}

export function useIsClient(): boolean {
  let result = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  return result;
}
