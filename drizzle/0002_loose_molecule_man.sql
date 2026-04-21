ALTER TABLE `adSets` ADD `country` varchar(255) DEFAULT 'United States' NOT NULL;--> statement-breakpoint
ALTER TABLE `adSets` ADD `geoType` varchar(64) DEFAULT 'city' NOT NULL;--> statement-breakpoint
ALTER TABLE `adSets` ADD `geoLocation` text;--> statement-breakpoint
ALTER TABLE `adSets` ADD `ageRange` varchar(64);--> statement-breakpoint
ALTER TABLE `adSets` ADD `gender` varchar(64) DEFAULT 'all';