import type { AllocationSlice } from "@repo/shared";

import { formatPercent, formatYen } from "@/lib/format-yen";

type AllocationTableProps = {
  slices: AllocationSlice[];
};

export function AllocationTable({ slices }: AllocationTableProps) {
  let result = (
    <table className="allocation-table">
      <thead>
        <tr>
          <th>分類</th>
          <th>評価額</th>
          <th>構成比</th>
        </tr>
      </thead>
      <tbody>
        {slices.length === 0 ? (
          <tr>
            <td colSpan={3}>該当する分類タグがありません。</td>
          </tr>
        ) : (
          slices.map((slice) => {
            let row = (
              <tr key={slice.valueCode}>
                <td>{slice.valueName}</td>
                <td>{formatYen(slice.marketValueMinor)}</td>
                <td>{formatPercent(slice.weight)}</td>
              </tr>
            );
            return row;
          })
        )}
      </tbody>
    </table>
  );
  return result;
}
