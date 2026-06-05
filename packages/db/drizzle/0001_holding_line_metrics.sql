ALTER TABLE `holding_lines` ADD `sort_order` integer;
--> statement-breakpoint
CREATE TABLE `holding_line_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`holding_line_id` text NOT NULL,
	`code` text NOT NULL,
	`integer_value` integer,
	`real_value` real,
	`text_value` text,
	FOREIGN KEY (`holding_line_id`) REFERENCES `holding_lines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holding_line_metrics_line_code_unique` ON `holding_line_metrics` (`holding_line_id`,`code`);
