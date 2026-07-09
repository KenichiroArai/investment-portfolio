CREATE TABLE `instrument_migration_map` (
	`old_instrument_id` text NOT NULL,
	`portfolio_id` text NOT NULL,
	`account_id` text NOT NULL,
	`new_instrument_id` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `instrument_migration_map` (`old_instrument_id`, `portfolio_id`, `account_id`, `new_instrument_id`)
SELECT
	usage.old_instrument_id,
	usage.portfolio_id,
	usage.account_id,
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS new_instrument_id
FROM (
	SELECT DISTINCT
		hl.instrument_id AS old_instrument_id,
		ps.portfolio_id AS portfolio_id,
		hl.account_id AS account_id
	FROM `holding_lines` hl
	INNER JOIN `portfolio_snapshots` ps ON ps.id = hl.snapshot_id
	UNION
	SELECT DISTINCT
		tpw.instrument_id AS old_instrument_id,
		tpw.portfolio_id AS portfolio_id,
		p.code || ':unknown' AS account_id
	FROM `target_portfolio_weights` tpw
	INNER JOIN `portfolios` p ON p.id = tpw.portfolio_id
) usage;
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_migration_map_unique` ON `instrument_migration_map` (`old_instrument_id`, `portfolio_id`, `account_id`);
--> statement-breakpoint
CREATE TABLE `instruments_new` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`instrument_type` text DEFAULT 'mutual_fund' NOT NULL,
	`currency` text DEFAULT 'JPY' NOT NULL,
	`external_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `instruments_new` (`id`, `portfolio_id`, `account_id`, `name`, `instrument_type`, `currency`, `external_id`, `created_at`)
SELECT
	map.new_instrument_id,
	map.portfolio_id,
	map.account_id,
	i.name,
	i.instrument_type,
	i.currency,
	i.external_id,
	i.created_at
FROM `instrument_migration_map` map
INNER JOIN `instruments` i ON i.id = map.old_instrument_id;
--> statement-breakpoint
CREATE INDEX `instruments_portfolio_account_idx` ON `instruments_new` (`portfolio_id`, `account_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `instruments_portfolio_account_identity_unique` ON `instruments_new` (
	`portfolio_id`,
	`account_id`,
	`name`,
	`instrument_type`,
	`currency`,
	coalesce(`external_id`, '')
);
--> statement-breakpoint
CREATE TABLE `holding_lines_new` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`instrument_id` text NOT NULL,
	`account_id` text DEFAULT 'monex:unknown' NOT NULL,
	`account_name` text DEFAULT '不明口座' NOT NULL,
	`sort_order` integer,
	`quantity` real NOT NULL,
	`market_value_minor` integer NOT NULL,
	`book_value_minor` integer,
	FOREIGN KEY (`snapshot_id`) REFERENCES `portfolio_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments_new`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `holding_lines_new` (
	`id`,
	`snapshot_id`,
	`instrument_id`,
	`account_id`,
	`account_name`,
	`sort_order`,
	`quantity`,
	`market_value_minor`,
	`book_value_minor`
)
SELECT
	hl.id,
	hl.snapshot_id,
	map.new_instrument_id,
	hl.account_id,
	hl.account_name,
	hl.sort_order,
	hl.quantity,
	hl.market_value_minor,
	hl.book_value_minor
FROM `holding_lines` hl
INNER JOIN `portfolio_snapshots` ps ON ps.id = hl.snapshot_id
INNER JOIN `instrument_migration_map` map ON
	map.old_instrument_id = hl.instrument_id
	AND map.portfolio_id = ps.portfolio_id
	AND map.account_id = hl.account_id;
--> statement-breakpoint
CREATE INDEX `holding_lines_new_snapshot_account_idx` ON `holding_lines_new` (`snapshot_id`, `account_id`);
--> statement-breakpoint
CREATE TABLE `holding_line_metrics_new` (
	`id` text PRIMARY KEY NOT NULL,
	`holding_line_id` text NOT NULL,
	`code` text NOT NULL,
	`integer_value` integer,
	`real_value` real,
	`text_value` text,
	FOREIGN KEY (`holding_line_id`) REFERENCES `holding_lines_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `holding_line_metrics_new` (`id`, `holding_line_id`, `code`, `integer_value`, `real_value`, `text_value`)
SELECT m.id, m.holding_line_id, m.code, m.integer_value, m.real_value, m.text_value
FROM `holding_line_metrics` m
INNER JOIN `holding_lines_new` hl ON hl.id = m.holding_line_id;
--> statement-breakpoint
CREATE UNIQUE INDEX `holding_line_metrics_new_line_code_unique` ON `holding_line_metrics_new` (`holding_line_id`, `code`);
--> statement-breakpoint
DROP TABLE `holding_line_metrics`;
--> statement-breakpoint
DROP TABLE `holding_lines`;
--> statement-breakpoint
ALTER TABLE `holding_lines_new` RENAME TO `holding_lines`;
--> statement-breakpoint
CREATE INDEX `holding_lines_snapshot_account_idx` ON `holding_lines` (`snapshot_id`, `account_id`);
--> statement-breakpoint
ALTER TABLE `holding_line_metrics_new` RENAME TO `holding_line_metrics`;
--> statement-breakpoint
CREATE UNIQUE INDEX `holding_line_metrics_line_code_unique` ON `holding_line_metrics` (`holding_line_id`, `code`);
--> statement-breakpoint
CREATE TABLE `target_portfolio_weights_new` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`instrument_id` text NOT NULL,
	`target_ratio` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `target_portfolio_weights_new` (`id`, `portfolio_id`, `instrument_id`, `target_ratio`, `updated_at`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS id,
	rows.portfolio_id,
	rows.instrument_id,
	sum(rows.target_ratio) AS target_ratio,
	max(rows.updated_at) AS updated_at
FROM (
	SELECT
		tpw.portfolio_id AS portfolio_id,
		coalesce(
			(
				SELECT map.new_instrument_id
				FROM `instrument_migration_map` map
				INNER JOIN `portfolios` p ON p.id = tpw.portfolio_id
				WHERE
					map.old_instrument_id = tpw.instrument_id
					AND map.portfolio_id = tpw.portfolio_id
					AND map.account_id = p.code || ':unknown'
				LIMIT 1
			),
			tpw.instrument_id
		) AS instrument_id,
		tpw.target_ratio AS target_ratio,
		tpw.updated_at AS updated_at
	FROM `target_portfolio_weights` tpw
) rows
GROUP BY rows.portfolio_id, rows.instrument_id;
--> statement-breakpoint
CREATE UNIQUE INDEX `target_portfolio_weights_new_unique` ON `target_portfolio_weights_new` (`portfolio_id`, `instrument_id`);
--> statement-breakpoint
CREATE TABLE `instrument_attributes_new` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`code` text NOT NULL,
	`integer_value` integer,
	`real_value` real,
	`text_value` text,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments_new`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `instrument_attributes_new` (`id`, `instrument_id`, `code`, `integer_value`, `real_value`, `text_value`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', (abs(random()) % 4) + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))) AS id,
	map.new_instrument_id AS instrument_id,
	ia.code,
	ia.integer_value,
	ia.real_value,
	ia.text_value
FROM `instrument_attributes` ia
INNER JOIN `instrument_migration_map` map ON map.old_instrument_id = ia.instrument_id;
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_attributes_new_instrument_code_unique` ON `instrument_attributes_new` (`instrument_id`, `code`);
--> statement-breakpoint
CREATE TABLE `instrument_classifications_new` (
	`instrument_id` text NOT NULL,
	`classification_value_id` text NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments_new`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classification_value_id`) REFERENCES `classification_values`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `instrument_classifications_new` (`instrument_id`, `classification_value_id`)
SELECT
	map.new_instrument_id AS instrument_id,
	ic.classification_value_id
FROM `instrument_classifications` ic
INNER JOIN `instrument_migration_map` map ON map.old_instrument_id = ic.instrument_id;
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_classifications_new_unique` ON `instrument_classifications_new` (`instrument_id`, `classification_value_id`);
--> statement-breakpoint
DROP TABLE `instrument_attributes`;
--> statement-breakpoint
ALTER TABLE `instrument_attributes_new` RENAME TO `instrument_attributes`;
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_attributes_instrument_code_unique` ON `instrument_attributes` (`instrument_id`, `code`);
--> statement-breakpoint
DROP TABLE `instrument_classifications`;
--> statement-breakpoint
ALTER TABLE `instrument_classifications_new` RENAME TO `instrument_classifications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_classifications_unique` ON `instrument_classifications` (`instrument_id`, `classification_value_id`);
--> statement-breakpoint
DROP TABLE `target_portfolio_weights`;
--> statement-breakpoint
ALTER TABLE `target_portfolio_weights_new` RENAME TO `target_portfolio_weights`;
--> statement-breakpoint
CREATE UNIQUE INDEX `target_portfolio_weights_unique` ON `target_portfolio_weights` (`portfolio_id`, `instrument_id`);
--> statement-breakpoint
DROP TABLE `instruments`;
--> statement-breakpoint
ALTER TABLE `instruments_new` RENAME TO `instruments`;
--> statement-breakpoint
DELETE FROM `instrument_migration_map`;
--> statement-breakpoint
DROP TABLE `instrument_migration_map`;
