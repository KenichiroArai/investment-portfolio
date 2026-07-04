/** iDeCo 口座レベル指標の metric code */
export const IDECO_PORTFOLIO_METRIC_CODES = {
  totalContributions: "ideco_total_contributions",
} as const;

/** 設定画面などで表示する汎用指標ラベル → metric code */
export const IDECO_PORTFOLIO_METRIC_CSV_LABELS: Record<string, string> = {
  拠出金累計: IDECO_PORTFOLIO_METRIC_CODES.totalContributions,
};
