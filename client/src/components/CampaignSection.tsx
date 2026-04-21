import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid" | "format-error";

interface CampaignSectionProps {
  formData: any;
  onChange: (field: string, value: string) => void;
  buyingTypes: readonly string[];
  campaignObjectives: readonly string[];
  bidStrategies: readonly string[];
  specialAdCategories: readonly string[];
  budgetLevels: readonly string[];
  onAdAccountValidation?: (valid: boolean, accountName?: string) => void;
}

/**
 * Validate the format of an Ad Account ID.
 * Accepts: act_123456789 or just 123456789 (all digits).
 */
function validateAdAccountFormat(value: string): boolean {
  if (!value.trim()) return false;
  const cleaned = value.trim().replace(/^act_/, "");
  return /^\d{5,20}$/.test(cleaned);
}

export default function CampaignSection({
  formData,
  onChange,
  buyingTypes,
  campaignObjectives,
  bidStrategies,
  specialAdCategories,
  budgetLevels,
  onAdAccountValidation,
}: CampaignSectionProps) {
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [accountInfo, setAccountInfo] = useState<{
    accountName: string;
    currency: string;
    businessName?: string;
  } | null>(null);
  const [validationError, setValidationError] = useState<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidatedRef = useRef<string>("");

  const adAccountId = formData.adAccountId || "";

  // Use tRPC query with enabled flag for on-demand validation
  const [queryId, setQueryId] = useState<string>("");
  const validationQuery = trpc.campaigns.validateAdAccount.useQuery(
    { adAccountId: queryId },
    {
      enabled: !!queryId && queryId.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  // Handle validation result
  useEffect(() => {
    if (!queryId) return;

    if (validationQuery.isLoading) {
      setValidationStatus("validating");
      return;
    }

    if (validationQuery.isError) {
      setValidationStatus("invalid");
      setValidationError("Failed to validate account. Please check your connection.");
      setAccountInfo(null);
      onAdAccountValidation?.(false);
      return;
    }

    if (validationQuery.data) {
      if (validationQuery.data.valid) {
        setValidationStatus("valid");
        setAccountInfo({
          accountName: validationQuery.data.accountName,
          currency: validationQuery.data.currency,
          businessName: validationQuery.data.businessName,
        });
        setValidationError("");
        onAdAccountValidation?.(true, validationQuery.data.accountName);
      } else {
        setValidationStatus("invalid");
        setValidationError("Ad account not found or you don't have access to it.");
        setAccountInfo(null);
        onAdAccountValidation?.(false);
      }
    }
  }, [validationQuery.data, validationQuery.isLoading, validationQuery.isError, queryId]);

  // Debounced validation trigger
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = adAccountId.trim();

    // Reset if empty
    if (!trimmed) {
      setValidationStatus("idle");
      setAccountInfo(null);
      setValidationError("");
      setQueryId("");
      lastValidatedRef.current = "";
      onAdAccountValidation?.(false);
      return;
    }

    // Check format first
    if (!validateAdAccountFormat(trimmed)) {
      setValidationStatus("format-error");
      setValidationError("Invalid format. Use act_XXXXXXXXX or just the numeric ID.");
      setAccountInfo(null);
      setQueryId("");
      onAdAccountValidation?.(false);
      return;
    }

    // Skip if already validated this exact value
    if (trimmed === lastValidatedRef.current && validationStatus === "valid") {
      return;
    }

    // Debounce the API call (800ms)
    setValidationStatus("validating");
    debounceTimerRef.current = setTimeout(() => {
      lastValidatedRef.current = trimmed;
      setQueryId(trimmed);
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [adAccountId]);

  // Status icon and color
  const getStatusIndicator = () => {
    switch (validationStatus) {
      case "validating":
        return (
          <div className="flex items-center gap-1.5 text-blue-600">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs">Validating...</span>
          </div>
        );
      case "valid":
        return (
          <div className="flex items-center gap-1.5 text-green-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium">Verified</span>
          </div>
        );
      case "invalid":
      case "format-error":
        return (
          <div className="flex items-center gap-1.5 text-red-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs font-medium">Invalid</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getInputBorderClass = () => {
    switch (validationStatus) {
      case "valid":
        return "border-green-500 focus-visible:ring-green-500/20";
      case "invalid":
      case "format-error":
        return "border-red-500 focus-visible:ring-red-500/20";
      case "validating":
        return "border-blue-400 focus-visible:ring-blue-400/20";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
        <CardDescription>Configure your Meta Ads campaign settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ad Account ID with Real-Time Validation */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="adAccountId" className="font-medium">
              Ad Account ID
            </Label>
            {getStatusIndicator()}
          </div>
          <Input
            id="adAccountId"
            placeholder="e.g., act_123456789 or 123456789"
            value={adAccountId}
            onChange={(e) => onChange("adAccountId", e.target.value)}
            className={getInputBorderClass()}
          />

          {/* Validation feedback */}
          {validationStatus === "valid" && accountInfo && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">{accountInfo.accountName}</p>
                  <div className="flex gap-3 mt-1 text-green-700">
                    <span>Currency: {accountInfo.currency}</span>
                    {accountInfo.businessName && (
                      <span>Business: {accountInfo.businessName}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(validationStatus === "invalid" || validationStatus === "format-error") && validationError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{validationError}</p>
              </div>
            </div>
          )}

          {validationStatus === "idle" && (
            <p className="text-xs text-slate-500">
              Required for pushing directly to Meta Ads Manager. Find this in your Meta Business Settings.
            </p>
          )}
        </div>

        {/* Campaign Name */}
        <div className="grid gap-2">
          <Label htmlFor="campaignName" className="font-medium">
            Campaign Name *
          </Label>
          <Input
            id="campaignName"
            placeholder="e.g., Q2 2026 Product Launch"
            value={formData.campaignName}
            onChange={(e) => onChange("campaignName", e.target.value)}
            maxLength={255}
          />
          <p className="text-xs text-slate-500">
            {formData.campaignName.length}/255 characters
          </p>
        </div>

        {/* Campaign Status - always PAUSED */}
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-amber-800">
              Campaigns are always created as <span className="font-semibold">PAUSED</span> in Ads Manager. Activate them directly in Meta Ads Manager after review.
            </p>
          </div>
        </div>

        {/* Campaign Objective */}
        <div className="grid gap-2">
          <Label htmlFor="campaignObjective" className="font-medium">
            Campaign Objective *
          </Label>
          <Select value={formData.campaignObjective} onValueChange={(value) => onChange("campaignObjective", value)}>
            <SelectTrigger id="campaignObjective">
              <SelectValue placeholder="Select an objective" />
            </SelectTrigger>
            <SelectContent>
              {campaignObjectives.map((objective) => (
                <SelectItem key={objective} value={objective}>
                  {objective}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Buying Type */}
        <div className="grid gap-2">
          <Label htmlFor="buyingType" className="font-medium">
            Buying Type *
          </Label>
          <Select value={formData.buyingType} onValueChange={(value) => onChange("buyingType", value)}>
            <SelectTrigger id="buyingType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buyingTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Special Ad Categories */}
        <div className="grid gap-2">
          <Label htmlFor="specialAdCategories" className="font-medium">
            Special Ad Categories
          </Label>
          <Select value={formData.specialAdCategories} onValueChange={(value) => onChange("specialAdCategories", value)}>
            <SelectTrigger id="specialAdCategories">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {specialAdCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Special Ad Category Country */}
        {formData.specialAdCategories && formData.specialAdCategories !== "None" && (
          <div className="grid gap-2">
            <Label htmlFor="specialAdCategoryCountry" className="font-medium">
              Special Ad Category Country
            </Label>
            <Input
              id="specialAdCategoryCountry"
              placeholder="e.g., US, GB, etc."
              value={formData.specialAdCategoryCountry}
              onChange={(e) => onChange("specialAdCategoryCountry", e.target.value)}
            />
          </div>
        )}

        {/* Budget Level Selector */}
        <div className="border-t pt-6">
          <div className="grid gap-2 mb-6">
            <Label htmlFor="budgetLevel" className="font-medium">
              Where should the budget be set? *
            </Label>
            <Select value={formData.budgetLevel} onValueChange={(value) => onChange("budgetLevel", value)}>
              <SelectTrigger id="budgetLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign">
                  Campaign Level (CBO)
                </SelectItem>
                <SelectItem value="ad_set">
                  Ad Set Level
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign Budget Fields - Only show if budgetLevel is "campaign" */}
          {formData.budgetLevel === "campaign" && (
            <>
              <h3 className="font-semibold text-slate-900 mb-4">Campaign Budget</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="campaignSpendLimit" className="font-medium text-sm">
                    Spend Limit
                  </Label>
                  <Input
                    id="campaignSpendLimit"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.campaignSpendLimit}
                    onChange={(e) => onChange("campaignSpendLimit", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">USD</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="campaignDailyBudget" className="font-medium text-sm">
                    Daily Budget
                  </Label>
                  <Input
                    id="campaignDailyBudget"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.campaignDailyBudget}
                    onChange={(e) => onChange("campaignDailyBudget", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">USD</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="campaignLifetimeBudget" className="font-medium text-sm">
                    Lifetime Budget
                  </Label>
                  <Input
                    id="campaignLifetimeBudget"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.campaignLifetimeBudget}
                    onChange={(e) => onChange("campaignLifetimeBudget", e.target.value)}
                  />
                  <p className="text-xs text-slate-500">USD</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bid Strategy - Only show if budgetLevel is "campaign" */}
        {formData.budgetLevel === "campaign" && (
          <div className="grid gap-2">
            <Label htmlFor="campaignBidStrategy" className="font-medium">
              Campaign Bid Strategy
            </Label>
            <Select value={formData.campaignBidStrategy} onValueChange={(value) => onChange("campaignBidStrategy", value)}>
              <SelectTrigger id="campaignBidStrategy">
                <SelectValue placeholder="Select a bid strategy" />
              </SelectTrigger>
              <SelectContent>
                {bidStrategies.map((strategy) => (
                  <SelectItem key={strategy} value={strategy}>
                    {strategy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
