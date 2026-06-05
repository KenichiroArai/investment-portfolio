import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const portfolios = sqliteTable(
  "portfolios",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => {
    let result = [unique("portfolios_code_unique").on(table.code)];
    return result;
  },
);

export const instruments = sqliteTable("instruments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  instrumentType: text("instrument_type").notNull().default("mutual_fund"),
  currency: text("currency").notNull().default("JPY"),
  externalId: text("external_id"),
  createdAt: text("created_at").notNull(),
});

export const classificationSchemes = sqliteTable(
  "classification_schemes",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
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

export const classificationValues = sqliteTable(
  "classification_values",
  {
    id: text("id").primaryKey(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => {
        let result = classificationSchemes.id;
        return result;
      }, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
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

export const instrumentClassifications = sqliteTable(
  "instrument_classifications",
  {
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => {
        let result = instruments.id;
        return result;
      }, { onDelete: "cascade" }),
    classificationValueId: text("classification_value_id")
      .notNull()
      .references(() => {
        let result = classificationValues.id;
        return result;
      }, { onDelete: "cascade" }),
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

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => {
        let result = portfolios.id;
        return result;
      }, { onDelete: "cascade" }),
    asOfDate: text("as_of_date").notNull(),
    isCurrent: integer("is_current").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => {
    let result = [
      index("portfolio_snapshots_portfolio_current_idx").on(
        table.portfolioId,
        table.isCurrent,
      ),
    ];
    return result;
  },
);

export const holdingLines = sqliteTable("holding_lines", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => {
      let result = portfolioSnapshots.id;
      return result;
    }, { onDelete: "cascade" }),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => {
      let result = instruments.id;
      return result;
    }, { onDelete: "restrict" }),
  sortOrder: integer("sort_order"),
  quantity: real("quantity").notNull(),
  marketValueMinor: integer("market_value_minor").notNull(),
  bookValueMinor: integer("book_value_minor"),
});

export const holdingLineMetrics = sqliteTable(
  "holding_line_metrics",
  {
    id: text("id").primaryKey(),
    holdingLineId: text("holding_line_id")
      .notNull()
      .references(() => {
        let result = holdingLines.id;
        return result;
      }, { onDelete: "cascade" }),
    code: text("code").notNull(),
    integerValue: integer("integer_value"),
    realValue: real("real_value"),
    textValue: text("text_value"),
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

export const portfoliosRelations = relations(portfolios, ({ many }) => {
        let result = {
    classificationSchemes: many(classificationSchemes),
    snapshots: many(portfolioSnapshots),
  };
  return result;
});

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

export const instrumentsRelations = relations(instruments, ({ many }) => {
        let result = {
    classifications: many(instrumentClassifications),
    holdingLines: many(holdingLines),
  };
  return result;
});

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

export const portfolioSnapshotsRelations = relations(
  portfolioSnapshots,
  ({ one, many }) => {
    let result = {
      portfolio: one(portfolios, {
        fields: [portfolioSnapshots.portfolioId],
        references: [portfolios.id],
      }),
      holdingLines: many(holdingLines),
    };
    return result;
  },
);

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
