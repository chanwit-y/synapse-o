CREATE TABLE `collection` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`directories` text
);
--> statement-breakpoint
CREATE TABLE `file` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text,
	`name` text,
	`type` text,
	`extension` text,
	`content` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`collection_id`) REFERENCES `collection`(`id`) ON UPDATE no action ON DELETE no action
);
