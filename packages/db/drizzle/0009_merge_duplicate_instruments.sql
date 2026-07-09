CREATE TABLE `instrument_merge_map` (
	`loser_instrument_id` text NOT NULL,
	`canonical_instrument_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_merge_map_loser_unique` ON `instrument_merge_map` (`loser_instrument_id`);
--> statement-breakpoint
INSERT INTO `instrument_merge_map` (`loser_instrument_id`, `canonical_instrument_id`)
SELECT
	loser.id AS loser_instrument_id,
	canonical.id AS canonical_instrument_id
FROM (
	SELECT
		usage.id,
		usage.portfolio_id,
		usage.name,
		usage.instrument_type,
		usage.currency,
		usage.external_id_key,
		ROW_NUMBER() OVER (
			PARTITION BY
				usage.portfolio_id,
				usage.name,
				usage.instrument_type,
				usage.currency,
				usage.external_id_key
			ORDER BY
				usage.hl_count DESC,
				usage.tpw_count DESC,
				usage.portfolio_prefix_match DESC,
				usage.created_at ASC
		) AS rn
	FROM (
		SELECT
			i.id,
			i.portfolio_id,
			i.name,
			i.instrument_type,
			i.currency,
			coalesce(i.external_id, '') AS external_id_key,
			i.created_at,
			(
				SELECT COUNT(*)
				FROM `holding_lines` hl
				WHERE hl.instrument_id = i.id
			) AS hl_count,
			(
				SELECT COUNT(*)
				FROM `target_portfolio_weights` tpw
				WHERE tpw.instrument_id = i.id
			) AS tpw_count,
			CASE
				WHEN i.account_id LIKE p.code || ':%' THEN 1
				ELSE 0
			END AS portfolio_prefix_match
		FROM `instruments` i
		INNER JOIN `portfolios` p ON p.id = i.portfolio_id
	) usage
) loser
INNER JOIN (
	SELECT
		usage.id,
		usage.portfolio_id,
		usage.name,
		usage.instrument_type,
		usage.currency,
		usage.external_id_key,
		ROW_NUMBER() OVER (
			PARTITION BY
				usage.portfolio_id,
				usage.name,
				usage.instrument_type,
				usage.currency,
				usage.external_id_key
			ORDER BY
				usage.hl_count DESC,
				usage.tpw_count DESC,
				usage.portfolio_prefix_match DESC,
				usage.created_at ASC
		) AS rn
	FROM (
		SELECT
			i.id,
			i.portfolio_id,
			i.name,
			i.instrument_type,
			i.currency,
			coalesce(i.external_id, '') AS external_id_key,
			i.created_at,
			(
				SELECT COUNT(*)
				FROM `holding_lines` hl
				WHERE hl.instrument_id = i.id
			) AS hl_count,
			(
				SELECT COUNT(*)
				FROM `target_portfolio_weights` tpw
				WHERE tpw.instrument_id = i.id
			) AS tpw_count,
			CASE
				WHEN i.account_id LIKE p.code || ':%' THEN 1
				ELSE 0
			END AS portfolio_prefix_match
		FROM `instruments` i
		INNER JOIN `portfolios` p ON p.id = i.portfolio_id
	) usage
) canonical ON
	canonical.portfolio_id = loser.portfolio_id
	AND canonical.name = loser.name
	AND canonical.instrument_type = loser.instrument_type
	AND canonical.currency = loser.currency
	AND canonical.external_id_key = loser.external_id_key
	AND canonical.rn = 1
WHERE loser.rn > 1;
--> statement-breakpoint
UPDATE `holding_lines`
SET `instrument_id` = (
	SELECT map.canonical_instrument_id
	FROM `instrument_merge_map` map
	WHERE map.loser_instrument_id = `holding_lines`.`instrument_id`
)
WHERE `instrument_id` IN (SELECT loser_instrument_id FROM `instrument_merge_map`);
--> statement-breakpoint
UPDATE `target_portfolio_weights`
SET `instrument_id` = (
	SELECT map.canonical_instrument_id
	FROM `instrument_merge_map` map
	WHERE map.loser_instrument_id = `target_portfolio_weights`.`instrument_id`
)
WHERE `instrument_id` IN (SELECT loser_instrument_id FROM `instrument_merge_map`);
--> statement-breakpoint
CREATE TABLE `target_portfolio_weights_merged` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`instrument_id` text NOT NULL,
	`target_ratio` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `target_portfolio_weights_merged` (`id`, `portfolio_id`, `instrument_id`, `target_ratio`, `updated_at`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS id,
	rows.portfolio_id,
	rows.instrument_id,
	sum(rows.target_ratio) AS target_ratio,
	max(rows.updated_at) AS updated_at
FROM `target_portfolio_weights` rows
GROUP BY rows.portfolio_id, rows.instrument_id;
--> statement-breakpoint
DROP TABLE `target_portfolio_weights`;
--> statement-breakpoint
ALTER TABLE `target_portfolio_weights_merged` RENAME TO `target_portfolio_weights`;
--> statement-breakpoint
CREATE UNIQUE INDEX `target_portfolio_weights_unique` ON `target_portfolio_weights` (`portfolio_id`, `instrument_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `instrument_classifications` (`instrument_id`, `classification_value_id`)
SELECT
	map.canonical_instrument_id,
	ic.classification_value_id
FROM `instrument_classifications` ic
INNER JOIN `instrument_merge_map` map ON map.loser_instrument_id = ic.instrument_id;
--> statement-breakpoint
DELETE FROM `instrument_classifications`
WHERE `instrument_id` IN (SELECT loser_instrument_id FROM `instrument_merge_map`);
--> statement-breakpoint
DELETE FROM `instrument_attributes`
WHERE `id` IN (
	SELECT loser_attr.id
	FROM `instrument_attributes` loser_attr
	INNER JOIN `instrument_merge_map` map ON map.loser_instrument_id = loser_attr.instrument_id
	INNER JOIN `instrument_attributes` canonical_attr ON
		canonical_attr.instrument_id = map.canonical_instrument_id
		AND canonical_attr.code = loser_attr.code
);
--> statement-breakpoint
UPDATE `instrument_attributes`
SET `instrument_id` = (
	SELECT map.canonical_instrument_id
	FROM `instrument_merge_map` map
	WHERE map.loser_instrument_id = `instrument_attributes`.`instrument_id`
)
WHERE `instrument_id` IN (SELECT loser_instrument_id FROM `instrument_merge_map`);
--> statement-breakpoint
UPDATE `holding_lines`
SET `account_id` = 'ideco:unknown'
WHERE `account_id` = 'monex:unknown'
AND `snapshot_id` IN (
	SELECT ps.id
	FROM `portfolio_snapshots` ps
	INNER JOIN `portfolios` p ON p.id = ps.portfolio_id
	WHERE p.code = 'ideco'
);
--> statement-breakpoint
DELETE FROM `instruments`
WHERE `id` IN (SELECT loser_instrument_id FROM `instrument_merge_map`);
--> statement-breakpoint
DROP TABLE `instrument_merge_map`;
--> statement-breakpoint
DROP INDEX `instruments_portfolio_account_identity_unique`;
--> statement-breakpoint
UPDATE `instruments`
SET `account_id` = (
	SELECT p.code || ':unknown'
	FROM `portfolios` p
	WHERE p.id = `instruments`.`portfolio_id`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instruments_portfolio_identity_unique` ON `instruments` (
	`portfolio_id`,
	`name`,
	`instrument_type`,
	`currency`,
	coalesce(`external_id`, '')
);
