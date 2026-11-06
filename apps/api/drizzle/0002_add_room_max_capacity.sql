ALTER TABLE `rooms` ADD `max_capacity` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `rooms_max_capacity_idx` ON `rooms` (`max_capacity`);