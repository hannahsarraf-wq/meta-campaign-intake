import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  CAMPAIGN_STATUSES,
  BUYING_TYPES,
  CAMPAIGN_OBJECTIVES,
  BID_STRATEGIES,
  OPTIMIZATION_GOALS,
  BILLING_EVENTS,
  SPECIAL_AD_CATEGORIES,
  BUDGET_LEVELS,
} from "@shared/meta-constants";
import AdSetForm from "@/components/AdSetForm";
import CampaignSection from "@/components/CampaignSection";

// Load draft from session storage if available
function loadDraftFromSession(): FormData | null {
  const loadedDraftJson = sessionStorage.getItem("loadedDraft");
  if (!loadedDraftJson) return null;
  
  try {
    const loadedDraft = JSON.parse(loadedDraftJson);
    const formattedData: FormData = {
      adAccountId: loadedDraft.adAccountId || "",
      campaignName: loadedDraft.campaignName || "",
      campaignStatus: loadedDraft.campaignStatus || "PAUSED",
      specialAdCategories: loadedDraft.specialAdCategories || "None",
      specialAdCategoryCountry: loadedDraft.specialAdCategoryCountry || "",
      campaignObjective: loadedDraft.campaignObjective || "",
      buyingType: loadedDraft.buyingType || "AUCTION",
      budgetLevel: loadedDraft.budgetLevel || "ad_set",
      campaignSpendLimit: loadedDraft.campaignSpendLimit ? String(loadedDraft.campaignSpendLimit / 100) : "",
      campaignDailyBudget: loadedDraft.campaignDailyBudget ? String(loadedDraft.campaignDailyBudget / 100) : "",
      campaignLifetimeBudget: loadedDraft.campaignLifetimeBudget ? String(loadedDraft.campaignLifetimeBudget / 100) : "",
      campaignBidStrategy: loadedDraft.campaignBidStrategy || "",
      adSets: (loadedDraft.adSets || []).map((adSet: any) => ({
        id: String(adSet.id),
        adSetName: adSet.adSetName || "",
        adSetRunStatus: adSet.adSetRunStatus || "ACTIVE",
        adSetTimeStart: adSet.adSetTimeStart || "",
        adSetTimeStop: adSet.adSetTimeStop || "",
        adSetDailyBudget: adSet.adSetDailyBudget ? String(adSet.adSetDailyBudget / 100) : "",
        adSetLifetimeBudget: adSet.adSetLifetimeBudget ? String(adSet.adSetLifetimeBudget / 100) : "",
        adSetBidStrategy: adSet.adSetBidStrategy || "",
        minimumROAS: adSet.minimumROAS ? String(adSet.minimumROAS) : "",
        link: adSet.link || "",
        optimizationGoal: adSet.optimizationGoal || "",
        billingEvent: adSet.billingEvent || "IMPRESSIONS",
        country: adSet.country || "United States",
        geoType: adSet.geoType || "city",
        geoLocation: adSet.geoLocation || "",
        ageRange: adSet.ageRange || "",
        gender: adSet.gender || "all",
      })),
    };
    sessionStorage.removeItem("loadedDraft");
    return formattedData;
  } catch (error) {
    console.error("Failed to parse loaded draft", error);
    return null;
  }
}

interface FormData {
  adAccountId: string;
  campaignName: string;
  campaignStatus: string;
  specialAdCategories: string;
  specialAdCategoryCountry: string;
  campaignObjective: string;
  buyingType: string;
  budgetLevel: string;
  campaignSpendLimit: string;
  campaignDailyBudget: string;
  campaignLifetimeBudget: string;
  campaignBidStrategy: string;
  adSets: Array<{
    id: string;
    adSetName: string;
    adSetRunStatus: string;
    adSetTimeStart: string;
    adSetTimeStop: string;
    adSetDailyBudget: string;
    adSetLifetimeBudget: string;
    adSetBidStrategy: string;
    minimumROAS: string;
    link: string;
    optimizationGoal: string;
    billingEvent: string;
    country: string;
    geoType: string;
    geoLocation: string;
    ageRange: string;
    gender: string;
  }>;
}

