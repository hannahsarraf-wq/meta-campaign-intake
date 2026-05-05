import { z } from "zod";
import { eq, and, desc, gte } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
import { getDb } from "./db";
import { users, campaigns, adSets, pushHistory } from "./schema";
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
        let binaryStr = '';
        for (let i = 0; i < buf.length; i++) binaryStr += String.fromCharCode(buf[i]);
        const base64Data = btoa(binaryStr);
        return { success: true, fileName: `${campaign.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`, data: base64Data };
      }),

    generateExcelFromData: protectedProcedure
      .input(campaignBaseSchema.extend({ adSets: z.array(adSetSchema.partial().extend({ adSetName: z.string().min(1), adSetRunStatus: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        const buf = generateExcelFile({
          id: 0, userId: ctx.user.id, isDraft: 0, source: "manual", pushedAt: null, pushedBy: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          campaignName: input.campaignName, campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective, buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel,
          adSets: input.adSets.map(s => ({
            id: 0, campaignId: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            ...sanitizeDraftAdSet(s),
          })),
        });
        let binaryStr = '';
        for (let i = 0; i < buf.length; i++) binaryStr += String.fromCharCode(buf[i]);
        const base64Data = btoa(binaryStr);
        return { success: true, fileName: `${input.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`, data: base64Data };
      }),

    saveCampaign: protectedProcedure
      .input(campaignBaseSchema.extend({
        campaignId: z.number().optional(),
        source: z.string().optional(),
        adSets: z.array(adSetSchema.partial().extend({ adSetName: z.string().min(1), adSetRunStatus: z.string() })),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        let campaignId: number;
        const now = new Date().toISOString();
        if (input.campaignId) {
          await db.update(campaigns).set({
            campaignName: input.campaignName, campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null, buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel, isDraft: 0, source: input.source || "manual", updatedAt: now,
          }).where(eq(campaigns.id, input.campaignId));
          campaignId = input.campaignId;
          await db.delete(adSets).where(eq(adSets.campaignId, campaignId));
        } else {
          const [inserted] = await db.insert(campaigns).values({
            userId: ctx.user.id, campaignName: input.campaignName, campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null, buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel, isDraft: 0, source: input.source || "manual",
          }).returning({ id: campaigns.id });
          campaignId = inserted.id;
        }
        for (const adSet of input.adSets) {
          await db.insert(adSets).values({ campaignId, ...sanitizeDraftAdSet(adSet) }).run();
        }
        return { campaignId };
      }),

    listSaved: protectedProcedure.query(async ({ ctx }) => {
      const db = getDb(ctx.env);
      const saved = await db.select().from(campaigns).where(and(eq(campaigns.userId, ctx.user.id), eq(campaigns.isDraft, 0)));
      return Promise.all(saved.map(async (c) => {
        const sets = await db.select({ id: adSets.id }).from(adSets).where(eq(adSets.campaignId, c.id));
        return { ...c, adSetCount: sets.length };
      }));
    }),

    deleteCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        await db.delete(adSets).where(eq(adSets.campaignId, input.campaignId));
        await db.delete(campaigns).where(and(eq(campaigns.id, input.campaignId), eq(campaigns.userId, ctx.user.id)));
        return { success: true };
      }),

    duplicateCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const [original] = await db.select().from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
        if (!original) throw new Error("Campaign not found");
        const sets = await db.select().from(adSets).where(eq(adSets.campaignId, input.campaignId));
        const [newCampaign] = await db.insert(campaigns).values({
          userId: ctx.user.id,
          campaignName: `${original.campaignName} Copy`,
          campaignStatus: original.campaignStatus,
          specialAdCategories: original.specialAdCategories,
          specialAdCategoryCountry: original.specialAdCategoryCountry,
          campaignObjective: original.campaignObjective,
          buyingType: original.buyingType,
          campaignSpendLimit: original.campaignSpendLimit,
          campaignDailyBudget: original.campaignDailyBudget,
          campaignLifetimeBudget: original.campaignLifetimeBudget,
          campaignBidStrategy: original.campaignBidStrategy,
          budgetLevel: original.budgetLevel,
          isDraft: 1,
          source: "duplicate",
        }).returning({ id: campaigns.id });
        for (const s of sets) {
          await db.insert(adSets).values({
            campaignId: newCampaign.id, adSetName: s.adSetName, adSetRunStatus: s.adSetRunStatus,
            adSetTimeStart: s.adSetTimeStart, adSetTimeStop: s.adSetTimeStop,
            adSetDailyBudget: s.adSetDailyBudget, adSetLifetimeBudget: s.adSetLifetimeBudget,
            adSetBidStrategy: s.adSetBidStrategy, minimumROAS: s.minimumROAS,
            link: s.link, optimizationGoal: s.optimizationGoal, billingEvent: s.billingEvent,
            country: s.country, geoType: s.geoType, geoLocation: s.geoLocation,
            ageRange: s.ageRange, gender: s.gender,
          }).run();
        }
        return { campaignId: newCampaign.id };
      }),

    pushToMeta: protectedProcedure
      .input(campaignBaseSchema.extend({ adAccountId: z.string().min(1), adSets: z.array(adSetSchema) }))
      .mutation(async ({ ctx, input }) => {
        const db = getDb(ctx.env);
        const now = new Date().toISOString();
        const [insertedPushCampaign] = await db.insert(campaigns).values({
          userId: ctx.user.id, campaignName: input.campaignName, campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null, specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective, buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null, campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null, campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel, isDraft: 0, source: "push", pushedAt: now, pushedBy: ctx.user.name || ctx.user.email,
        }).returning({ id: campaigns.id });
        const campaignId = insertedPushCampaign.id;
        for (const adSet of input.adSets) {
          await db.insert(adSets).values({ campaignId, ...sanitizeAdSet(adSet) }).run();
        }
        const metaResult = await pushCampaignToMeta(ctx.env.META_ACCESS_TOKEN, input.adAccountId, input, input.adSets);
        await db.insert(pushHistory).values({
          campaignId,
          userId: ctx.user.id,
          metaCampaignId: metaResult.metaCampaignId || "unknown",
          metaAdSetIds: JSON.stringify(metaResult.metaAdSetIds || []),
          pushedAt: now,
          campaignSnapshot: JSON.stringify(input),
          userEmail: ctx.user.email,
          userName: ctx.user.name,
          campaignName: input.campaignName,
        }).run();
        return { campaignId, ...metaResult };
      }),

    listPushHistory: adminProcedure.query(async ({ ctx }) => {
      const db = getDb(ctx.env);
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return db.select().from(pushHistory).where(gte(pushHistory.pushedAt, since)).orderBy(desc(pushHistory.pushedAt));
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
