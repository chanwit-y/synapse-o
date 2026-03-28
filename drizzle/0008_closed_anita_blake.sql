CREATE TABLE `sub_file` (
	`id` text PRIMARY KEY NOT NULL,
	`file_id` text,
	`content_file_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`file_id`) REFERENCES `file`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`content_file_id`) REFERENCES `file`(`id`) ON UPDATE no action ON DELETE no action
);
