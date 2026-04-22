const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaApiResponse {
  id?: string;
  error?: { message: string; type: string; code: number };
}

function mapObjective(o: string) {
  const m: Record<string, string> = {
    "Outcome Awareness": "OUTCOME_AWARENESS",
    "Outcome Engagement": "OUTCOME_ENGAGEMENT",
    "Outcome Leads": "OUTCOME_LEADS",
    "Outcome Sales": "OUTCOME_SALES",
    "Outcome Traffic": "OUTCOME_TRAFFIC",
  };
  return m[o] || o;
}

function mapBidStrategy(b: string) {
  const m: Record<string, string> = {
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
  return m[b] || b;
}

function mapSpecialCategory(c: string): string[] {
  if (!c || c === "None") return ["NONE"];
  const m: Record<string, string> = {
    financial_products_services: "FINANCIAL_PRODUCTS_SERVICES",
    employment: "EMPLOYMENT",
    housing: "HOUSING",
    issues_elections_politics: "ISSUES_ELECTIONS_POLITICS",
  };
  return [m[c] || c.toUpperCase()];
}

function toEstUnixTimestamp(dateStr: string): number | undefined {
  const withEst = dateStr.length === 16 ? `${dateStr}:00-05:00` : `${dateStr}-05:00`;
  const d = new Date(withEst);
  return isNaN(d.getTime()) ? undefined : Math.floor(d.getTime() / 1000);
}

function getCountryCode(country: string): string {
  if (country.length === 2) return country.toUpperCase();
  const m: Record<string, string> = {
    "United States": "US", "United Kingdom": "GB", Canada: "CA",
    Australia: "AU", Germany: "DE", France: "FR", Spain: "ES",
    Italy: "IT", Brazil: "BR", Mexico: "MX", Japan: "JP", India: "IN",
  };
  return m[country] || "US";
}

async function metaPost(accessToken: string, endpoint: string, params: Record<string, any>): Promise<MetaApiResponse> {
  const body = new URLSearchParams({ access_token: accessToken });
  for (const [k, v] of Object.entries(params)) {
    if (v != null) body.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(`${META_API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json() as MetaApiResponse;
  if (data.error) throw new Error(`Meta API Error: ${data.error.message} (code: ${data.error.code})`);
  return data;
}

export async function validateAdAccount(accessToken: string, adAccountId: string) {
  const id = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
  const res = await fetch(
    `${META_API_BASE}/${id}?fields=name,account_status,currency,business_name,id&access_token=${accessToken}`
  );
  const data = await res.json() as any;
  if (data.error) return { valid: false, accountId: id, accountName: "", accountStatus: 0, currency: "" };
  return { valid: true, accountId: data.id || id, accountName: data.name || "Unknown", accountStatus: data.account_status || 0, currency: data.currency || "USD", businessName: data.business_name };
}

export async function pushCampaignToMeta(
  accessToken: string,
  adAccountId: string,
  campaign: {
    campaignName: string; campaignStatus: string; campaignObjective: string;
    buyingType: string; specialAdCategories?: string | null; specialAdCategoryCountry?: string | null;
    campaignBidStrategy?: string | null; campaignDailyBudget?: number | null;
    campaignLifetimeBudget?: number | null; campaignSpendLimit?: number | null; budgetLevel: string;
  },
  adSetsInput: Array<{
    adSetName: string; adSetRunStatus?: string | null; adSetTimeStart?: string | null;
    adSetTimeStop?: string | null; adSetDailyBudget?: number | null; adSetLifetimeBudget?: number | null;
    adSetBidStrategy?: string | null; minimumROAS?: number | null; link?: string | null;
    optimizationGoal?: string | null; billingEvent?: string | null; country?: string;
    geoType?: string; geoLocation?: string | null; ageRange?: string | null; gender?: string;
  }>
) {
  const accountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  const campaignParams: Record<string, any> = {
    name: campaign.campaignName,
    objective: mapObjective(campaign.campaignObjective),
    status: "PAUSED",
    special_ad_categories: mapSpecialCategory(campaign.specialAdCategories || "None"),
    buying_type: campaign.buyingType === "FIXED" ? "RESERVED" : "AUCTION",
  };
  if (campaign.specialAdCategoryCountry)
    campaignParams.special_ad_category_country = [campaign.specialAdCategoryCountry.toUpperCase()];
  if (campaign.budgetLevel === "campaign") {
    if (campaign.campaignBidStrategy) campaignParams.bid_strategy = mapBidStrategy(campaign.campaignBidStrategy);
    if (campaign.campaignDailyBudget) campaignParams.daily_budget = campaign.campaignDailyBudget;
    if (campaign.campaignLifetimeBudget) campaignParams.lifetime_budget = campaign.campaignLifetimeBudget;
  }
  if (campaign.campaignSpendLimit) campaignParams.spend_cap = campaign.campaignSpendLimit;

  const { id: metaCampaignId } = await metaPost(accessToken, `/${accountId}/campaigns`, campaignParams);

  const metaAdSetIds: string[] = [];
  for (const adSet of adSetsInput) {
    const targeting: Record<string, any> = {
      geo_locations: { countries: [getCountryCode(adSet.country || "United States")] },
    };
    if (adSet.ageRange) {
      const [min, max] = adSet.ageRange.split("-").map(Number);
      if (!isNaN(min)) targeting.age_min = Math.max(18, min);
      if (!isNaN(max)) targeting.age_max = Math.min(65, max);
    }
    if (adSet.gender === "male") targeting.genders = [1];
    else if (adSet.gender === "female") targeting.genders = [2];

    const adSetParams: Record<string, any> = {
      name: adSet.adSetName,
      campaign_id: metaCampaignId,
      targeting,
      billing_event: adSet.billingEvent || "IMPRESSIONS",
      optimization_goal: adSet.optimizationGoal || "LINK_CLICKS",
      status: "PAUSED",
    };
    if (campaign.budgetLevel === "ad_set") {
      if (adSet.adSetDailyBudget) adSetParams.daily_budget = adSet.adSetDailyBudget;
      if (adSet.adSetLifetimeBudget) adSetParams.lifetime_budget = adSet.adSetLifetimeBudget;
      adSetParams.bid_strategy = adSet.adSetBidStrategy
        ? mapBidStrategy(adSet.adSetBidStrategy)
        : "LOWEST_COST_WITHOUT_CAP";
    } else {
      // CBO: Meta API requires bid_strategy at the ad set level even when the
      // campaign owns the budget.
      adSetParams.bid_strategy = "LOWEST_COST_WITHOUT_CAP";
    }
    if (!adSetParams.daily_budget && !adSetParams.lifetime_budget) adSetParams.daily_budget = 100;
    if (adSet.minimumROAS) adSetParams.roas_average_floor = adSet.minimumROAS;
    // Treat datetime-local strings as EST (UTC-5) to match the ad account timezone
    if (adSet.adSetTimeStart) {
      const ts = toEstUnixTimestamp(adSet.adSetTimeStart);
      if (ts) adSetParams.start_time = ts;
    }
    if (adSet.adSetTimeStop) {
      const ts = toEstUnixTimestamp(adSet.adSetTimeStop);
      if (ts) adSetParams.end_time = ts;
    }
    if (adSet.link) adSetParams.promoted_object = { url: adSet.link };

    const { id } = await metaPost(accessToken, `/${accountId}/adsets`, adSetParams);
    if (id) metaAdSetIds.push(id);
  }

  return { metaCampaignId: metaCampaignId!, metaAdSetIds, success: true };
}
