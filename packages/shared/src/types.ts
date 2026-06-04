export type ClassificationTagDto = {
  schemeCode: string;
  schemeName: string;
  valueCode: string;
  valueName: string;
};

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
  quantity: number;
  marketValueMinor: number;
  bookValueMinor: number | null;
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
