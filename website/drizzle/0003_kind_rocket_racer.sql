CREATE TABLE `mini_game_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `mini_game_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mini_game_events_room` ON `mini_game_events` (`room_id`,`id`);--> statement-breakpoint
CREATE TABLE `mini_game_members` (
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`team` integer NOT NULL,
	`name` text NOT NULL,
	`kicked` integer DEFAULT 0 NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`room_id`, `user_id`),
	FOREIGN KEY (`room_id`) REFERENCES `mini_game_rooms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mini_game_members_seen` ON `mini_game_members` (`room_id`,`last_seen`);--> statement-breakpoint
ALTER TABLE `mini_game_rounds` ADD `accepted` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `mini_game_rounds` ADD `explanation` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `mini_game_rounds` ADD `visual_data` text DEFAULT '{}' NOT NULL;