ALTER TABLE `campaigns` ADD `budgetLevel` varchar(64) DEFAULT 'ad_set' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `isDraft` int DEFAULT 0 NOT NULL;