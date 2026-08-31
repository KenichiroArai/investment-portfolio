CREATE TABLE `classification_value_links` (
	`parent_value_id` text NOT NULL,
	`child_value_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`parent_value_id`) REFERENCES `classification_values`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_value_id`) REFERENCES `classification_values`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classification_value_links_unique` ON `classification_value_links` (`parent_value_id`,`child_value_id`);
