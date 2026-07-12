DELETE FROM `holding_line_metrics`
WHERE `holding_line_id` IN (
  SELECT `id`
  FROM `holding_lines`
  WHERE `rowid` NOT IN (
    SELECT MIN(`rowid`)
    FROM `holding_lines`
    GROUP BY `snapshot_id`, `instrument_id`, `account_id`
  )
);
--> statement-breakpoint
DELETE FROM `holding_lines`
WHERE `rowid` NOT IN (
  SELECT MIN(`rowid`)
  FROM `holding_lines`
  GROUP BY `snapshot_id`, `instrument_id`, `account_id`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holding_lines_snapshot_instrument_account_unique` ON `holding_lines` (`snapshot_id`,`instrument_id`,`account_id`);
