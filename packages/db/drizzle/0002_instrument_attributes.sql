CREATE TABLE `instrument_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`instrument_id` text NOT NULL,
	`code` text NOT NULL,
	`integer_value` integer,
	`real_value` real,
	`text_value` text,
	FOREIGN KEY (`instrument_id`) REFERENCES `instruments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `instrument_attributes_instrument_code_unique` ON `instrument_attributes` (`instrument_id`,`code`);
