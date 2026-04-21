ALTER TABLE `adSets` MODIFY COLUMN `adSetRunStatus` varchar(64);--> statement-breakpoint
ALTER TABLE `adSets` MODIFY COLUMN `adSetBidStrategy` varchar(255);--> statement-breakpoint
ALTER TABLE `adSets` MODIFY COLUMN `optimizationGoal` varchar(255);--> statement-breakpoint
ALTER TABLE `adSets` MODIFY COLUMN `billingEvent` varchar(255);--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `campaignStatus` varchar(64);--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `campaignObjective` varchar(255);--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `buyingType` varchar(64);