CREATE TABLE `portfolios` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolios_code_unique` ON `portfolios` (`code`);
--> statement-breakpoint
CREATE TABLE `instruments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`instrument_type` text DEFAULT 'mutual_fund' NOT NULL,
	`currency` text DEFAULT 'JPY' NOT NULL,
	`external_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classification_schemes` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classification_schemes_portfolio_code_unique` ON `classification_schemes` (`portfolio_id`,`code`);
--> statement-breakpoint
CREATE TABLE `classification_values` (
	`id` text PRIMARY KEY NOT NULL,
	`scheme_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`scheme_id`) REFERENCES `classification_schemes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classification_values_scheme_code_unique` ON `classification_values` (`scheme_id`,`code`);
--> statement-breakpoint
CREATE TABLE `instrument_classifications` (
	`instrument_id` text NOT NULL,
	`classification_value_id` text NOT NULL,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`classification_value_id`) REFERENCES `classification_values`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_classifications_unique` ON `instrument_classifications` (`instrument_id`,`classification_value_id`);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`as_of_date` text NOT NULL,
	`is_current` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `portfolio_snapshots_portfolio_current_idx` ON `portfolio_snapshots` (`portfolio_id`,`is_current`);
--> statement-breakpoint
CREATE TABLE `holding_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`instrument_id` text NOT NULL,
	`quantity` real NOT NULL,
	`market_value_minor` integer NOT NULL,
	`book_value_minor` integer,
	FOREIGN KEY (`snapshot_id`) REFERENCES `portfolio_snapshots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE restrict
);