export default function CampaignIntake() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const createCampaignMutation = trpc.campaigns.create.useMutation();
  const generateExcelMutation = trpc.campaigns.generateExcel.useMutation();
  const saveDraftMutation = trpc.campaigns.saveDraft.useMutation();
  const pushToMetaMutation = trpc.campaigns.pushToMeta.useMutation();
  const [isPushingToMeta, setIsPushingToMeta] = useState(false);
  const [isAdAccountValid, setIsAdAccountValid] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    adAccountId: "",
    campaignName: "",
    campaignStatus: "PAUSED",
    specialAdCategories: "None",
    specialAdCategoryCountry: "",
    campaignObjective: "",
    buyingType: "AUCTION",
    budgetLevel: "ad_set",
    campaignSpendLimit: "",
    campaignDailyBudget: "",
    campaignLifetimeBudget: "",
    campaignBidStrategy: "",
    adSets: [
      {
        id: "1",
        adSetName: "",
        adSetRunStatus: "ACTIVE",
        adSetTimeStart: "",
        adSetTimeStop: "",
        adSetDailyBudget: "",
        adSetLifetimeBudget: "",
        adSetBidStrategy: "",
        minimumROAS: "",
        link: "",
        optimizationGoal: "",
        billingEvent: "IMPRESSIONS",
        country: "United States",
        geoType: "city",
        geoLocation: "",
        ageRange: "",
        gender: "all",
      },
    ],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load draft from session storage on component mount
  useEffect(() => {
    const loadedDraft = loadDraftFromSession();
    if (loadedDraft) {
      setFormData(loadedDraft);
      toast.success("Draft loaded successfully");
    }
  }, []);

  const handleCampaignChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAdSetChange = (adSetId: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      adSets: prev.adSets.map((adSet) =>
        adSet.id === adSetId ? { ...adSet, [field]: value } : adSet
      ),
    }));
  };

  const addAdSet = () => {
    const newId = String(Math.max(...formData.adSets.map((a) => parseInt(a.id)), 0) + 1);
    setFormData((prev) => ({
      ...prev,
      adSets: [
        ...prev.adSets,
        {
          id: newId,
          adSetName: "",
          adSetRunStatus: "ACTIVE",
          adSetTimeStart: "",
          adSetTimeStop: "",
          adSetDailyBudget: "",
          adSetLifetimeBudget: "",
          adSetBidStrategy: "",
          minimumROAS: "",
          link: "",
          optimizationGoal: "",
          billingEvent: "IMPRESSIONS",
          country: "United States",
          geoType: "city",
          geoLocation: "",
          ageRange: "",
          gender: "all",
        },
      ],
    }));
  };

  const removeAdSet = (adSetId: string) => {
    if (formData.adSets.length === 1) {
      toast.error("You must have at least one ad set");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      adSets: prev.adSets.filter((a) => a.id !== adSetId),
    }));
  };

  const duplicateAdSet = (adSetId: string) => {
    const adSetToDuplicate = formData.adSets.find((a) => a.id === adSetId);
    if (!adSetToDuplicate) return;

    const newId = String(Math.max(...formData.adSets.map((a) => parseInt(a.id)), 0) + 1);
    const duplicatedAdSet = {
      ...adSetToDuplicate,
      id: newId,
      adSetName: `${adSetToDuplicate.adSetName} (Copy)`,
    };

    setFormData((prev) => ({
      ...prev,
      adSets: [...prev.adSets, duplicatedAdSet],
    }));
    toast.success("Ad set duplicated");
  };

  const validateForm = (): boolean => {
    // Campaign validation
    if (!formData.campaignName.trim()) {
      toast.error("Campaign Name is required");
      return false;
    }
    if (!formData.campaignObjective) {
      toast.error("Campaign Objective is required");
      return false;
    }
    if (!formData.buyingType) {
      toast.error("Buying Type is required");
      return false;
    }

    // Ad Set validation
    for (const adSet of formData.adSets) {
      if (!adSet.adSetName.trim()) {
        toast.error("All Ad Set Names are required");
        return false;
      }
      if (formData.budgetLevel === "ad_set" && !adSet.adSetBidStrategy) {
        toast.error("All Ad Set Bid Strategies are required");
        return false;
      }
      if (!adSet.optimizationGoal) {
        toast.error("All Optimization Goals are required");
        return false;
      }
      if (!adSet.billingEvent) {
        toast.error("All Billing Events are required");
        return false;
      }

      // Time field validation
      if ((adSet.adSetTimeStart && !adSet.adSetTimeStop) || (!adSet.adSetTimeStart && adSet.adSetTimeStop)) {
        toast.error("Both Ad Set Time Start and Stop must be set together");
        return false;
      }

      // Budget validation
      if (formData.budgetLevel === "ad_set" && !adSet.adSetDailyBudget && !adSet.adSetLifetimeBudget) {
        toast.error("Each Ad Set must have either a Daily or Lifetime Budget");
        return false;
      }

      // ROAS validation
      if (adSet.adSetBidStrategy.includes("Min ROAS") && !adSet.minimumROAS) {
        toast.error("Minimum ROAS is required for ROAS-based bid strategies");
        return false;
      }

      // URL validation
      if (adSet.link && !isValidUrl(adSet.link)) {
        toast.error("Invalid URL in Link field");
        return false;
      }
    }

    return true;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const convertToDatabase = () => {
    return {
      campaignName: formData.campaignName,
      campaignStatus: formData.campaignStatus,
      specialAdCategories: formData.specialAdCategories === "None" ? undefined : formData.specialAdCategories,
      specialAdCategoryCountry: formData.specialAdCategoryCountry || undefined,
      campaignObjective: formData.campaignObjective,
      buyingType: formData.buyingType,
      campaignSpendLimit: formData.budgetLevel === "campaign" && formData.campaignSpendLimit ? Math.round(parseFloat(formData.campaignSpendLimit) * 100) : undefined,
      campaignDailyBudget: formData.budgetLevel === "campaign" && formData.campaignDailyBudget ? Math.round(parseFloat(formData.campaignDailyBudget) * 100) : undefined,
      campaignLifetimeBudget: formData.budgetLevel === "campaign" && formData.campaignLifetimeBudget ? Math.round(parseFloat(formData.campaignLifetimeBudget) * 100) : undefined,
      campaignBidStrategy: formData.campaignBidStrategy || undefined,
      budgetLevel: formData.budgetLevel,
      adSets: formData.adSets.map((adSet) => ({
        adSetName: adSet.adSetName,
        adSetRunStatus: adSet.adSetRunStatus,
        adSetTimeStart: adSet.adSetTimeStart || undefined,
        adSetTimeStop: adSet.adSetTimeStop || undefined,
        adSetDailyBudget: adSet.adSetDailyBudget ? Math.round(parseFloat(adSet.adSetDailyBudget) * 100) : undefined,
        adSetLifetimeBudget: adSet.adSetLifetimeBudget ? Math.round(parseFloat(adSet.adSetLifetimeBudget) * 100) : undefined,
        adSetBidStrategy: adSet.adSetBidStrategy,
        minimumROAS: adSet.minimumROAS ? Math.round(parseFloat(adSet.minimumROAS) * 100) : undefined,
        link: adSet.link || undefined,
        optimizationGoal: adSet.optimizationGoal,
        billingEvent: adSet.billingEvent,
        country: adSet.country || "United States",
        geoType: adSet.geoType || "city",
        geoLocation: adSet.geoLocation || undefined,
        ageRange: adSet.ageRange || undefined,
        gender: adSet.gender || "all",
      })),
    };
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaignName.trim()) {
      toast.error("Campaign Name is required to save draft");
      return;
    }

    setIsSubmitting(true);

    try {
      const dbData = convertToDatabase();
      await saveDraftMutation.mutateAsync(dbData);
      toast.success("Campaign saved as draft");
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePushToMeta = async () => {
    if (!validateForm()) return;

    if (!formData.adAccountId.trim()) {
      toast.error("Ad Account ID is required to push to Ads Manager");
      return;
    }

    setIsPushingToMeta(true);

    try {
      const dbData = convertToDatabase();
      const result = await pushToMetaMutation.mutateAsync({
        ...dbData,
        adAccountId: formData.adAccountId.trim(),
      });

      toast.success(
        `Campaign pushed to Ads Manager! Campaign ID: ${result.metaCampaignId}, ${result.metaAdSetIds.length} ad set(s) created.`
      );

      // Reset form but keep ad account ID
      setFormData({
        adAccountId: formData.adAccountId,
        campaignName: "",
        campaignStatus: "PAUSED",
        specialAdCategories: "None",
        specialAdCategoryCountry: "",
        campaignObjective: "",
        buyingType: "AUCTION",
        budgetLevel: "ad_set",
        campaignSpendLimit: "",
        campaignDailyBudget: "",
        campaignLifetimeBudget: "",
        campaignBidStrategy: "",
        adSets: [
          {
            id: "1",
            adSetName: "",
            adSetRunStatus: "ACTIVE",
            adSetTimeStart: "",
            adSetTimeStop: "",
            adSetDailyBudget: "",
            adSetLifetimeBudget: "",
            adSetBidStrategy: "",
            minimumROAS: "",
            link: "",
            optimizationGoal: "",
            billingEvent: "IMPRESSIONS",
            country: "United States",
            geoType: "city",
            geoLocation: "",
            ageRange: "",
            gender: "all",
          },
        ],
      });
    } catch (error) {
      console.error("Error pushing to Meta:", error);
      let errorMessage = "Failed to push to Ads Manager";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message;
      }
      toast.error(errorMessage);
    } finally {
      setIsPushingToMeta(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dbData = convertToDatabase();
      const result = await createCampaignMutation.mutateAsync(dbData);

      // Generate Excel file
      const excelResult = await generateExcelMutation.mutateAsync({
        campaignId: result.campaignId,
      });

      toast.success("Campaign created successfully!");

      // Trigger download from base64 data
      const binaryString = atob(excelResult.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = excelResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Reset form
      setFormData({
        adAccountId: formData.adAccountId, // Keep the ad account ID
        campaignName: "",
        campaignStatus: "PAUSED",
        specialAdCategories: "None",
        specialAdCategoryCountry: "",
        campaignObjective: "",
        buyingType: "AUCTION",
        budgetLevel: "ad_set",
        campaignSpendLimit: "",
        campaignDailyBudget: "",
        campaignLifetimeBudget: "",
        campaignBidStrategy: "",
        adSets: [
          {
            id: "1",
            adSetName: "",
            adSetRunStatus: "ACTIVE",
            adSetTimeStart: "",
            adSetTimeStop: "",
            adSetDailyBudget: "",
            adSetLifetimeBudget: "",
            adSetBidStrategy: "",
            minimumROAS: "",
            link: "",
            optimizationGoal: "",
            billingEvent: "IMPRESSIONS",
            country: "United States",
            geoType: "city",
            geoLocation: "",
            ageRange: "",
            gender: "all",
          },
        ],
      });
    } catch (error) {
      console.error("Error creating campaign:", error);
      let errorMessage = "Failed to create campaign";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Meta Campaign Intake Tool</h1>
          <p className="text-slate-600 mt-2">
            Create campaigns and ad sets for Meta Ads Manager bulk upload
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campaign Section */}
          <CampaignSection
            formData={formData}
            onChange={handleCampaignChange}
            buyingTypes={BUYING_TYPES}
            campaignObjectives={CAMPAIGN_OBJECTIVES}
            bidStrategies={BID_STRATEGIES}
            specialAdCategories={SPECIAL_AD_CATEGORIES}
            budgetLevels={BUDGET_LEVELS}
            onAdAccountValidation={(valid) => setIsAdAccountValid(valid)}
          />

          {/* Ad Sets Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Sets</CardTitle>
              <CardDescription>Add one or more ad sets for this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.adSets.map((adSet, index) => (
                <div key={adSet.id} className="space-y-3">
                  <AdSetForm
                    adSet={adSet}
                    index={index}
                    onChange={(field, value) => handleAdSetChange(adSet.id, field, value)}
                    onRemove={() => removeAdSet(adSet.id)}
                    canRemove={formData.adSets.length > 1}
                    budgetLevel={formData.budgetLevel}
                    bidStrategies={BID_STRATEGIES}
                    optimizationGoals={OPTIMIZATION_GOALS}
                    billingEvents={BILLING_EVENTS}
                    adSetStatuses={CAMPAIGN_STATUSES}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateAdSet(adSet.id)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    📋 Duplicate Ad Set
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addAdSet}
                className="w-full"
              >
                + Add Another Ad Set
              </Button>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting || createCampaignMutation.isPending}
                className="flex-1"
                variant="outline"
              >
                {isSubmitting ? "Generating Excel..." : "Generate Excel & Download"}
              </Button>
              <Button
                type="button"
                disabled={isPushingToMeta || pushToMetaMutation.isPending || isSubmitting || !isAdAccountValid}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handlePushToMeta}
                title={!isAdAccountValid ? "Enter and validate an Ad Account ID first" : undefined}
              >
                {isPushingToMeta ? "Pushing to Ads Manager..." : "Push to Ads Manager"}
              </Button>
            </div>
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || saveDraftMutation.isPending}
                onClick={handleSaveDraft}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => window.location.href = '/drafts'}
              >
                View Drafts
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
