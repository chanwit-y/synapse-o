CREATE TABLE `rag_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`rag_name` text NOT NULL,
	`collection` text NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_by` text NOT NULL
);
