import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

/** 口座 — 投資口座のマスタ。詳細は packages/db/README.md */
export const portfolios = sqliteTable(
  "portfolios",
  {
    id: text("id").primaryKey(), // ID
    code: text("code").notNull(), // 口座コード
    name: text("name").notNull(), // 口座名
    kind: text("kind").notNull(), // 口座種別
    createdAt: text("created_at").notNull(), // 作成日時
  },
  (table) => {
    let result = [unique("portfolios_code_unique").on(table.code)];
    return result;
  },
);

/** 銘柄 — 運用商品のマスタ。詳細は packages/db/README.md */
export const instruments = sqliteTable("instruments", {
  id: text("id").primaryKey(), // ID
  name: text("name").notNull(), // 銘柄名
  instrumentType: text("instrument_type").notNull().default("mutual_fund"), // 銘柄種別
  currency: text("currency").notNull().default("JPY"), // 通貨
  externalId: text("external_id"), // 外部ID
  createdAt: text("created_at").notNull(), // 作成日時
});

/** 分類体系 — 口座ごとの分類軸。詳細は packages/db/README.md */
export const classificationSchemes = sqliteTable(
  "classification_schemes",
  {
    id: text("id").primaryKey(), // ID
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }), // 口座ID
    code: text("code").notNull(), // 体系コード
    name: text("name").notNull(), // 体系名
    createdAt: text("created_at").notNull(), // 作成日時
  },
  (table) => {
    let result = [
      unique("classification_schemes_portfolio_code_unique").on(
        table.portfolioId,
        table.code,
      ),
    ];
    return result;
  },
);

/** 分類値 — 分類体系の選択肢。詳細は packages/db/README.md */
export const classificationValues = sqliteTable(
  "classification_values",
  {
    id: text("id").primaryKey(), // ID
    schemeId: text("scheme_id")
      .notNull()
      .references(() => {
        let result = classificationSchemes.id;
        return result;
      }, { onDelete: "cascade" }), // 分類体系ID
    code: text("code").notNull(), // 分類値コード
    name: text("name").notNull(), // 分類値名
    sortOrder: integer("sort_order").notNull().default(0), // 表示順
    createdAt: text("created_at").notNull(), // 作成日時
  },
  (table) => {
    let result = [
      unique("classification_values_scheme_code_unique").on(
        table.schemeId,
        table.code,
      ),
    ];
    return result;
  },
);

/** 銘柄分類 — 銘柄と分類値の紐付け。詳細は packages/db/README.md */
export const instrumentClassifications = sqliteTable(
  "instrument_classifications",
  {
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => {
        let result = instruments.id;
        return result;
      }, { onDelete: "cascade" }), // 銘柄ID
    classificationValueId: text("classification_value_id")
      .notNull()
      .references(() => {
        let result = classificationValues.id;
        return result;
      }, { onDelete: "cascade" }), // 分類値ID
  },
  (table) => {
    let result = [
      unique("instrument_classifications_unique").on(
        table.instrumentId,
        table.classificationValueId,
      ),
    ];
    return result;
  },
);

/** 銘柄属性 — 銘柄ごとの可変属性（EAV）。詳細は packages/db/README.md */
export const instrumentAttributes = sqliteTable(
  "instrument_attributes",
  {
    id: text("id").primaryKey(), // ID
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => {
        let result = instruments.id;
        return result;
      }, { onDelete: "cascade" }), // 銘柄ID
    code: text("code").notNull(), // 属性コード
    integerValue: integer("integer_value"), // 整数値
    realValue: real("real_value"), // 実数値
    textValue: text("text_value"), // 文字列値
  },
  (table) => {
    let result = [
      unique("instrument_attributes_instrument_code_unique").on(
        table.instrumentId,
        table.code,
      ),
    ];
    return result;
  },
);

