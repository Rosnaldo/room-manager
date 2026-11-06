ALTER TABLE `rooms` ADD `capacity` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX `rooms_capacity_idx` ON `rooms` (`capacity`);