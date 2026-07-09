ALTER TABLE `holding_lines` ADD `account_id` text DEFAULT 'monex:unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `holding_lines` ADD `account_name` text DEFAULT '不明口座' NOT NULL;
--> statement-breakpoint
CREATE INDEX `holding_lines_snapshot_account_idx` ON `holding_lines` (`snapshot_id`,`account_id`);
--> statement-breakpoint
UPDATE `holding_lines`
SET
  `account_id` = COALESCE(
    (
      SELECT
        CASE
          WHEN COALESCE(TRIM(mAccount.text_value), '') = '' AND COALESCE(TRIM(mCustody.text_value), '') = '' THEN 'monex:unknown'
          WHEN COALESCE(TRIM(mCustody.text_value), '') = '' THEN 'monex:' || REPLACE(REPLACE(TRIM(mAccount.text_value), ' ', ''), '　', '')
          ELSE 'monex:' || REPLACE(REPLACE(TRIM(mAccount.text_value), ' ', ''), '　', '') || ':' || REPLACE(REPLACE(TRIM(mCustody.text_value), ' ', ''), '　', '')
        END
      FROM `holding_line_metrics` AS mAccount
      LEFT JOIN `holding_line_metrics` AS mCustody
        ON mCustody.holding_line_id = mAccount.holding_line_id
       AND mCustody.code = 'custody_type'
      WHERE mAccount.holding_line_id = `holding_lines`.id
        AND mAccount.code = 'account_type'
      LIMIT 1
    ),
    `account_id`
  ),
  `account_name` = COALESCE(
    (
      SELECT
        CASE
          WHEN COALESCE(TRIM(mAccount.text_value), '') = '' AND COALESCE(TRIM(mCustody.text_value), '') = '' THEN '不明口座'
          WHEN COALESCE(TRIM(mCustody.text_value), '') = '' THEN REPLACE(REPLACE(TRIM(mAccount.text_value), ' ', ''), '　', '')
          ELSE REPLACE(REPLACE(TRIM(mAccount.text_value), ' ', ''), '　', '') || ' / ' || REPLACE(REPLACE(TRIM(mCustody.text_value), ' ', ''), '　', '')
        END
      FROM `holding_line_metrics` AS mAccount
      LEFT JOIN `holding_line_metrics` AS mCustody
        ON mCustody.holding_line_id = mAccount.holding_line_id
       AND mCustody.code = 'custody_type'
      WHERE mAccount.holding_line_id = `holding_lines`.id
        AND mAccount.code = 'account_type'
      LIMIT 1
    ),
    `account_name`
  );
