CREATE TABLE `adSets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`adSetName` varchar(255) NOT NULL,
	`adSetRunStatus` varchar(64) NOT NULL,
	`adSetTimeStart` varchar(64),
	`adSetTimeStop` varchar(64),
	`adSetDailyBudget` int,
	`adSetLifetimeBudget` int,
	`adSetBidStrategy` varchar(255) NOT NULL,
	`minimumROAS` int,
	`link` varchar(2048),
	`optimizationGoal` varchar(255) NOT NULL,
	`billingEvent` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adSets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`campaignName` varchar(255) NOT NULL,
	`campaignStatus` varchar(64) NOT NULL,
	`specialAdCategories` varchar(255),
	`specialAdCategoryCountry` varchar(64),
	`campaignObjective` varchar(255) NOT NULL,
	`buyingType` varchar(64) NOT NULL,
	`campaignSpendLimit` int,
	`campaignDailyBudget` int,
	`campaignLifetimeBudget` int,
	`campaignBidStrategy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `adSets` ADD CONSTRAINT `adSets_campaignId_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;