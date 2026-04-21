import { describe, it, expect } from "vitest";
import { EXCEL_COLUMN_MAP } from "../shared/meta-constants";
import type { Campaign, AdSet } from "../drizzle/schema";

describe("Excel Column Mapping", () => {
  it("should have correct column indices for all fields", () => {
    // Campaign fields
    expect(EXCEL_COLUMN_MAP.campaignName).toBe(0); // A
    expect(EXCEL_COLUMN_MAP.campaignStatus).toBe(1); // B
    expect(EXCEL_COLUMN_MAP.specialAdCategories).toBe(2); // C
    expect(EXCEL_COLUMN_MAP.specialAdCategoryCountry).toBe(3); // D
    expect(EXCEL_COLUMN_MAP.campaignObjective).toBe(4); // E
    expect(EXCEL_COLUMN_MAP.buyingType).toBe(5); // F
    expect(EXCEL_COLUMN_MAP.campaignSpendLimit).toBe(6); // G
    expect(EXCEL_COLUMN_MAP.campaignDailyBudget).toBe(7); // H
    expect(EXCEL_COLUMN_MAP.campaignLifetimeBudget).toBe(8); // I
    expect(EXCEL_COLUMN_MAP.campaignBidStrategy).toBe(9); // J

    // Ad Set fields
    expect(EXCEL_COLUMN_MAP.adSetId).toBe(14); // O
    expect(EXCEL_COLUMN_MAP.adSetRunStatus).toBe(15); // P
    expect(EXCEL_COLUMN_MAP.adSetName).toBe(16); // Q
    expect(EXCEL_COLUMN_MAP.adSetTimeStart).toBe(17); // R
    expect(EXCEL_COLUMN_MAP.adSetTimeStop).toBe(18); // S
    expect(EXCEL_COLUMN_MAP.adSetDailyBudget).toBe(19); // T
    expect(EXCEL_COLUMN_MAP.adSetLifetimeBudget).toBe(20); // U
    expect(EXCEL_COLUMN_MAP.adSetBidStrategy).toBe(22); // W
    expect(EXCEL_COLUMN_MAP.minimumROAS).toBe(23); // X
    expect(EXCEL_COLUMN_MAP.link).toBe(26); // AA
    expect(EXCEL_COLUMN_MAP.optimizationGoal).toBe(42); // AQ
    expect(EXCEL_COLUMN_MAP.billingEvent).toBe(43); // AR
  });

  it("should not have gaps in critical column mappings", () => {
    const campaignColumns = [
      EXCEL_COLUMN_MAP.campaignName,
      EXCEL_COLUMN_MAP.campaignStatus,
      EXCEL_COLUMN_MAP.specialAdCategories,
      EXCEL_COLUMN_MAP.specialAdCategoryCountry,
      EXCEL_COLUMN_MAP.campaignObjective,
      EXCEL_COLUMN_MAP.buyingType,
    ];

    // Check that campaign columns are sequential
    for (let i = 0; i < campaignColumns.length; i++) {
      expect(campaignColumns[i]).toBe(i);
    }
  });
});

describe("Validation Rules", () => {
  it("should validate required fields", () => {
    const validateRequired = (value: string): boolean => {
      return value.trim().length > 0;
    };

    expect(validateRequired("Campaign Name")).toBe(true);
    expect(validateRequired("")).toBe(false);
    expect(validateRequired("   ")).toBe(false);
  });

  it("should validate character limits", () => {
    const validateLength = (value: string, maxLength: number): boolean => {
      return value.length <= maxLength;
    };

    expect(validateLength("Campaign Name", 255)).toBe(true);
    expect(validateLength("a".repeat(256), 255)).toBe(false);
  });

  it("should validate URLs", () => {
    const validateUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(validateUrl("https://example.com")).toBe(true);
    expect(validateUrl("http://example.com/path")).toBe(true);
    expect(validateUrl("not a url")).toBe(false);
    expect(validateUrl("")).toBe(false);
  });

  it("should validate budget fields are positive numbers", () => {
    const validateBudget = (value: string): boolean => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    };

    expect(validateBudget("100.50")).toBe(true);
    expect(validateBudget("0")).toBe(true);
    expect(validateBudget("-10")).toBe(false);
    expect(validateBudget("abc")).toBe(false);
  });

  it("should validate time field pairs", () => {
    const validateTimePair = (start: string, stop: string): boolean => {
      // Both must be set or both must be empty
      const startIsSet = start && start.trim().length > 0;
      const stopIsSet = stop && stop.trim().length > 0;
      return (startIsSet && stopIsSet) || (!startIsSet && !stopIsSet);
    };

    expect(validateTimePair("2026-03-30T10:00", "2026-03-30T12:00")).toBe(true);
    expect(validateTimePair("", "")).toBe(true);
    expect(validateTimePair("2026-03-30T10:00", "")).toBe(false);
    expect(validateTimePair("", "2026-03-30T12:00")).toBe(false);
  });

  it("should validate budget pair (daily or lifetime required)", () => {
    const validateBudgetPair = (daily: string, lifetime: string): boolean => {
      return daily !== "" || lifetime !== "";
    };

    expect(validateBudgetPair("100", "")).toBe(true);
    expect(validateBudgetPair("", "1000")).toBe(true);
    expect(validateBudgetPair("100", "1000")).toBe(true);
    expect(validateBudgetPair("", "")).toBe(false);
  });

  it("should validate ROAS requirement for ROAS bid strategies", () => {
    const requiresROAS = (bidStrategy: string): boolean => {
      return bidStrategy.includes("Min ROAS");
    };

    const validateROASRequired = (bidStrategy: string, roas: string): boolean => {
      if (requiresROAS(bidStrategy)) {
        return roas !== "" && parseFloat(roas) > 0;
      }
      return true;
    };

    expect(validateROASRequired("Highest Value With Min ROAS", "2.5")).toBe(true);
    expect(validateROASRequired("Highest Value With Min ROAS", "")).toBe(false);
    expect(validateROASRequired("Lowest Cost", "")).toBe(true);
    expect(validateROASRequired("Lowest Cost", "2.5")).toBe(true);
  });
});

describe("Currency Conversion", () => {
  it("should convert dollars to cents correctly", () => {
    const dollarsToCents = (dollars: string): number => {
      return Math.round(parseFloat(dollars) * 100);
    };

    expect(dollarsToCents("100.50")).toBe(10050);
    expect(dollarsToCents("0.99")).toBe(99);
    expect(dollarsToCents("1000")).toBe(100000);
  });

  it("should convert cents to dollars correctly", () => {
    const centsToDollars = (cents: number): number => {
      return cents / 100;
    };

    expect(centsToDollars(10050)).toBe(100.50);
    expect(centsToDollars(99)).toBe(0.99);
    expect(centsToDollars(100000)).toBe(1000);
  });
});
