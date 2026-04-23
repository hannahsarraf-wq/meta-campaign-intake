import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { getDb } from "./db";
import { users, campaigns, adSets } from "./schema";
import { validateAdAccount, pushCampaignToMeta } from "./meta-api";
import { generateExcelFile } from "./excel";
import { buildClearCookie, COOKIE_NAME } from "./sdk";

function normalizeDateTime(dt?: string | null): string | null {
  if (!dt) return null;
  // datetime-local inputs emit "YYYY-MM-DDTHH:MM" (16 chars) — pad to full ISO with seconds
  return dt.length === 16 ? `${dt}:00` : dt;
}

function sanitizeAdSet(adSet: {
  adSetName: string; adSetRunStatus: string;
  adSetTimeStart?: string; adSetTimeStop?: string;
  adSetDailyBudget?: number; adSetLifetimeBudget?: number;
  adSetBidStrategy: string; minimumROAS?: number;
  link?: string; optimizationGoal: string; billingEvent: string;
  country?: string; geoType?: string; geoLocation?: string;
  ageRange?: string; gender?: string;
}) {
  return {
    adSetName: adSet.adSetName.trim(),
    adSetRunStatus: adSet.adSetRunStatus,
    adSetTimeStart: normalizeDateTime(adSet.adSetTimeStart),
    adSetTimeStop: normalizeDateTime(adSet.adSetTimeStop),
    adSetDailyBudget: adSet.adSetDailyBudget || null,
    adSetLifetimeBudget: adSet.adSetLifetimeBudget || null,
    adSetBidStrategy: adSet.adSetBidStrategy || null,
    minimumROAS: adSet.minimumROAS || null,
    link: adSet.link || null,
    optimizationGoal: adSet.optimizationGoal || null,
    billingEvent: adSet.billingEvent || null,
    country: adSet.country || "United States",
    geoType: adSet.geoType || "city",
    geoLocation: adSet.geoLocation || null,
    ageRange: adSet.ageRange || null,
    gender: adSet.gender || "all",
  };
}

function sanitizeDraftAdSet(adSet: {
  adSetName: string; adSetRunStatus: string;
  adSetTimeStart?: string; adSetTimeStop?: string;
  adSetDailyBudget?: number; adSetLifetimeBudget?: number;
  adSetBidStrategy?: string; minimumROAS?: number;
  link?: string; optimizationGoal?: string; billingEvent?: string;
  country?: string; geoType?: string; geoLocation?: string;
  ageRange?: string; gender?: string;
}) {
  return {
    adSetName: adSet.adSetName.trim(),
    adSetRunStatus: adSet.adSetRunStatus,
    adSetTimeStart: normalizeDateTime(adSet.adSetTimeStart),
    adSetTimeStop: normalizeDateTime(adSet.adSetTimeStop),
    adSetDailyBudget: adSet.adSetDailyBudget || null,
    adSetLifetimeBudget: adSet.adSetLifetimeBudget || null,
    adSetBidStrategy: adSet.adSetBidStrategy || null,
    minimumROAS: adSet.minimumROAS || null,
    link: adSet.link || null,
    optimizationGoal: adSet.optimizationGoal || null,
    billingEvent: adSet.billingEvent || null,
    country: adSet.country || "United States",
    geoType: adSet.geoType || "city",
    geoLocation: adSet.geoLocation || null,
    ageRange: adSet.ageRange || null,
    gender: adSet.gender || "all",
  };
}

const adSetSchema = z.object({
  adSetName: z.string().min(1).max(255),
  adSetRunStatus: z.string(),
  adSetTimeStart: z.string().optional(),
  adSetTimeStop: z.string().optional(),
  adSetDailyBudget: z.number().optional(),
  adSetLifetimeBudget: z.number().optional(),
  adSetBidStrategy: z.string(),
  minimumROAS: z.number().optional(),
  link: z.string().url().optional(),
  optimizationGoal: z.string(),
  billingEvent: z.string(),
  country: z.string().optional(),
  geoType: z.string().optional(),
  geoLocation: z.string().optional(),
  ageRange: z.string().optional(),
  gender: z.string().optional(),
});

