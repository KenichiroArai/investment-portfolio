export const trendsPointsFixture = [
  {
    asOfDate: "2026-05-31",
    totalMarketValueMinor: 3_400_000,
    totalBookValueMinor: 3_000_000,
    unrealizedGainMinor: 400_000,
    gainRateOnBook: 0.13,
    totalContributionsMinor: null,
    gainRateOnContributions: null,
    allocationsByScheme: {
      ideco_region: [
        {
          valueCode: "domestic",
          valueName: "国内",
          marketValueMinor: 2_000_000,
          ratio: 0.6,
        },
        {
          valueCode: "foreign",
          valueName: "海外",
          marketValueMinor: 1_400_000,
          ratio: 0.4,
        },
      ],
      ideco_asset_class: [
        {
          valueCode: "equity",
          valueName: "株式",
          marketValueMinor: 2_500_000,
          ratio: 0.7,
        },
      ],
    },
  },
  {
    asOfDate: "2026-06-07",
    totalMarketValueMinor: 3_441_347,
    totalBookValueMinor: 2_982_226,
    unrealizedGainMinor: 459_121,
    gainRateOnBook: 0.15,
    totalContributionsMinor: 1_000_000,
    gainRateOnContributions: 0.05,
    allocationsByScheme: {
      ideco_region: [
        {
          valueCode: "domestic",
          valueName: "国内",
          marketValueMinor: 2_100_000,
          ratio: 0.61,
        },
        {
          valueCode: "foreign",
          valueName: "海外",
          marketValueMinor: 1_341_347,
          ratio: 0.39,
        },
      ],
      ideco_asset_class: [
        {
          valueCode: "equity",
          valueName: "株式",
          marketValueMinor: 2_600_000,
          ratio: 0.75,
        },
      ],
    },
  },
];

export const snapshotWithSchemesFixture = {
  id: "s1",
  portfolioCode: "ideco",
  portfolioName: "iDeCo",
  asOfDate: "2026-06-07",
  analysisSchemes: [
    { schemeCode: "ideco_region", schemeName: "地域分類" },
    { schemeCode: "ideco_asset_class", schemeName: "資産分類" },
  ],
  metrics: [],
  lines: [],
};