/** ポートフォリオスナップショット — 基準日時点の保有状態。詳細は packages/db/README.md */
export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: text("id").primaryKey(), // ID
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }), // 口座ID
    asOfDate: text("as_of_date").notNull(), // 基準日
    isCurrent: integer("is_current").notNull().default(0), // 最新フラグ
    createdAt: text("created_at").notNull(), // 作成日時
  },
  (table) => {
    let result = [
      index("portfolio_snapshots_portfolio_current_idx").on(
        table.portfolioId,
        table.isCurrent,
      ),
      unique("portfolio_snapshots_portfolio_date_unique").on(
        table.portfolioId,
        table.asOfDate,
      ),
    ];
    return result;
  },
);

/** 保有明細行 — スナップショット内の1銘柄分の保有。詳細は packages/db/README.md */
export const holdingLines = sqliteTable(
  "holding_lines",
  {
    id: text("id").primaryKey(), // ID
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => {
        let result = portfolioSnapshots.id;
        return result;
      }, { onDelete: "cascade" }), // スナップショットID
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => {
        let result = instruments.id;
        return result;
      }, { onDelete: "restrict" }), // 銘柄ID
    accountId: text("account_id").notNull().default("monex:unknown"), // 口座ID
    accountName: text("account_name").notNull().default("不明口座"), // 口座表示名
    sortOrder: integer("sort_order"), // 表示順
    quantity: real("quantity").notNull(), // 数量
    marketValueMinor: integer("market_value_minor").notNull(), // 評価額
    bookValueMinor: integer("book_value_minor"), // 簿価
  },
  (table) => {
    let result = [index("holding_lines_snapshot_account_idx").on(table.snapshotId, table.accountId)];
    return result;
  },
);

/** スナップショット指標 — スナップショットごとの可変指標（EAV）。詳細は packages/db/README.md */
export const portfolioSnapshotMetrics = sqliteTable(
  "portfolio_snapshot_metrics",
  {
    id: text("id").primaryKey(), // ID
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => {
        let result = portfolioSnapshots.id;
        return result;
      }, { onDelete: "cascade" }), // スナップショットID
    code: text("code").notNull(), // 指標コード
    integerValue: integer("integer_value"), // 整数値
    realValue: real("real_value"), // 実数値
    textValue: text("text_value"), // 文字列値
  },
  (table) => {
    let result = [
      unique("portfolio_snapshot_metrics_snapshot_code_unique").on(
        table.snapshotId,
        table.code,
      ),
    ];
    return result;
  },
);

/** 保有明細指標 — 明細行ごとの可変指標（EAV）。詳細は packages/db/README.md */
export const holdingLineMetrics = sqliteTable(
  "holding_line_metrics",
  {
    id: text("id").primaryKey(), // ID
    holdingLineId: text("holding_line_id")
      .notNull()
      .references(() => {
        let result = holdingLines.id;
        return result;
      }, { onDelete: "cascade" }), // 保有明細行ID
    code: text("code").notNull(), // 指標コード
    integerValue: integer("integer_value"), // 整数値
    realValue: real("real_value"), // 実数値
    textValue: text("text_value"), // 文字列値
  },
  (table) => {
    let result = [
      unique("holding_line_metrics_line_code_unique").on(
        table.holdingLineId,
        table.code,
      ),
    ];
    return result;
  },
);

/** 目標配分 — 口座×分類体系×分類値ごとの目標構成比。詳細は packages/db/README.md */
export const targetAllocationWeights = sqliteTable(
  "target_allocation_weights",
  {
    id: text("id").primaryKey(), // ID
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }), // 口座ID
    schemeCode: text("scheme_code").notNull(), // 分類体系コード
    valueCode: text("value_code").notNull(), // 分類値コード
    targetRatio: real("target_ratio").notNull(), // 目標構成比（0–1）
    updatedAt: text("updated_at").notNull(), // 更新日時
  },
  (table) => {
    let result = [
      unique("target_allocation_weights_unique").on(
        table.portfolioId,
        table.schemeCode,
        table.valueCode,
      ),
    ];
    return result;
  },
);

