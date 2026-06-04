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
  (table) => [unique("portfolios_code_unique").on(table.code)],
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
      .references(() => portfolios.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    unique("classification_schemes_portfolio_code_unique").on(
      table.portfolioId,
      table.code,
    ),
  ],
);

export const classificationValues = sqliteTable(
  "classification_values",
  {
    id: text("id").primaryKey(),
    schemeId: text("scheme_id")
      .notNull()
      .references(() => classificationSchemes.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    unique("classification_values_scheme_code_unique").on(
      table.schemeId,
      table.code,
    ),
  ],
);

export const instrumentClassifications = sqliteTable(
  "instrument_classifications",
  {
    instrumentId: text("instrument_id")
      .notNull()
      .references(() => instruments.id, { onDelete: "cascade" }),
    classificationValueId: text("classification_value_id")
      .notNull()
      .references(() => classificationValues.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("instrument_classifications_unique").on(
      table.instrumentId,
      table.classificationValueId,
    ),
  ],
);

export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: text("id").primaryKey(),
    portfolioId: text("portfolio_id")
      .notNull()
      .references(() => portfolios.id, { onDelete: "cascade" }),
    asOfDate: text("as_of_date").notNull(),
    isCurrent: integer("is_current").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("portfolio_snapshots_portfolio_current_idx").on(
      table.portfolioId,
      table.isCurrent,
    ),
  ],
);

export const holdingLines = sqliteTable("holding_lines", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => portfolioSnapshots.id, { onDelete: "cascade" }),
  instrumentId: text("instrument_id")
    .notNull()
    .references(() => instruments.id, { onDelete: "restrict" }),
  quantity: real("quantity").notNull(),
  marketValueMinor: integer("market_value_minor").notNull(),
  bookValueMinor: integer("book_value_minor"),
});

export const portfoliosRelations = relations(portfolios, ({ many }) => ({
  classificationSchemes: many(classificationSchemes),
  snapshots: many(portfolioSnapshots),
}));

export const classificationSchemesRelations = relations(
  classificationSchemes,
  ({ one, many }) => ({
    portfolio: one(portfolios, {
      fields: [classificationSchemes.portfolioId],
      references: [portfolios.id],
    }),
    values: many(classificationValues),
  }),
);

export const classificationValuesRelations = relations(
  classificationValues,
  ({ one, many }) => ({
    scheme: one(classificationSchemes, {
      fields: [classificationValues.schemeId],
      references: [classificationSchemes.id],
    }),
    instrumentClassifications: many(instrumentClassifications),
  }),
);

export const instrumentsRelations = relations(instruments, ({ many }) => ({
  classifications: many(instrumentClassifications),
  holdingLines: many(holdingLines),
}));

export const instrumentClassificationsRelations = relations(
  instrumentClassifications,
  ({ one }) => ({
    instrument: one(instruments, {
      fields: [instrumentClassifications.instrumentId],
      references: [instruments.id],
    }),
    classificationValue: one(classificationValues, {
      fields: [instrumentClassifications.classificationValueId],
      references: [classificationValues.id],
    }),
  }),
);

export const portfolioSnapshotsRelations = relations(
  portfolioSnapshots,
  ({ one, many }) => ({
    portfolio: one(portfolios, {
      fields: [portfolioSnapshots.portfolioId],
      references: [portfolios.id],
    }),
    holdingLines: many(holdingLines),
  }),
);

export const holdingLinesRelations = relations(holdingLines, ({ one }) => ({
  snapshot: one(portfolioSnapshots, {
    fields: [holdingLines.snapshotId],
    references: [portfolioSnapshots.id],
  }),
  instrument: one(instruments, {
    fields: [holdingLines.instrumentId],
    references: [instruments.id],
  }),
}));
