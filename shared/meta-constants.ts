/**
 * Meta Ads Manager Bulk Upload Constants
 * These values come from the VALIDATION sheet in the template
 */

export const CAMPAIGN_STATUSES = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"] as const;

export const BUYING_TYPES = ["AUCTION", "FIXED"] as const;

// Campaign Objectives - only OUTCOME_* values
export const CAMPAIGN_OBJECTIVES = [
  "Outcome Awareness",
  "Outcome Engagement",
  "Outcome Leads",
  "Outcome Sales",
  "Outcome Traffic",
] as const;

export const BID_STRATEGIES = [
  "Lowest Cost",
  "Lowest Cost With Bid Cap",
  "Target Cost",
  "Lowest Cost With Cost Cap",
  "Highest Value With Min ROAS",
  "Cost per result goal",
  "ROAS goal",
  "Highest volume or value",
  "Bid Cap",
] as const;

// Optimization Goals - only the seven specified options
export const OPTIMIZATION_GOALS = [
  "IMPRESSIONS",
  "REACH",
  "LINK_CLICKS",
  "LANDING_PAGE_VIEWS",
  "THRUPLAY",
  "LEAD_GENERATION",
  "OFFSITE_CONVERSIONS",
] as const;

export const BILLING_EVENTS = [
  "IMPRESSIONS",
  "CLICKS",
  "ACTIONS",
] as const;

export const SPECIAL_AD_CATEGORIES = [
  "None",
  "financial_products_services",
  "employment",
  "housing",
  "issues_elections_politics",
] as const;

export const BUDGET_LEVELS = [
  "campaign",
  "ad_set",
] as const;

/**
 * Excel column mapping for Meta Bulk Upload Template
 * Maps form field names to Excel column indices (0-based)
 */
export const EXCEL_COLUMN_MAP = {
  campaignName: 0,           // A
  campaignStatus: 1,         // B
  specialAdCategories: 2,    // C
  specialAdCategoryCountry: 3, // D
  campaignObjective: 4,      // E
  buyingType: 5,             // F
  campaignSpendLimit: 6,     // G
  campaignDailyBudget: 7,    // H
  campaignLifetimeBudget: 8, // I
  campaignBidStrategy: 9,    // J
  adSetId: 14,               // O (leave blank for new)
  adSetRunStatus: 15,        // P
  adSetName: 16,             // Q
  adSetTimeStart: 17,        // R
  adSetTimeStop: 18,         // S
  adSetDailyBudget: 19,      // T
  adSetLifetimeBudget: 20,   // U
  adSetBidStrategy: 22,      // W
  minimumROAS: 23,           // X
  geoCountries: 29,          // AD
  geoCities: 30,             // AE
  geoRegions: 31,            // AF
  geoAddresses: 32,          // AG
  geoZip: 33,                // AH
  link: 26,                  // AA
  optimizationGoal: 41,      // AP
  billingEvent: 42,          // AQ
} as const;

/**
 * Validation rules for form fields
 */
export const VALIDATION_RULES = {
  campaignName: {
    required: true,
    maxLength: 255,
  },
  campaignStatus: {
    required: true,
  },
  campaignObjective: {
    required: true,
  },
  buyingType: {
    required: true,
  },
  adSetName: {
    required: true,
    maxLength: 255,
  },
  adSetRunStatus: {
    required: true,
  },
  adSetBidStrategy: {
    required: true,
  },
  optimizationGoal: {
    required: true,
  },
  billingEvent: {
    required: true,
  },
  link: {
    required: false,
    isUrl: true,
  },
} as const;
