import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Campaigns table for Meta Ads bulk upload intake
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  campaignName: varchar("campaignName", { length: 255 }).notNull(),
  campaignStatus: varchar("campaignStatus", { length: 64 }),
  specialAdCategories: varchar("specialAdCategories", { length: 255 }),
  specialAdCategoryCountry: varchar("specialAdCategoryCountry", { length: 64 }),
  campaignObjective: varchar("campaignObjective", { length: 255 }),
  buyingType: varchar("buyingType", { length: 64 }), // AUCTION, FIXED
  campaignSpendLimit: int("campaignSpendLimit"), // in cents
  campaignDailyBudget: int("campaignDailyBudget"), // in cents
  campaignLifetimeBudget: int("campaignLifetimeBudget"), // in cents
  campaignBidStrategy: varchar("campaignBidStrategy", { length: 255 }),
  budgetLevel: varchar("budgetLevel", { length: 64 }).default("ad_set").notNull(), // campaign or ad_set
  isDraft: int("isDraft").default(0).notNull(), // 0 = submitted, 1 = draft
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Ad Sets table for Meta Ads bulk upload intake
 */
export const adSets = mysqlTable("adSets", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  adSetName: varchar("adSetName", { length: 255 }).notNull(),
  adSetRunStatus: varchar("adSetRunStatus", { length: 64 }),
  adSetTimeStart: varchar("adSetTimeStart", { length: 64 }),
  adSetTimeStop: varchar("adSetTimeStop", { length: 64 }),
  adSetDailyBudget: int("adSetDailyBudget"),
  adSetLifetimeBudget: int("adSetLifetimeBudget"),
  adSetBidStrategy: varchar("adSetBidStrategy", { length: 255 }),
  minimumROAS: int("minimumROAS"),
  link: varchar("link", { length: 2048 }),
  optimizationGoal: varchar("optimizationGoal", { length: 255 }),
  billingEvent: varchar("billingEvent", { length: 255 }),
  // Geo targeting fields
  country: varchar("country", { length: 255 }).default("United States").notNull(),
  geoType: varchar("geoType", { length: 64 }).default("city").notNull(),
  geoLocation: text("geoLocation"),
  ageRange: varchar("ageRange", { length: 64 }),
  gender: varchar("gender", { length: 64 }).default("all"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdSet = typeof adSets.$inferSelect;
export type InsertAdSet = typeof adSets.$inferInsert;