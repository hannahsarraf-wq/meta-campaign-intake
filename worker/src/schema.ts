import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
  lastSignedIn: text("lastSignedIn").notNull().default(sql`(datetime('now'))`),
});

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  campaignName: text("campaignName").notNull(),
  campaignStatus: text("campaignStatus"),
  specialAdCategories: text("specialAdCategories"),
  specialAdCategoryCountry: text("specialAdCategoryCountry"),
  campaignObjective: text("campaignObjective"),
  buyingType: text("buyingType"),
  campaignSpendLimit: integer("campaignSpendLimit"),
  campaignDailyBudget: integer("campaignDailyBudget"),
  campaignLifetimeBudget: integer("campaignLifetimeBudget"),
  campaignBidStrategy: text("campaignBidStrategy"),
  budgetLevel: text("budgetLevel").notNull().default("ad_set"),
  isDraft: integer("isDraft").notNull().default(0),
  source: text("source").notNull().default("manual"),
  pushedAt: text("pushedAt"),
  pushedBy: text("pushedBy"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
});

export const adSets = sqliteTable("adSets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaignId")
    .notNull()
    .references(() => campaigns.id),
  adSetName: text("adSetName").notNull(),
  adSetRunStatus: text("adSetRunStatus"),
  adSetTimeStart: text("adSetTimeStart"),
  adSetTimeStop: text("adSetTimeStop"),
  adSetDailyBudget: integer("adSetDailyBudget"),
  adSetLifetimeBudget: integer("adSetLifetimeBudget"),
  adSetBidStrategy: text("adSetBidStrategy"),
  minimumROAS: integer("minimumROAS"),
  link: text("link"),
  optimizationGoal: text("optimizationGoal"),
  billingEvent: text("billingEvent"),
  country: text("country").notNull().default("United States"),
  geoType: text("geoType").notNull().default("city"),
  geoLocation: text("geoLocation"),
  ageRange: text("ageRange"),
  gender: text("gender").default("all"),
  createdAt: text("createdAt").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updatedAt").notNull().default(sql`(datetime('now'))`),
});

export const pushHistory = sqliteTable("push_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  campaignId: integer("campaignId").notNull().references(() => campaigns.id),
  userId: integer("userId").notNull().references(() => users.id),
  metaCampaignId: text("metaCampaignId").notNull(),
  metaAdSetIds: text("metaAdSetIds").notNull(),
  pushedAt: text("pushedAt").notNull().default(sql`(datetime('now'))`),
  campaignSnapshot: text("campaignSnapshot").notNull(),
  userEmail: text("userEmail"),
  userName: text("userName"),
  campaignName: text("campaignName").notNull(),
});

export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type AdSet = typeof adSets.$inferSelect;
export type PushHistory = typeof pushHistory.$inferSelect;
