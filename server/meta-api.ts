/**
 * Meta Marketing API Client
 * Handles campaign and ad set creation via the Meta Graph API
 */
import { ENV } from "./_core/env";

const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaApiResponse {
  id?: string;
  success?: boolean;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface MetaCampaignResult {
  id: string;
  success: boolean;
}

interface MetaAdSetResult {
  id: string;
  success: boolean;
}

/**
 * Map form objective names to Meta API objective enum values
 */
function mapObjectiveToApi(objective: string): string {
  const mapping: Record<string, string> = {
    "Outcome Awareness": "OUTCOME_AWARENESS",
    "Outcome Engagement": "OUTCOME_ENGAGEMENT",
    "Outcome Leads": "OUTCOME_LEADS",
    "Outcome Sales": "OUTCOME_SALES",
    "Outcome Traffic": "OUTCOME_TRAFFIC",
  };
  return mapping[objective] || objective;
}

/**
 * Map form bid strategy names to Meta API bid strategy enum values
 */
function mapBidStrategyToApi(bidStrategy: string): string {
  const mapping: Record<string, string> = {
    "Lowest Cost": "LOWEST_COST_WITHOUT_CAP",
    "Lowest Cost With Bid Cap": "LOWEST_COST_WITH_BID_CAP",
    "Target Cost": "COST_CAP",
    "Lowest Cost With Cost Cap": "COST_CAP",
    "Highest Value With Min ROAS": "LOWEST_COST_WITH_MIN_ROAS",
    "Cost per result goal": "COST_CAP",
    "ROAS goal": "LOWEST_COST_WITH_MIN_ROAS",
    "Highest volume or value": "LOWEST_COST_WITHOUT_CAP",
    "Bid Cap": "LOWEST_COST_WITH_BID_CAP",
  };
  return mapping[bidStrategy] || bidStrategy;
}

/**
 * Map form special ad category names to Meta API enum values
 */
function mapSpecialAdCategoryToApi(category: string): string[] {
  if (!category || category === "None") return ["NONE"];
  const mapping: Record<string, string> = {
    "financial_products_services": "FINANCIAL_PRODUCTS_SERVICES",
    "employment": "EMPLOYMENT",
    "housing": "HOUSING",
    "issues_elections_politics": "ISSUES_ELECTIONS_POLITICS",
  };
  return [mapping[category] || category.toUpperCase()];
}

/**
 * Map form status to Meta API status
 */
function mapStatusToApi(status: string): string {
  // Meta API only accepts ACTIVE or PAUSED during creation
  if (status === "ACTIVE") return "ACTIVE";
  return "PAUSED";
}

/**
 * Build geo targeting object for Meta API from form data
 */
function buildTargeting(adSet: {
  country?: string;
  geoType?: string;
  geoLocation?: string | null;
  ageRange?: string | null;
  gender?: string;
}): Record<string, any> {
  const targeting: Record<string, any> = {};

  // Geo locations
  const geoLocations: Record<string, any> = {};
  
  // Default to US if no country specified
  const countryCode = getCountryCode(adSet.country || "United States");
  
  if (adSet.geoLocation && adSet.geoType) {
    // For now, use country-level targeting and add location info
    // More granular targeting (city, zip) requires location key lookups via the Targeting Search API
    geoLocations.countries = [countryCode];
  } else {
    geoLocations.countries = [countryCode];
  }

  targeting.geo_locations = geoLocations;

  // Age range
  if (adSet.ageRange) {
    const parts = adSet.ageRange.split("-");
    if (parts.length === 2) {
      const minAge = parseInt(parts[0].trim(), 10);
      const maxAge = parseInt(parts[1].trim(), 10);
      if (!isNaN(minAge)) targeting.age_min = Math.max(18, minAge);
      if (!isNaN(maxAge)) targeting.age_max = Math.min(65, maxAge);
    }
  }

  // Gender (1 = male, 2 = female, [1,2] = all)
  if (adSet.gender === "male") {
    targeting.genders = [1];
  } else if (adSet.gender === "female") {
    targeting.genders = [2];
  }
  // "all" = don't set genders (defaults to all)

  return targeting;
}

/**
 * Get ISO country code from country name
 */
function getCountryCode(country: string): string {
  const mapping: Record<string, string> = {
    "United States": "US",
    "United Kingdom": "GB",
    "Canada": "CA",
    "Australia": "AU",
    "Germany": "DE",
    "France": "FR",
    "Spain": "ES",
    "Italy": "IT",
    "Brazil": "BR",
    "Mexico": "MX",
    "Japan": "JP",
    "India": "IN",
  };
  // If already a 2-letter code, return it
  if (country.length === 2) return country.toUpperCase();
  return mapping[country] || "US";
}

/**
 * Make a POST request to the Meta Marketing API
 */
async function metaApiPost(endpoint: string, params: Record<string, any>): Promise<MetaApiResponse> {
  const url = `${META_API_BASE}${endpoint}`;
  
  const formData = new URLSearchParams();
  formData.append("access_token", ENV.metaAccessToken);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }
  }

  console.log(`[Meta API] POST ${endpoint}`, Object.keys(params));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const data = await response.json() as MetaApiResponse;

  if (data.error) {
    console.error(`[Meta API] Error:`, data.error);
    throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
  }

  console.log(`[Meta API] Success:`, data);
  return data;
}