const campaignBaseSchema = z.object({
  campaignName: z.string().min(1).max(255),
  campaignStatus: z.string(),
  specialAdCategories: z.string().optional(),
  specialAdCategoryCountry: z.string().optional(),
  campaignObjective: z.string(),
  buyingType: z.string(),
  campaignSpendLimit: z.number().optional(),
  campaignDailyBudget: z.number().optional(),
  campaignLifetimeBudget: z.number().optional(),
  campaignBidStrategy: z.string().optional(),
  budgetLevel: z.string(),
});

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),
  }),

  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.resHeaders.append("Set-Cookie", buildClearCookie(COOKIE_NAME));
      return { success: true } as const;
    }),
  }),

  campaigns: router({
    validateAdAccount: publicProcedure
      .input(z.object({ adAccountId: z.string().min(1) }))
      .query(({ ctx, input }) => validateAdAccount(ctx.env.META_ACCESS_TOKEN, input.adAccountId)),

    create: protectedProcedure
      .input(campaignBaseSchema.extend({ adSets: z.array(adSetSchema) }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const [insertedCampaign] = await db.insert(campaigns).values({
          userId: ctx.user.id, campaignName: input.campaignName, campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective, buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel, isDraft: 0,
        }).returning({ id: campaigns.id });
        const campaignId = insertedCampaign.id;
        const adSetIds: number[] = [];
        for (const adSet of input.adSets) {
          const [insertedAdSet] = await db.insert(adSets).values({
            campaignId, ...sanitizeAdSet(adSet),
          }).returning({ id: adSets.id });
          adSetIds.push(insertedAdSet.id);
        }
        return { campaignId, adSetIds };
      }),

    getWithAdSets: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
        if (!campaign) return null;
        const sets = await db.select().from(adSets).where(eq(adSets.campaignId, input.campaignId));
        return { ...campaign, adSets: sets };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const db = getDb(ctx.env);
      return db.select().from(campaigns).where(and(eq(campaigns.userId, ctx.user.id), eq(campaigns.isDraft, 0)));
    }),

    generateExcel: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
        if (!campaign) throw new Error("Campaign not found");
        const sets = await db.select().from(adSets).where(eq(adSets.campaignId, input.campaignId));
        const buf = generateExcelFile({ ...campaign, adSets: sets });
        // Avoid spread (...buf) — too many args for large files and fails on ArrayBuffer.
        let binaryStr = '';
        for (let i = 0; i < buf.length; i++) binaryStr += String.fromCharCode(buf[i]);
        const base64Data = btoa(binaryStr);
        return { success: true, fileName: `${campaign.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`, data: base64Data };
      }),

    pushToMeta: protectedProcedure
      .input(campaignBaseSchema.extend({ adAccountId: z.string().min(1), adSets: z.array(adSetSchema) }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const [insertedPushCampaign] = await db.insert(campaigns).values({
          userId: ctx.user.id, campaignName: input.campaignName, campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective, buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel, isDraft: 0,
        }).returning({ id: campaigns.id });
        const campaignId = insertedPushCampaign.id;
        for (const adSet of input.adSets) {
          await db.insert(adSets).values({ campaignId, ...sanitizeAdSet(adSet) }).run();
        }
        const metaResult = await pushCampaignToMeta(ctx.env.META_ACCESS_TOKEN, input.adAccountId, input, input.adSets);
        return { campaignId, ...metaResult };
      }),

    saveDraft: protectedProcedure
      .input(campaignBaseSchema.partial().extend({
        campaignName: z.string().min(1).max(255),
        budgetLevel: z.string(),
        campaignId: z.number().optional(),
        adSets: z.array(adSetSchema.partial().extend({ adSetName: z.string().min(1), adSetRunStatus: z.string() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        let campaignId: number;
        if (input.campaignId) {
          await db.update(campaigns).set({
            campaignName: input.campaignName, campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null, buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel, updatedAt: new Date().toISOString(),
          }).where(eq(campaigns.id, input.campaignId));
          campaignId = input.campaignId;
          await db.delete(adSets).where(eq(adSets.campaignId, campaignId));
        } else {
          const [insertedDraft] = await db.insert(campaigns).values({
            userId: ctx.user.id, campaignName: input.campaignName, campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null, buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel, isDraft: 1,
          }).returning({ id: campaigns.id });
          campaignId = insertedDraft.id;
        }
        const adSetIds: number[] = [];
        for (const adSet of input.adSets || []) {
          const [insertedAdSet] = await db.insert(adSets).values({
            campaignId, ...sanitizeDraftAdSet(adSet),
          }).returning({ id: adSets.id });
          adSetIds.push(insertedAdSet.id);
        }
        return { campaignId, adSetIds, isDraft: true };
      }),

    listDrafts: protectedProcedure.query(async ({ ctx }) => {
      const db = getDb(ctx.env);
      const drafts = await db.select().from(campaigns).where(and(eq(campaigns.userId, ctx.user.id), eq(campaigns.isDraft, 1)));
      return Promise.all(drafts.map(async (draft) => {
        const sets = await db.select({ id: adSets.id }).from(adSets).where(eq(adSets.campaignId, draft.id));
        return { ...draft, adSetCount: sets.length };
      }));
    }),

    deleteDraft: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        await db.delete(campaigns).where(eq(campaigns.id, input.campaignId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
