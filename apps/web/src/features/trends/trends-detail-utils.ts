import type { AggregatedTrendPoint, SnapshotTrendPointDto } from "@repo/shared";

function toPeriodEndpointPoint(point: SnapshotTrendPointDto): AggregatedTrendPoint {
  let result: AggregatedTrendPoint = {
    ...point,
    bucketKey: point.asOfDate,
    bucketLabel: point.asOfDate,
    sourceAsOfDate: point.asOfDate,
  };
  return result;
}

/**
 * 選択期間内の生スナップショットの最初日・最終日を期首・期末とする。
 * 表示単位・代表値による集約結果には依存しない。
 * 範囲内が1点のみのときは baselinePoint を期首として使う。
 */
export function resolvePeriodEndpoints(
  rawPoints: SnapshotTrendPointDto[],
  rangeFrom: string,
  rangeTo: string,
  baselinePoint: AggregatedTrendPoint | null,
): { start: AggregatedTrendPoint; end: AggregatedTrendPoint } | null {
  let result: { start: AggregatedTrendPoint; end: AggregatedTrendPoint } | null = null;

  const inRange = [...rawPoints]
    .filter((point) => point.asOfDate >= rangeFrom && point.asOfDate <= rangeTo)
    .sort((left, right) => left.asOfDate.localeCompare(right.asOfDate));

  if (inRange.length === 0) {
    return result;
  }

  if (inRange.length === 1) {
    if (!baselinePoint) {
      return result;
    }
    result = {
      start: baselinePoint,
      end: toPeriodEndpointPoint(inRange[0]),
    };
    return result;
  }

  result = {
    start: toPeriodEndpointPoint(inRange[0]),
    end: toPeriodEndpointPoint(inRange[inRange.length - 1]),
  };
  return result;
}