/**
 * Create a campaign in Meta Ads Manager
 */
export async function createMetaCampaign(
  adAccountId: string,
  campaign: {
    campaignName: string;
    campaignStatus: string;
    campaignObjective: string;
    buyingType: string;
    specialAdCategories?: string | null;
    specialAdCategoryCountry?: string | null;
    campaignBidStrategy?: string | null;
    campaignDailyBudget?: number | null;
    campaignLifetimeBudget?: number | null;
    campaignSpendLimit?: number | null;
    budgetLevel: string;
  }
): Promise<MetaCampaignResult> {
  // Ensure ad account ID has the act_ prefix
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const params: Record<string, any> = {
    name: campaign.campaignName,
    objective: mapObjectiveToApi(campaign.campaignObjective),
    status: mapStatusToApi(campaign.campaignStatus),
    special_ad_categories: mapSpecialAdCategoryToApi(campaign.specialAdCategories || "None"),
    buying_type: campaign.buyingType === "FIXED" ? "RESERVED" : "AUCTION",
  };

  // Special ad category country
  if (campaign.specialAdCategoryCountry) {
    params.special_ad_category_country = [campaign.specialAdCategoryCountry.toUpperCase()];
  }

  // CBO: set budget at campaign level
  if (campaign.budgetLevel === "campaign") {
    if (campaign.campaignBidStrategy) {
      params.bid_strategy = mapBidStrategyToApi(campaign.campaignBidStrategy);
    }
    if (campaign.campaignDailyBudget) {
      params.daily_budget = campaign.campaignDailyBudget; // Already in cents from the form
    }
    if (campaign.campaignLifetimeBudget) {
      params.lifetime_budget = campaign.campaignLifetimeBudget; // Already in cents
    }
  }

  // Spend cap
  if (campaign.campaignSpendLimit) {
    params.spend_cap = campaign.campaignSpendLimit; // Already in cents
  }

  const result = await metaApiPost(`/${accountId}/campaigns`, params);
  
  return {
    id: result.id!,
    success: true,
  };
}

/**
 * Parse a datetime-local string as EST (UTC-5) and return a Unix timestamp.
 * Meta API requires UTC-based timestamps; users enter times in EST.
 */
function toEstUnixTimestamp(dateStr: string): number | undefined {
  const withEst = dateStr.length === 16 ? `${dateStr}:00-05:00` : `${dateStr}-05:00`;
  const d = new Date(withEst);
  return isNaN(d.getTime()) ? undefined : Math.floor(d.getTime() / 1000);
}

/**
 * Create an ad set in Meta Ads Manager
 */
