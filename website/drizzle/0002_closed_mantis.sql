CREATE TABLE `football_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`name_ar` text NOT NULL,
	`name_en` text NOT NULL,
	`image_key` text,
	`image_source` text,
	`image_license` text,
	`fallback` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_football_entities_type` ON `football_entities` (`entity_type`);--> statement-breakpoint
CREATE TABLE `football_relations` (
	`id` text PRIMARY KEY NOT NULL,
	`from_entity_id` text NOT NULL,
	`to_entity_id` text NOT NULL,
	`relation_type` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`from_entity_id`) REFERENCES `football_entities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_entity_id`) REFERENCES `football_entities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_football_relations_from_type` ON `football_relations` (`from_entity_id`,`relation_type`);--> statement-breakpoint
CREATE INDEX `idx_football_relations_to_type` ON `football_relations` (`to_entity_id`,`relation_type`);--> statement-breakpoint
CREATE TABLE `mini_game_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`config` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mini_game_rooms_owner` ON `mini_game_rooms` (`owner_id`,`status`);--> statement-breakpoint
CREATE TABLE `mini_game_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`game_slug` text NOT NULL,
	`difficulty` text NOT NULL,
	`prompt` text NOT NULL,
	`solution` text NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_mini_game_rounds_pool` ON `mini_game_rounds` (`game_slug`,`status`,`difficulty`);