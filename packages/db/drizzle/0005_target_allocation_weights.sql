CREATE TABLE `target_allocation_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`portfolio_id` text NOT NULL,
	`scheme_code` text NOT NULL,
	`value_code` text NOT NULL,
	`target_ratio` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`portfolio_id`) REFERENCES `portfolios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `target_allocation_weights_unique` ON `target_allocation_weights` (`portfolio_id`,`scheme_code`,`value_code`);