export async function createMetaAdSet(
  adAccountId: string,
  metaCampaignId: string,
  adSet: {
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
  },
  budgetLevel: string
): Promise<MetaAdSetResult> {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const targeting = buildTargeting(adSet);

  const params: Record<string, any> = {
    name: adSet.adSetName,
    campaign_id: metaCampaignId,
    targeting: targeting,
    billing_event: adSet.billingEvent || "IMPRESSIONS",
    optimization_goal: adSet.optimizationGoal || "LINK_CLICKS",
    status: mapStatusToApi(adSet.adSetRunStatus || "ACTIVE"),
  };

  // Ad set level budget (non-CBO)
  if (budgetLevel === "ad_set") {
    if (adSet.adSetDailyBudget) {
      params.daily_budget = adSet.adSetDailyBudget; // Already in cents
    }
    if (adSet.adSetLifetimeBudget) {
      params.lifetime_budget = adSet.adSetLifetimeBudget; // Already in cents
    }
    if (adSet.adSetBidStrategy) {
      params.bid_strategy = mapBidStrategyToApi(adSet.adSetBidStrategy);
    } else {
      params.bid_strategy = "LOWEST_COST_WITHOUT_CAP";
    }
  } else {
    // CBO: Meta API requires bid_strategy at the ad set level even when budget
    // is managed at the campaign level.
    params.bid_strategy = "LOWEST_COST_WITHOUT_CAP";
  }

  // Minimum ROAS
  if (adSet.minimumROAS) {
    params.roas_average_floor = adSet.minimumROAS;
  }

  // Schedule — treat datetime-local strings as EST (UTC-5) to match the ad account timezone
  if (adSet.adSetTimeStart) {
    const ts = toEstUnixTimestamp(adSet.adSetTimeStart);
    if (ts) params.start_time = ts;
  }
  if (adSet.adSetTimeStop) {
    const ts = toEstUnixTimestamp(adSet.adSetTimeStop);
    if (ts) params.end_time = ts;
  }

  // Promoted object for conversion-based objectives
  if (adSet.link) {
    params.promoted_object = { url: adSet.link };
  }

  // Need at least daily_budget or lifetime_budget for ad set level
  if (budgetLevel === "ad_set" && !params.daily_budget && !params.lifetime_budget) {
    // Default to a minimum daily budget of $1 (100 cents)
    params.daily_budget = 100;
  }

  const result = await metaApiPost(`/${accountId}/adsets`, params);

  return {
    id: result.id!,
    success: true,
  };
}

/**
 * Validate an ad account ID by fetching its details from the Meta Graph API
 * Returns account name and status if valid, throws on invalid
 */
export async function validateAdAccount(
  adAccountId: string
): Promise<{
  valid: boolean;
  accountId: string;
  accountName: string;
  accountStatus: number;
  currency: string;
  businessName?: string;
}> {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const url = `${META_API_BASE}/${accountId}?fields=name,account_status,currency,business_name,id&access_token=${ENV.metaAccessToken}`;

  console.log(`[Meta API] GET /${accountId} (validate)`);

  const response = await fetch(url);
  const data = await response.json() as any;

  if (data.error) {
    console.error(`[Meta API] Validation error:`, data.error);
    return {
      valid: false,
      accountId,
      accountName: "",
      accountStatus: 0,
      currency: "",
    };
  }

  console.log(`[Meta API] Validation success:`, data);

  return {
    valid: true,
    accountId: data.id || accountId,
    accountName: data.name || "Unknown",
    accountStatus: data.account_status || 0,
    currency: data.currency || "USD",
    businessName: data.business_name,
  };
}

/**
 * Push a full campaign with ad sets to Meta Ads Manager
 */
export async function pushCampaignToMeta(
  adAccountId: string,
  campaign: {
    campaignName: string;
    campaignStatus: string;
    campaignObjective: string;
    buyingType: string;
    specialAdCategories?: string | null;
    specialAdCategoryCountry?: string | null;
    campaignBidStrategy?: string | null;
    campaignDailyBudget?: number | null;
    campaignLifetimeBudget?: number | null;
    campaignSpendLimit?: number | null;
    budgetLevel: string;
  },
  adSets: Array<{
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
  }>
): Promise<{
  metaCampaignId: string;
  metaAdSetIds: string[];
  success: boolean;
}> {
  // Step 1: Create the campaign
  const campaignResult = await createMetaCampaign(adAccountId, campaign);
  
  // Step 2: Create each ad set under the campaign
  const metaAdSetIds: string[] = [];
  const errors: string[] = [];

  for (const adSet of adSets) {
    try {
      const adSetResult = await createMetaAdSet(
        adAccountId,
        campaignResult.id,
        adSet,
        campaign.budgetLevel
      );
      metaAdSetIds.push(adSetResult.id);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to create ad set "${adSet.adSetName}": ${errorMsg}`);
      console.error(`[Meta API] Ad set creation failed:`, errorMsg);
    }
  }

  if (errors.length > 0 && metaAdSetIds.length === 0) {
    throw new Error(`Campaign created (${campaignResult.id}) but all ad sets failed: ${errors.join("; ")}`);
  }

  return {
    metaCampaignId: campaignResult.id,
    metaAdSetIds,
    success: true,
  };
}
