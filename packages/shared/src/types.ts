import type { HoldingLineMetricDto } from "./holding-line-metrics";

export type InstrumentAttributeDto = {
  code: string;
  integerValue: number | null;
  realValue: number | null;
  textValue: string | null;
};

export type ClassificationTagDto = {
  schemeCode: string;
  schemeName: string;
  valueCode: string;
  valueName: string;
};

export type { HoldingLineMetricDto };

export type PortfolioDto = {
  id: string;
  code: string;
  name: string;
  kind: string;
};

export type HoldingLineDto = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  sortOrder: number | null;
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
  metrics: HoldingLineMetricDto[];
  instrumentAttributes: InstrumentAttributeDto[];
  tags: ClassificationTagDto[];
};

export type CurrentSnapshotDto = {
  id: string;
  portfolioCode: string;
  portfolioName: string;
  asOfDate: string;
  lines: HoldingLineDto[];
};

export type HealthDto = {
  status: "ok";
};
