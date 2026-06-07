CREATE TABLE `portfolio_snapshot_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`code` text NOT NULL,
	`integer_value` integer,
	`real_value` real,
	`text_value` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `portfolio_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `portfolio_snapshot_metrics_snapshot_code_unique` ON `portfolio_snapshot_metrics` (`snapshot_id`,`code`);
