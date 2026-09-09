"use client";

import { useCallback, useState } from "react";

type KeyedStateSetter<T> = (value: T | ((previous: T) => T)) => void;

/**
 * key が変わったら initialValue に戻る state。
 * useEffect でリセットすると setState の連鎖レンダーになるため、保持中の key と
 * 比較して現在値を導出する。initialValue は参照が安定した値を渡すこと。
 */
export function useKeyedState<T>(
  key: string,
  initialValue: T,
): [T, KeyedStateSetter<T>] {
  const [stored, setStored] = useState<{ key: string; value: T }>(() => {
    let initialStored = { key, value: initialValue };
    return initialStored;
  });

  const setValue = useCallback<KeyedStateSetter<T>>(
    (value) => {
      let setResult: void = undefined;
      setStored((previous) => {
        const base = previous.key === key ? previous.value : initialValue;
        let nextStored = {
          key,
          value:
            typeof value === "function"
              ? (value as (previous: T) => T)(base)
              : value,
        };
        return nextStored;
      });
      return setResult;
    },
    [initialValue, key],
  );

  let result: [T, KeyedStateSetter<T>] = [
    stored.key === key ? stored.value : initialValue,
    setValue,
  ];
  return result;
}
