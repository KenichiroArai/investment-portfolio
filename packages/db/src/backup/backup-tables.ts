import type { BackupTableName } from "@repo/shared";

export type BackupTableConfig = {
  name: BackupTableName;
  columns: string[];
  exportColumns: string[];
  nullableColumns: Set<string>;
  integerColumns: Set<string>;
  realColumns: Set<string>;
  hasId: boolean;
};

export const BACKUP_IMPORT_ORDER: BackupTableName[] = [
  "portfolios",
  "classification_schemes",
  "classification_values",
  "instruments",
  "instrument_classifications",
  "instrument_attributes",
  "portfolio_snapshots",
  "holding_lines",
  "holding_line_metrics",
  "portfolio_snapshot_metrics",
  "target_allocation_weights",
  "target_portfolio_weights",
];

export const BACKUP_DELETE_ORDER: BackupTableName[] = [
  ...BACKUP_IMPORT_ORDER,
].reverse();

function defineTable(config: BackupTableConfig): BackupTableConfig {
  let result = config;
  return result;
}

export const BACKUP_TABLE_CONFIGS: Record<BackupTableName, BackupTableConfig> = {
  portfolios: defineTable({
    name: "portfolios",
    columns: ["id", "code", "name", "kind", "created_at"],
    exportColumns: ["id", "code", "name", "kind", "created_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(),
    realColumns: new Set(),
    hasId: true,
  }),
  classification_schemes: defineTable({
    name: "classification_schemes",
    columns: ["id", "portfolio_id", "code", "name", "created_at"],
    exportColumns: ["id", "portfolio_id", "portfolio_code", "code", "name", "created_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(),
    realColumns: new Set(),
    hasId: true,
  }),
  classification_values: defineTable({
    name: "classification_values",
    columns: ["id", "scheme_id", "code", "name", "sort_order", "created_at"],
    exportColumns: ["id", "scheme_id", "code", "name", "sort_order", "created_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(["sort_order"]),
    realColumns: new Set(),
    hasId: true,
  }),
  instruments: defineTable({
    name: "instruments",
    columns: ["id", "portfolio_id", "account_id", "name", "instrument_type", "currency", "external_id", "created_at"],
    exportColumns: [
      "id",
      "portfolio_id",
      "portfolio_code",
      "account_id",
      "name",
      "instrument_type",
      "currency",
      "external_id",
      "created_at",
    ],
    nullableColumns: new Set(["external_id"]),
    integerColumns: new Set(),
    realColumns: new Set(),
    hasId: true,
  }),
  instrument_classifications: defineTable({
    name: "instrument_classifications",
    columns: ["instrument_id", "classification_value_id", "allocation_weight"],
    exportColumns: ["instrument_id", "classification_value_id", "allocation_weight"],
    nullableColumns: new Set(["allocation_weight"]),
    integerColumns: new Set(),
    realColumns: new Set(["allocation_weight"]),
    hasId: false,
  }),
  instrument_attributes: defineTable({
    name: "instrument_attributes",
    columns: ["id", "instrument_id", "code", "integer_value", "real_value", "text_value"],
    exportColumns: ["id", "instrument_id", "code", "integer_value", "real_value", "text_value"],
    nullableColumns: new Set(["integer_value", "real_value", "text_value"]),
    integerColumns: new Set(["integer_value"]),
    realColumns: new Set(["real_value"]),
    hasId: true,
  }),
  portfolio_snapshots: defineTable({
    name: "portfolio_snapshots",
    columns: ["id", "portfolio_id", "as_of_date", "is_current", "created_at"],
    exportColumns: ["id", "portfolio_id", "portfolio_code", "as_of_date", "is_current", "created_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(["is_current"]),
    realColumns: new Set(),
    hasId: true,
  }),
  holding_lines: defineTable({
    name: "holding_lines",
    columns: [
      "id",
      "snapshot_id",
      "instrument_id",
      "account_id",
      "account_name",
      "sort_order",
      "quantity",
      "market_value_minor",
      "book_value_minor",
    ],
    exportColumns: [
      "id",
      "snapshot_id",
      "instrument_id",
      "account_id",
      "account_name",
      "sort_order",
      "quantity",
      "market_value_minor",
      "book_value_minor",
    ],
    nullableColumns: new Set(["sort_order", "book_value_minor"]),
    integerColumns: new Set(["sort_order", "market_value_minor", "book_value_minor"]),
    realColumns: new Set(["quantity"]),
    hasId: true,
  }),
  holding_line_metrics: defineTable({
    name: "holding_line_metrics",
    columns: ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
    exportColumns: ["id", "holding_line_id", "code", "integer_value", "real_value", "text_value"],
    nullableColumns: new Set(["integer_value", "real_value", "text_value"]),
    integerColumns: new Set(["integer_value"]),
    realColumns: new Set(["real_value"]),
    hasId: true,
  }),
  portfolio_snapshot_metrics: defineTable({
    name: "portfolio_snapshot_metrics",
    columns: ["id", "snapshot_id", "code", "integer_value", "real_value", "text_value"],
    exportColumns: ["id", "snapshot_id", "code", "integer_value", "real_value", "text_value"],
    nullableColumns: new Set(["integer_value", "real_value", "text_value"]),
    integerColumns: new Set(["integer_value"]),
    realColumns: new Set(["real_value"]),
    hasId: true,
  }),
  target_allocation_weights: defineTable({
    name: "target_allocation_weights",
    columns: ["id", "portfolio_id", "scheme_code", "value_code", "target_ratio", "updated_at"],
    exportColumns: ["id", "portfolio_id", "portfolio_code", "scheme_code", "value_code", "target_ratio", "updated_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(),
    realColumns: new Set(["target_ratio"]),
    hasId: true,
  }),
  target_portfolio_weights: defineTable({
    name: "target_portfolio_weights",
    columns: ["id", "portfolio_id", "instrument_id", "target_ratio", "updated_at"],
    exportColumns: ["id", "portfolio_id", "portfolio_code", "instrument_id", "target_ratio", "updated_at"],
    nullableColumns: new Set(),
    integerColumns: new Set(),
    realColumns: new Set(["target_ratio"]),
    hasId: true,
  }),
};

type BackupScopeFilter = {
  type: "all";
} | {
  type: "portfolio";
  portfolioCode: string;
};

type ExportQuery = {
  sql: string;
  params: string[];
};

export function buildBackupExportQuery(
  tableName: BackupTableName,
  scope: BackupScopeFilter,
): ExportQuery {
  let result: ExportQuery = { sql: "", params: [] };
  const portfolioFilter =
    scope.type === "portfolio" ? "WHERE p.code = ?" : "";
  const portfolioParams = scope.type === "portfolio" ? [scope.portfolioCode] : [];

  if (tableName === "portfolios") {
    if (scope.type === "portfolio") {
      result = {
        sql: "SELECT id, code, name, kind, created_at FROM portfolios WHERE code = ?",
        params: [scope.portfolioCode],
      };
      return result;
    }

    result = {
      sql: "SELECT id, code, name, kind, created_at FROM portfolios ORDER BY code",
      params: [],
    };
    return result;
  }

  if (tableName === "classification_schemes") {
    result = {
      sql: `SELECT cs.id, cs.portfolio_id, p.code AS portfolio_code, cs.code, cs.name, cs.created_at
        FROM classification_schemes cs
        INNER JOIN portfolios p ON p.id = cs.portfolio_id
        ${portfolioFilter}
        ORDER BY p.code, cs.code`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "classification_values") {
    result = {
      sql: `SELECT cv.id, cv.scheme_id, cv.code, cv.name, cv.sort_order, cv.created_at
        FROM classification_values cv
        INNER JOIN classification_schemes cs ON cs.id = cv.scheme_id
        INNER JOIN portfolios p ON p.id = cs.portfolio_id
        ${portfolioFilter}
        ORDER BY cv.scheme_id, cv.sort_order, cv.code`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "instruments") {
    result = {
      sql: `SELECT i.id, i.portfolio_id, p.code AS portfolio_code, i.account_id, i.name, i.instrument_type, i.currency, i.external_id, i.created_at
        FROM instruments i
        INNER JOIN portfolios p ON p.id = i.portfolio_id
        ${portfolioFilter}
        ORDER BY p.code, i.name`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "instrument_classifications") {
    result = {
      sql: `SELECT ic.instrument_id, ic.classification_value_id, ic.allocation_weight
        FROM instrument_classifications ic
        INNER JOIN instruments i ON i.id = ic.instrument_id
        INNER JOIN portfolios p ON p.id = i.portfolio_id
        ${portfolioFilter}
        ORDER BY ic.instrument_id, ic.classification_value_id`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "instrument_attributes") {
    result = {
      sql: `SELECT ia.id, ia.instrument_id, ia.code, ia.integer_value, ia.real_value, ia.text_value
        FROM instrument_attributes ia
        INNER JOIN instruments i ON i.id = ia.instrument_id
        INNER JOIN portfolios p ON p.id = i.portfolio_id
        ${portfolioFilter}
        ORDER BY ia.instrument_id, ia.code`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "portfolio_snapshots") {
    result = {
      sql: `SELECT ps.id, ps.portfolio_id, p.code AS portfolio_code, ps.as_of_date, ps.is_current, ps.created_at
        FROM portfolio_snapshots ps
        INNER JOIN portfolios p ON p.id = ps.portfolio_id
        ${portfolioFilter}
        ORDER BY p.code, ps.as_of_date`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "holding_lines") {
    result = {
      sql: `SELECT hl.id, hl.snapshot_id, hl.instrument_id, hl.account_id, hl.account_name, hl.sort_order, hl.quantity, hl.market_value_minor, hl.book_value_minor
        FROM holding_lines hl
        INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
        INNER JOIN portfolios p ON p.id = ps.portfolio_id
        ${portfolioFilter}
        ORDER BY hl.snapshot_id, hl.sort_order, hl.id`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "holding_line_metrics") {
    result = {
      sql: `SELECT hlm.id, hlm.holding_line_id, hlm.code, hlm.integer_value, hlm.real_value, hlm.text_value
        FROM holding_line_metrics hlm
        INNER JOIN holding_lines hl ON hl.id = hlm.holding_line_id
        INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
        INNER JOIN portfolios p ON p.id = ps.portfolio_id
        ${portfolioFilter}
        ORDER BY hlm.holding_line_id, hlm.code`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "portfolio_snapshot_metrics") {
    result = {
      sql: `SELECT psm.id, psm.snapshot_id, psm.code, psm.integer_value, psm.real_value, psm.text_value
        FROM portfolio_snapshot_metrics psm
        INNER JOIN portfolio_snapshots ps ON ps.id = psm.snapshot_id
        INNER JOIN portfolios p ON p.id = ps.portfolio_id
        ${portfolioFilter}
        ORDER BY psm.snapshot_id, psm.code`,
      params: portfolioParams,
    };
    return result;
  }

  if (tableName === "target_allocation_weights") {
    result = {
      sql: `SELECT taw.id, taw.portfolio_id, p.code AS portfolio_code, taw.scheme_code, taw.value_code, taw.target_ratio, taw.updated_at
        FROM target_allocation_weights taw
        INNER JOIN portfolios p ON p.id = taw.portfolio_id
        ${portfolioFilter}
        ORDER BY p.code, taw.scheme_code, taw.value_code`,
      params: portfolioParams,
    };
    return result;
  }

  result = {
    sql: `SELECT tpw.id, tpw.portfolio_id, p.code AS portfolio_code, tpw.instrument_id, tpw.target_ratio, tpw.updated_at
      FROM target_portfolio_weights tpw
      INNER JOIN portfolios p ON p.id = tpw.portfolio_id
      ${portfolioFilter}
      ORDER BY p.code, tpw.instrument_id`,
    params: portfolioParams,
  };
  return result;
}

export function buildBackupDeleteStatements(
  scope: BackupScopeFilter,
  portfolioId: string | null,
): Array<{ sql: string; params: string[] }> {
  let result: Array<{ sql: string; params: string[] }> = [];

  if (scope.type === "all") {
    for (const tableName of BACKUP_DELETE_ORDER) {
      result.push({
        sql: `DELETE FROM ${tableName}`,
        params: [],
      });
    }
    return result;
  }

  if (!portfolioId) {
    return result;
  }

  result = [
    {
      sql: `DELETE FROM holding_line_metrics
        WHERE holding_line_id IN (
          SELECT hl.id FROM holding_lines hl
          INNER JOIN portfolio_snapshots ps ON ps.id = hl.snapshot_id
          WHERE ps.portfolio_id = ?
        )`,
      params: [portfolioId],
    },
    {
      sql: `DELETE FROM holding_lines
        WHERE snapshot_id IN (SELECT id FROM portfolio_snapshots WHERE portfolio_id = ?)`,
      params: [portfolioId],
    },
    {
      sql: `DELETE FROM portfolio_snapshot_metrics
        WHERE snapshot_id IN (SELECT id FROM portfolio_snapshots WHERE portfolio_id = ?)`,
      params: [portfolioId],
    },
    {
      sql: "DELETE FROM portfolio_snapshots WHERE portfolio_id = ?",
      params: [portfolioId],
    },
    {
      sql: `DELETE FROM instrument_classifications
        WHERE instrument_id IN (SELECT id FROM instruments WHERE portfolio_id = ?)`,
      params: [portfolioId],
    },
    {
      sql: `DELETE FROM instrument_attributes
        WHERE instrument_id IN (SELECT id FROM instruments WHERE portfolio_id = ?)`,
      params: [portfolioId],
    },
    {
      sql: "DELETE FROM target_allocation_weights WHERE portfolio_id = ?",
      params: [portfolioId],
    },
    {
      sql: "DELETE FROM target_portfolio_weights WHERE portfolio_id = ?",
      params: [portfolioId],
    },
    {
      sql: "DELETE FROM instruments WHERE portfolio_id = ?",
      params: [portfolioId],
    },
    {
      sql: `DELETE FROM classification_values
        WHERE scheme_id IN (SELECT id FROM classification_schemes WHERE portfolio_id = ?)`,
      params: [portfolioId],
    },
    {
      sql: "DELETE FROM classification_schemes WHERE portfolio_id = ?",
      params: [portfolioId],
    },
  ];
  return result;
}