/** 銘柄目標配分 — 口座×銘柄ごとの目標構成比。詳細は packages/db/README.md */
export const targetPortfolioWeights = sqliteTable(
  "target_portfolio_weights",
  {
    id: text("id").primaryKey(), // ID
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }), // 口座ID
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => {
        let result = instruments.id;
        return result;
      }, { onDelete: "cascade" }), // 銘柄ID
    targetRatio: real("target_ratio").notNull(), // 目標構成比（0–1）
    updatedAt: text("updated_at").notNull(), // 更新日時
  },
  (table) => {
    let result = [
      unique("target_portfolio_weights_unique").on(
        table.portfolioId,
        table.instrumentId,
      ),
    ];
    return result;
  },
);

/** 口座リレーション */
export const portfoliosRelations = relations(portfolios, ({ many }) => {
  let result = {
    classificationSchemes: many(classificationSchemes),
    snapshots: many(portfolioSnapshots),
    targetAllocationWeights: many(targetAllocationWeights),
    targetPortfolioWeights: many(targetPortfolioWeights),
  };
  return result;
});

/** 分類体系リレーション */
export const classificationSchemesRelations = relations(
  classificationSchemes,
  ({ one, many }) => {
    let result = {
      portfolio: one(portfolios, {
        fields: [classificationSchemes.portfolioId],
        references: [portfolios.id],
      }),
      values: many(classificationValues),
    };
    return result;
  },
);

/** 分類値リレーション */
export const classificationValuesRelations = relations(
  classificationValues,
  ({ one, many }) => {
    let result = {
      scheme: one(classificationSchemes, {
        fields: [classificationValues.schemeId],
        references: [classificationSchemes.id],
      }),
      instrumentClassifications: many(instrumentClassifications),
    };
    return result;
  },
);

/** 銘柄リレーション */
export const instrumentsRelations = relations(instruments, ({ many }) => {
  let result = {
    classifications: many(instrumentClassifications),
    attributes: many(instrumentAttributes),
    holdingLines: many(holdingLines),
  };
  return result;
});

/** 銘柄属性リレーション */
export const instrumentAttributesRelations = relations(
  instrumentAttributes,
  ({ one }) => {
    let result = {
      instrument: one(instruments, {
        fields: [instrumentAttributes.instrumentId],
        references: [instruments.id],
      }),
    };
    return result;
  },
);

/** 銘柄分類リレーション */
export const instrumentClassificationsRelations = relations(
  instrumentClassifications,
  ({ one }) => {
    let result = {
      instrument: one(instruments, {
        fields: [instrumentClassifications.instrumentId],
        references: [instruments.id],
      }),
      classificationValue: one(classificationValues, {
        fields: [instrumentClassifications.classificationValueId],
        references: [classificationValues.id],
      }),
    };
    return result;
  },
);

/** ポートフォリオスナップショットリレーション */
export const portfolioSnapshotsRelations = relations(
  portfolioSnapshots,
  ({ one, many }) => {
    let result = {
      portfolio: one(portfolios, {
        fields: [portfolioSnapshots.portfolioId],
        references: [portfolios.id],
      }),
      holdingLines: many(holdingLines),
      metrics: many(portfolioSnapshotMetrics),
    };
    return result;
  },
);

/** スナップショット指標リレーション */
export const portfolioSnapshotMetricsRelations = relations(
  portfolioSnapshotMetrics,
  ({ one }) => {
    let result = {
      snapshot: one(portfolioSnapshots, {
        fields: [portfolioSnapshotMetrics.snapshotId],
        references: [portfolioSnapshots.id],
      }),
    };
    return result;
  },
);

/** 保有明細行リレーション */
export const holdingLinesRelations = relations(holdingLines, ({ one, many }) => {
  let result = {
    snapshot: one(portfolioSnapshots, {
      fields: [holdingLines.snapshotId],
      references: [portfolioSnapshots.id],
    }),
    instrument: one(instruments, {
      fields: [holdingLines.instrumentId],
      references: [instruments.id],
    }),
    metrics: many(holdingLineMetrics),
  };
  return result;
});

/** 保有明細指標リレーション */
export const holdingLineMetricsRelations = relations(
  holdingLineMetrics,
  ({ one }) => {
    let result = {
      holdingLine: one(holdingLines, {
        fields: [holdingLineMetrics.holdingLineId],
        references: [holdingLines.id],
      }),
    };
    return result;
  },
);
