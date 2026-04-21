import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import type { Pool } from "mysql2/promise";
import { InsertUser, users, campaigns, adSets, Campaign, AdSet } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: any = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Create explicit mysql2 pool to ensure consistent result format
      const pool = mysql.createPool(process.env.DATABASE_URL);
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Campaign queries
export async function createCampaign(data: {
  userId: number;
  campaignName: string;
  campaignStatus: string;
  specialAdCategories?: string | null;
  specialAdCategoryCountry?: string | null;
  campaignObjective: string;
  buyingType: string;
  campaignSpendLimit?: number | null;
  campaignDailyBudget?: number | null;
  campaignLifetimeBudget?: number | null;
  campaignBidStrategy?: string | null;
  budgetLevel: string;
  isDraft: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values(data);
  // Drizzle MySQL2 returns [ResultSetHeader, FieldPacket[]]
  const header = Array.isArray(result) ? result[0] : result;
  return (header as any).insertId || 0;
}

export async function createCampaignDraft(data: {
  userId: number;
  campaignName: string;
  campaignStatus?: string | null;
  specialAdCategories?: string | null;
  specialAdCategoryCountry?: string | null;
  campaignObjective?: string | null;
  buyingType?: string | null;
  campaignSpendLimit?: number | null;
  campaignDailyBudget?: number | null;
  campaignLifetimeBudget?: number | null;
  campaignBidStrategy?: string | null;
  budgetLevel: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values({
    ...data,
    isDraft: 1,
  });
  // Drizzle MySQL2 returns [ResultSetHeader, FieldPacket[]]
  const header = Array.isArray(result) ? result[0] : result;
  return (header as any).insertId || 0;
}

export async function updateCampaignDraft(campaignId: number, data: {
  campaignName: string;
  campaignStatus?: string | null;
  specialAdCategories?: string | null;
  specialAdCategoryCountry?: string | null;
  campaignObjective?: string | null;
  buyingType?: string | null;
  campaignSpendLimit?: number | null;
  campaignDailyBudget?: number | null;
  campaignLifetimeBudget?: number | null;
  campaignBidStrategy?: string | null;
  budgetLevel: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(campaigns).set(data).where(eq(campaigns.id, campaignId));
}

export async function getCampaignsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.isDraft, 0)));
}

export async function getDraftCampaignsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(campaigns).where(and(eq(campaigns.userId, userId), eq(campaigns.isDraft, 1)));
}

export async function getCampaignWithAdSets(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign.length) return null;

  const adSetsList = await db.select().from(adSets).where(eq(adSets.campaignId, campaignId));

  return {
    ...campaign[0],
    adSets: adSetsList,
  };
}

export async function updateCampaign(campaignId: number, data: Partial<Campaign>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(campaigns).set(data).where(eq(campaigns.id, campaignId));
}

export async function deleteCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(campaigns).where(eq(campaigns.id, campaignId));
}

// Ad Set queries
export async function createAdSet(data: {
  campaignId: number;
  adSetName: string;
  adSetRunStatus?: string | null;
  adSetTimeStart?: string | null;
  adSetTimeStop?: string | null;
  adSetDailyBudget?: number | null;
  adSetLifetimeBudget?: number | null;
  adSetBidStrategy?: string | null;
  minimumROAS?: number | null;
  link?: string | null;
  optimizationGoal?: string | null;
  billingEvent?: string | null;
  country?: string;
  geoType?: string;
  geoLocation?: string | null;
  ageRange?: string | null;
  gender?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(adSets).values(data);
  // Drizzle MySQL2 returns [ResultSetHeader, FieldPacket[]]
  const header = Array.isArray(result) ? result[0] : result;
  return (header as any).insertId || 0;
}

export async function getAdSetsByCampaign(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(adSets).where(eq(adSets.campaignId, campaignId));
}

export async function updateAdSet(adSetId: number, data: Partial<AdSet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(adSets).set(data).where(eq(adSets.id, adSetId));
}

export async function deleteAdSet(adSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(adSets).where(eq(adSets.id, adSetId));
}

export async function deleteAdSetsByCampaignId(campaignId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(adSets).where(eq(adSets.campaignId, campaignId));
}
