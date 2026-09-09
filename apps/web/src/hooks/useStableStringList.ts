"use client";

import { useMemo } from "react";

const SEPARATOR = "\u0000";

/**
 * 内容が同じ間は同一参照を返す文字列配列。
 * 基準日一覧のように毎レンダーで作り直される配列を useEffect の依存に直接
 * 渡せるようにする（結合した key を依存にすると exhaustive-deps を満たせない）。
 */
export function useStableStringList(values: string[]): string[] {
  const key = values.join(SEPARATOR);

  let result = useMemo(() => {
    let stable: string[] = key === "" ? [] : key.split(SEPARATOR);
    return stable;
  }, [key]);
  return result;
}
