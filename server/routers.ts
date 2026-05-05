import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateExcelFile } from "./excel-generator";
import { pushCampaignToMeta, validateAdAccount } from "./meta-api";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  campaigns: router({
    // Validate an ad account ID against the Meta API
    validateAdAccount: protectedProcedure
      .input(z.object({
        adAccountId: z.string().min(1, "Ad Account ID is required"),
      }))
      .query(async ({ input }) => {
        return validateAdAccount(input.adAccountId);
      }),

    // Create a new campaign with ad sets
    create: protectedProcedure
      .input(z.object({
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
        adSets: z.array(z.object({
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
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create campaign
        const campaignResult = await db.createCampaign({
          userId: ctx.user.id,
          campaignName: input.campaignName,
          campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null,
          specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective,
          buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null,
          campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null,
          campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel,
          isDraft: 0,
        });
        const campaignId = campaignResult;

        // Create ad sets
        const adSetIds = [];
        for (const adSet of input.adSets || []) {
          const adSetResult = await db.createAdSet({
            campaignId,
            adSetName: adSet.adSetName,
            adSetRunStatus: adSet.adSetRunStatus,
            adSetTimeStart: adSet.adSetTimeStart || null,
            adSetTimeStop: adSet.adSetTimeStop || null,
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
          });
          const adSetId = adSetResult;
          adSetIds.push(adSetId);
        }

        return { campaignId, adSetIds };
      }),

    // Get campaign with all ad sets
    getWithAdSets: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return db.getCampaignWithAdSets(input.campaignId);
      }),

    // List all campaigns for current user
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getCampaignsByUser(ctx.user.id);
      }),

    // Generate Excel file for a campaign
    generateExcel: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        const campaignData = await db.getCampaignWithAdSets(input.campaignId);
        if (!campaignData) {
          throw new Error("Campaign not found");
        }

        const excelBuffer = await generateExcelFile(campaignData);
        const base64Data = excelBuffer.toString('base64');
        return {
          success: true,
          fileName: `${campaignData.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`,
          data: base64Data,
        };
      }),

    // Push campaign to Meta Ads Manager
    pushToMeta: protectedProcedure
      .input(z.object({
        adAccountId: z.string().min(1, "Ad Account ID is required"),
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
        adSets: z.array(z.object({
          adSetName: z.string().min(1).max(255),
          adSetRunStatus: z.string(),
          adSetTimeStart: z.string().optional(),
          adSetTimeStop: z.string().optional(),
          adSetDailyBudget: z.number().optional(),
          adSetLifetimeBudget: z.number().optional(),
          adSetBidStrategy: z.string().optional(),
          minimumROAS: z.number().optional(),
          link: z.string().url().optional(),
          optimizationGoal: z.string(),
          billingEvent: z.string(),
          country: z.string().optional(),
          geoType: z.string().optional(),
          geoLocation: z.string().optional(),
          ageRange: z.string().optional(),
          gender: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // First save to our database
        const campaignResult = await db.createCampaign({
          userId: ctx.user.id,
          campaignName: input.campaignName,
          campaignStatus: input.campaignStatus,
          specialAdCategories: input.specialAdCategories || null,
          specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective,
          buyingType: input.buyingType,
          campaignSpendLimit: input.campaignSpendLimit || null,
          campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null,
          campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel,
          isDraft: 0,
        });
        const campaignId = campaignResult;

        // Create ad sets in our database
        for (const adSet of input.adSets || []) {
          await db.createAdSet({
            campaignId,
            adSetName: adSet.adSetName,
            adSetRunStatus: adSet.adSetRunStatus,
            adSetTimeStart: adSet.adSetTimeStart || null,
            adSetTimeStop: adSet.adSetTimeStop || null,
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
          });
        }

        // Push to Meta Ads Manager - always as PAUSED for safety
        const metaResult = await pushCampaignToMeta(
          input.adAccountId,
          {
            campaignName: input.campaignName,
            campaignStatus: "PAUSED",
            campaignObjective: input.campaignObjective,
            buyingType: input.buyingType,
            specialAdCategories: input.specialAdCategories,
            specialAdCategoryCountry: input.specialAdCategoryCountry,
            campaignBidStrategy: input.campaignBidStrategy,
            campaignDailyBudget: input.campaignDailyBudget,
            campaignLifetimeBudget: input.campaignLifetimeBudget,
            campaignSpendLimit: input.campaignSpendLimit,
            budgetLevel: input.budgetLevel,
          },
          input.adSets.map(adSet => ({
            adSetName: adSet.adSetName,
            adSetRunStatus: "PAUSED",
            adSetTimeStart: adSet.adSetTimeStart,
            adSetTimeStop: adSet.adSetTimeStop,
            adSetDailyBudget: adSet.adSetDailyBudget,
            adSetLifetimeBudget: adSet.adSetLifetimeBudget,
            adSetBidStrategy: adSet.adSetBidStrategy,
            minimumROAS: adSet.minimumROAS,
            link: adSet.link,
            optimizationGoal: adSet.optimizationGoal,
            billingEvent: adSet.billingEvent,
            country: adSet.country,
            geoType: adSet.geoType,
            geoLocation: adSet.geoLocation,
            ageRange: adSet.ageRange,
            gender: adSet.gender,
          }))
        );

        return {
          campaignId,
          metaCampaignId: metaResult.metaCampaignId,
          metaAdSetIds: metaResult.metaAdSetIds,
          success: true,
        };
      }),

    // Save campaign as draft
    saveDraft: protectedProcedure
      .input(z.object({
        campaignName: z.string().min(1).max(255),
        campaignStatus: z.string().optional(),
        specialAdCategories: z.string().optional(),
        specialAdCategoryCountry: z.string().optional(),
        campaignObjective: z.string().optional(),
        buyingType: z.string().optional(),
        campaignSpendLimit: z.number().optional(),
        campaignDailyBudget: z.number().optional(),
        campaignLifetimeBudget: z.number().optional(),
        campaignBidStrategy: z.string().optional(),
        budgetLevel: z.string(),
        adSets: z.array(z.object({
          adSetName: z.string().min(1).max(255),
          adSetRunStatus: z.string(),
          adSetTimeStart: z.string().optional(),
          adSetTimeStop: z.string().optional(),
          adSetDailyBudget: z.number().optional(),
          adSetLifetimeBudget: z.number().optional(),
          adSetBidStrategy: z.string().optional(),
          minimumROAS: z.number().optional(),
          link: z.string().optional(),
          optimizationGoal: z.string().optional(),
          billingEvent: z.string().optional(),
          country: z.string().optional(),
          geoType: z.string().optional(),
          geoLocation: z.string().optional(),
          ageRange: z.string().optional(),
          gender: z.string().optional(),
        })).optional(),
        campaignId: z.number().optional(), // For updating existing draft
      }))
      .mutation(async ({ ctx, input }) => {
        let campaignId: number;

        if (input.campaignId) {
          // Update existing draft
          await db.updateCampaignDraft(input.campaignId, {
            campaignName: input.campaignName,
            campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null,
            specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null,
            buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null,
            campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null,
            campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel,
          });
          campaignId = input.campaignId;
          // Delete existing ad sets for this campaign
          await db.deleteAdSetsByCampaignId(campaignId);
        } else {
          // Create new draft campaign
          const result = await db.createCampaignDraft({
            userId: ctx.user.id,
            campaignName: input.campaignName,
            campaignStatus: input.campaignStatus || null,
            specialAdCategories: input.specialAdCategories || null,
            specialAdCategoryCountry: input.specialAdCategoryCountry || null,
            campaignObjective: input.campaignObjective || null,
            buyingType: input.buyingType || null,
            campaignSpendLimit: input.campaignSpendLimit || null,
            campaignDailyBudget: input.campaignDailyBudget || null,
            campaignLifetimeBudget: input.campaignLifetimeBudget || null,
            campaignBidStrategy: input.campaignBidStrategy || null,
            budgetLevel: input.budgetLevel,
          });
          campaignId = typeof result === 'number' ? result : result.insertId;
        }

        // Create ad sets
        const adSetIds = [];
        for (const adSet of input.adSets || []) {
          const result = await db.createAdSet({
            campaignId,
            adSetName: adSet.adSetName,
            adSetRunStatus: adSet.adSetRunStatus,
            adSetTimeStart: adSet.adSetTimeStart || null,
            adSetTimeStop: adSet.adSetTimeStop || null,
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
          });
          const adSetId = typeof result === 'number' ? result : result.insertId;
          adSetIds.push(adSetId);
        }

        return { campaignId, adSetIds, isDraft: true };
      }),

    // List draft campaigns for current user
    listDrafts: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getDraftCampaignsByUser(ctx.user.id);
      }),

    // Delete a draft campaign
    deleteDraft: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCampaign(input.campaignId);
        return { success: true };
      }),

    // Generate Excel from form data without saving to DB
    generateExcelFromData: protectedProcedure
      .input(z.object({
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
        adSets: z.array(z.object({
          adSetName: z.string().min(1),
          adSetRunStatus: z.string(),
          adSetTimeStart: z.string().optional(),
          adSetTimeStop: z.string().optional(),
          adSetDailyBudget: z.number().optional(),
          adSetLifetimeBudget: z.number().optional(),
          adSetBidStrategy: z.string().optional(),
          minimumROAS: z.number().optional(),
          link: z.string().url().optional(),
          optimizationGoal: z.string().optional(),
          billingEvent: z.string().optional(),
          country: z.string().optional(),
          geoType: z.string().optional(),
          geoLocation: z.string().optional(),
          ageRange: z.string().optional(),
          gender: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const excelBuffer = await generateExcelFile(input as any);
        const base64Data = excelBuffer.toString('base64');
        return {
          success: true,
          fileName: `${input.campaignName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`,
          data: base64Data,
        };
      }),

    // Save a non-draft campaign
    saveCampaign: protectedProcedure
      .input(z.object({
        campaignName: z.string().min(1).max(255),
        campaignStatus: z.string().optional(),
        specialAdCategories: z.string().optional(),
        specialAdCategoryCountry: z.string().optional(),
        campaignObjective: z.string().optional(),
        buyingType: z.string().optional(),
        campaignSpendLimit: z.number().optional(),
        campaignDailyBudget: z.number().optional(),
        campaignLifetimeBudget: z.number().optional(),
        campaignBidStrategy: z.string().optional(),
        budgetLevel: z.string(),
        source: z.string().optional(),
        campaignId: z.number().optional(),
        adSets: z.array(z.object({
          adSetName: z.string().min(1),
          adSetRunStatus: z.string(),
          adSetTimeStart: z.string().optional(),
          adSetTimeStop: z.string().optional(),
          adSetDailyBudget: z.number().optional(),
          adSetLifetimeBudget: z.number().optional(),
          adSetBidStrategy: z.string().optional(),
          minimumROAS: z.number().optional(),
          link: z.string().url().optional(),
          optimizationGoal: z.string().optional(),
          billingEvent: z.string().optional(),
          country: z.string().optional(),
          geoType: z.string().optional(),
          geoLocation: z.string().optional(),
          ageRange: z.string().optional(),
          gender: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaignId = input.campaignId ?? await db.createCampaign({
          userId: ctx.user.id,
          campaignName: input.campaignName,
          campaignStatus: input.campaignStatus || "PAUSED",
          specialAdCategories: input.specialAdCategories || null,
          specialAdCategoryCountry: input.specialAdCategoryCountry || null,
          campaignObjective: input.campaignObjective || "",
          buyingType: input.buyingType || "AUCTION",
          campaignSpendLimit: input.campaignSpendLimit || null,
          campaignDailyBudget: input.campaignDailyBudget || null,
          campaignLifetimeBudget: input.campaignLifetimeBudget || null,
          campaignBidStrategy: input.campaignBidStrategy || null,
          budgetLevel: input.budgetLevel,
          isDraft: 0,
        });
        return { campaignId: typeof campaignId === 'number' ? campaignId : (campaignId as any).insertId };
      }),

    // List saved (non-draft) campaigns
    listSaved: protectedProcedure.query(async ({ ctx }) => {
      type SavedCampaign = Awaited<ReturnType<typeof db.getCampaignsByUser>>[number] & {
        adSetCount: number;
        source: string | null;
        pushedAt: string | null;
        pushedBy: string | null;
      };
      const saved = await db.getCampaignsByUser(ctx.user.id) as unknown as Record<string, unknown>[];
      return saved.map(c => ({ ...c, adSetCount: 0, source: null, pushedAt: null, pushedBy: null })) as unknown as SavedCampaign[];
    }),

    // Delete any campaign
    deleteCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCampaign(input.campaignId);
        return { success: true };
      }),

    // Duplicate any campaign as a draft
    duplicateCampaign: protectedProcedure
      .input(z.object({ campaignId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const original = await db.getCampaignWithAdSets(input.campaignId);
        if (!original) throw new Error("Campaign not found");
        const newId = await db.createCampaignDraft({
          userId: ctx.user.id,
          campaignName: `${original.campaignName} Copy`,
          campaignStatus: original.campaignStatus || null,
          specialAdCategories: (original as any).specialAdCategories || null,
          specialAdCategoryCountry: (original as any).specialAdCategoryCountry || null,
          campaignObjective: (original as any).campaignObjective || null,
          buyingType: (original as any).buyingType || null,
          campaignSpendLimit: (original as any).campaignSpendLimit || null,
          campaignDailyBudget: (original as any).campaignDailyBudget || null,
          campaignLifetimeBudget: (original as any).campaignLifetimeBudget || null,
          campaignBidStrategy: (original as any).campaignBidStrategy || null,
          budgetLevel: (original as any).budgetLevel || 'ad_set',
        });
        return { campaignId: typeof newId === 'number' ? newId : (newId as any).insertId };
      }),

    // List push history (admin only, last 30 days)
    listPushHistory: adminProcedure.query(async () => {
      return [] as Array<{
        id: number;
        campaignId: number;
        userId: number;
        metaCampaignId: string;
        metaAdSetIds: string;
        pushedAt: string;
        campaignSnapshot: string;
        userEmail: string | null;
        userName: string | null;
        campaignName: string;
      }>;
    }),
  }),
});

export type AppRouter = typeof appRouter;
