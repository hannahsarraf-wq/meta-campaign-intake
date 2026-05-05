import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FormProgressStepper, type ProgressSection } from "@/components/FormProgressStepper";
import { CampaignSwitcher } from "@/components/CampaignSwitcher";
import SaveCampaignModal from "@/components/SaveCampaignModal";
import { Copy, FilePlus, Upload } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdSet {
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
  adSets: AdSet[];
}

interface CampaignInstance {
  id: string;
  formData: FormData;
  isAdAccountValid: boolean;
  mode: "choosing" | "intake";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FORM_SECTIONS: ProgressSection[] = [
  { id: "section-campaign", label: "Campaign" },
  { id: "section-adsets", label: "Ad Sets" },
];

function makeInstanceId() {
  return `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function blankAdSet(id: string): AdSet {
  return {
    id,
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
  };
}

function blankFormData(): FormData {
  return {
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
    adSets: [blankAdSet("1")],
  };
}

// ─── Session-draft loader ─────────────────────────────────────────────────────

function loadDraftFromSession(): FormData | null {
  const raw = sessionStorage.getItem("loadedDraft");
  if (!raw) return null;

  try {
    const d = JSON.parse(raw);
    const formattedData: FormData = {
      adAccountId: d.adAccountId || "",
      campaignName: d.campaignName || "",
      campaignStatus: d.campaignStatus || "PAUSED",
      specialAdCategories: d.specialAdCategories || "None",
      specialAdCategoryCountry: d.specialAdCategoryCountry || "",
      campaignObjective: d.campaignObjective || "",
      buyingType: d.buyingType || "AUCTION",
      budgetLevel: d.budgetLevel || "ad_set",
      campaignSpendLimit: d.campaignSpendLimit ? String(d.campaignSpendLimit / 100) : "",
      campaignDailyBudget: d.campaignDailyBudget ? String(d.campaignDailyBudget / 100) : "",
      campaignLifetimeBudget: d.campaignLifetimeBudget ? String(d.campaignLifetimeBudget / 100) : "",
      campaignBidStrategy: d.campaignBidStrategy || "",
      adSets: (d.adSets || []).map((a: any) => ({
        id: String(a.id),
        adSetName: a.adSetName || "",
        adSetRunStatus: a.adSetRunStatus || "ACTIVE",
        adSetTimeStart: a.adSetTimeStart || "",
        adSetTimeStop: a.adSetTimeStop || "",
        adSetDailyBudget: a.adSetDailyBudget ? String(a.adSetDailyBudget / 100) : "",
        adSetLifetimeBudget: a.adSetLifetimeBudget ? String(a.adSetLifetimeBudget / 100) : "",
        adSetBidStrategy: a.adSetBidStrategy || "",
        minimumROAS: a.minimumROAS ? String(a.minimumROAS) : "",
        link: a.link || "",
        optimizationGoal: a.optimizationGoal || "",
        billingEvent: a.billingEvent || "IMPRESSIONS",
        country: a.country || "United States",
        geoType: a.geoType || "city",
        geoLocation: a.geoLocation || "",
        ageRange: a.ageRange || "",
        gender: a.gender || "all",
      })),
    };
    sessionStorage.removeItem("loadedDraft");
    return formattedData;
  } catch {
    return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignIntake() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const generateExcelFromDataMutation = trpc.campaigns.generateExcelFromData.useMutation();
  const saveDraftMutation = trpc.campaigns.saveDraft.useMutation();
  const saveCampaignMutation = trpc.campaigns.saveCampaign.useMutation();
  const pushToMetaMutation = trpc.campaigns.pushToMeta.useMutation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPushingToMeta, setIsPushingToMeta] = useState(false);
  const [saveModal, setSaveModal] = useState<{
    open: boolean;
    campaignData: ReturnType<typeof convertToDatabase> | null;
    source: string;
    existingCampaignId?: number;
  }>({ open: false, campaignData: null, source: "excel" });

  // ── Multi-instance state ──────────────────────────────────────────────────

  const [instances, setInstances] = useState<CampaignInstance[]>(() => {
    const id = makeInstanceId();
    return [{ id, formData: blankFormData(), isAdAccountValid: false, mode: "choosing" }];
  });

  const [activeId, setActiveId] = useState<string>(() => instances[0].id);

  // Always-current ref so async callbacks don't close over a stale activeId
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Derived
  const activeInstance = instances.find((i) => i.id === activeId) ?? instances[0];
  const formData = activeInstance.formData;
  const isAdAccountValid = activeInstance.isAdAccountValid;

  // Update the active instance's formData. Accepts direct value or functional updater.
  const setFormData = (
    dataOrUpdater: FormData | ((prev: FormData) => FormData)
  ) => {
    setInstances((prev) =>
      prev.map((inst) => {
        if (inst.id !== activeIdRef.current) return inst;
        const next =
          typeof dataOrUpdater === "function"
            ? dataOrUpdater(inst.formData)
            : dataOrUpdater;
        return { ...inst, formData: next };
      })
    );
  };

  const setIsAdAccountValid = (valid: boolean) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === activeIdRef.current
          ? { ...inst, isAdAccountValid: valid }
          : inst
      )
    );
  };

  const setMode = (mode: "choosing" | "intake", formDataOverride?: FormData) => {
    setInstances((prev) =>
      prev.map((inst) =>
        inst.id === activeIdRef.current
          ? { ...inst, mode, ...(formDataOverride ? { formData: formDataOverride } : {}) }
          : inst
      )
    );
  };

  // Load draft from session storage on mount
  useEffect(() => {
    const draft = loadDraftFromSession();
    if (draft) {
      setInstances((prev) =>
        prev.map((inst, idx) => (idx === 0 ? { ...inst, formData: draft, mode: "intake" } : inst))
      );
      toast.success("Draft loaded successfully");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Instance management ───────────────────────────────────────────────────

  const switchInstance = (id: string) => {
    setActiveId(id);
    activeIdRef.current = id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const newInstance = () => {
    const id = makeInstanceId();
    setInstances((prev) => [
      ...prev,
      { id, formData: blankFormData(), isAdAccountValid: false, mode: "choosing" },
    ]);
    setActiveId(id);
    activeIdRef.current = id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateInstance = () => {
    const source = instances.find((i) => i.id === activeIdRef.current);
    if (!source) return;

    const baseName = source.formData.campaignName.trim() || "Untitled Campaign";
    const newId = makeInstanceId();

    const newInstance: CampaignInstance = {
      id: newId,
      mode: "intake",
      formData: {
        ...source.formData,
        campaignName: `${baseName} Copy`,
        // Re-number ad sets sequentially so addAdSet's parseInt logic stays consistent
        adSets: source.formData.adSets.map((adSet, idx) => ({
          ...adSet,
          id: String(idx + 1),
        })),
      },
      isAdAccountValid: false, // ad account validation resets for the copy
    };

    setInstances((prev) => [...prev, newInstance]);
    setActiveId(newId);
    activeIdRef.current = newId;
    toast.success("Campaign duplicated");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Form field handlers ───────────────────────────────────────────────────

  const handleCampaignChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdSetChange = (adSetId: string, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      adSets: prev.adSets.map((a) =>
        a.id === adSetId ? { ...a, [field]: value } : a
      ),
    }));
  };

  const addAdSet = () => {
    const newId = String(
      Math.max(...formData.adSets.map((a) => parseInt(a.id) || 0), 0) + 1
    );
    setFormData((prev) => ({
      ...prev,
      adSets: [...prev.adSets, blankAdSet(newId)],
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
    const source = formData.adSets.find((a) => a.id === adSetId);
    if (!source) return;

    const newId = String(
      Math.max(...formData.adSets.map((a) => parseInt(a.id) || 0), 0) + 1
    );

    setFormData((prev) => ({
      ...prev,
      adSets: [
        ...prev.adSets,
        { ...source, id: newId, adSetName: `${source.adSetName} (Copy)` },
      ],
    }));
    toast.success("Ad set duplicated");
  };

  // ── Validation & conversion helpers (unchanged logic) ─────────────────────

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateForm = (): boolean => {
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
      if (
        (adSet.adSetTimeStart && !adSet.adSetTimeStop) ||
        (!adSet.adSetTimeStart && adSet.adSetTimeStop)
      ) {
        toast.error("Both Ad Set Time Start and Stop must be set together");
        return false;
      }
      if (
        formData.budgetLevel === "ad_set" &&
        !adSet.adSetDailyBudget &&
        !adSet.adSetLifetimeBudget
      ) {
        toast.error("Each Ad Set must have either a Daily or Lifetime Budget");
        return false;
      }
      const isRoas =
        adSet.adSetBidStrategy.includes("Min ROAS") ||
        adSet.adSetBidStrategy === "ROAS goal";
      if (isRoas && !adSet.minimumROAS) {
        toast.error("Minimum ROAS is required for ROAS-based bid strategies");
        return false;
      }
      if (adSet.link && !isValidUrl(adSet.link)) {
        toast.error("Invalid URL in Link field");
        return false;
      }
    }
    return true;
  };

  const convertToDatabase = () => ({
    campaignName: formData.campaignName,
    campaignStatus: formData.campaignStatus,
    specialAdCategories:
      formData.specialAdCategories === "None"
        ? undefined
        : formData.specialAdCategories,
    specialAdCategoryCountry: formData.specialAdCategoryCountry || undefined,
    campaignObjective: formData.campaignObjective,
    buyingType: formData.buyingType,
    campaignSpendLimit:
      formData.budgetLevel === "campaign" && formData.campaignSpendLimit
        ? Math.round(parseFloat(formData.campaignSpendLimit) * 100)
        : undefined,
    campaignDailyBudget:
      formData.budgetLevel === "campaign" && formData.campaignDailyBudget
        ? Math.round(parseFloat(formData.campaignDailyBudget) * 100)
        : undefined,
    campaignLifetimeBudget:
      formData.budgetLevel === "campaign" && formData.campaignLifetimeBudget
        ? Math.round(parseFloat(formData.campaignLifetimeBudget) * 100)
        : undefined,
    campaignBidStrategy: formData.campaignBidStrategy || undefined,
    budgetLevel: formData.budgetLevel,
    adSets: formData.adSets.map((a) => ({
      adSetName: a.adSetName,
      adSetRunStatus: a.adSetRunStatus,
      adSetTimeStart: a.adSetTimeStart || undefined,
      adSetTimeStop: a.adSetTimeStop || undefined,
      adSetDailyBudget: a.adSetDailyBudget
        ? Math.round(parseFloat(a.adSetDailyBudget) * 100)
        : undefined,
      adSetLifetimeBudget: a.adSetLifetimeBudget
        ? Math.round(parseFloat(a.adSetLifetimeBudget) * 100)
        : undefined,
      adSetBidStrategy: a.adSetBidStrategy,
      minimumROAS: a.minimumROAS
        ? Math.round(parseFloat(a.minimumROAS) * 100)
        : undefined,
      link: a.link || undefined,
      optimizationGoal: a.optimizationGoal,
      billingEvent: a.billingEvent,
      country: a.country || "United States",
      geoType: a.geoType || "city",
      geoLocation: a.geoLocation || undefined,
      ageRange: a.ageRange || undefined,
      gender: a.gender || "all",
    })),
  });

  const convertToDraftData = () => ({
    campaignName: formData.campaignName,
    campaignStatus: formData.campaignStatus,
    specialAdCategories:
      formData.specialAdCategories === "None"
        ? undefined
        : formData.specialAdCategories,
    specialAdCategoryCountry: formData.specialAdCategoryCountry || undefined,
    campaignObjective: formData.campaignObjective || undefined,
    buyingType: formData.buyingType || undefined,
    campaignSpendLimit:
      formData.budgetLevel === "campaign" && formData.campaignSpendLimit
        ? Math.round(parseFloat(formData.campaignSpendLimit) * 100)
        : undefined,
    campaignDailyBudget:
      formData.budgetLevel === "campaign" && formData.campaignDailyBudget
        ? Math.round(parseFloat(formData.campaignDailyBudget) * 100)
        : undefined,
    campaignLifetimeBudget:
      formData.budgetLevel === "campaign" && formData.campaignLifetimeBudget
        ? Math.round(parseFloat(formData.campaignLifetimeBudget) * 100)
        : undefined,
    campaignBidStrategy: formData.campaignBidStrategy || undefined,
    budgetLevel: formData.budgetLevel,
    adSets: formData.adSets
      .filter((a) => a.adSetName.trim())
      .map((a) => ({
        adSetName: a.adSetName,
        adSetRunStatus: a.adSetRunStatus,
        adSetTimeStart: a.adSetTimeStart || undefined,
        adSetTimeStop: a.adSetTimeStop || undefined,
        adSetDailyBudget: a.adSetDailyBudget
          ? Math.round(parseFloat(a.adSetDailyBudget) * 100)
          : undefined,
        adSetLifetimeBudget: a.adSetLifetimeBudget
          ? Math.round(parseFloat(a.adSetLifetimeBudget) * 100)
          : undefined,
        adSetBidStrategy: a.adSetBidStrategy || undefined,
        minimumROAS: a.minimumROAS
          ? Math.round(parseFloat(a.minimumROAS) * 100)
          : undefined,
        link: a.link && isValidUrl(a.link) ? a.link : undefined,
        optimizationGoal: a.optimizationGoal || undefined,
        billingEvent: a.billingEvent || undefined,
        country: a.country || "United States",
        geoType: a.geoType || "city",
        geoLocation: a.geoLocation || undefined,
        ageRange: a.ageRange || undefined,
        gender: a.gender || "all",
      })),
  });

  // ── CSV import ────────────────────────────────────────────────────────────

  const handleImportCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
        const col = (names: string[]) => {
          const idx = names.map((n) => headers.indexOf(n)).find((i) => i >= 0);
          return idx !== undefined ? idx : -1;
        };

        const parseRow = (row: string) => {
          const cols: string[] = [];
          let cur = "", inQ = false;
          for (const ch of row) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ""; }
            else cur += ch;
          }
          cols.push(cur.trim());
          return cols;
        };

        const rows = lines.slice(1).map(parseRow);
        const get = (row: string[], names: string[]) => { const i = col(names); return i >= 0 ? (row[i] || "") : ""; };

        const firstRow = rows[0];
        const importedData: FormData = {
          adAccountId: "",
          campaignName: get(firstRow, ["campaign_name", "campaignname", "name"]),
          campaignStatus: get(firstRow, ["campaign_status", "status"]) || "PAUSED",
          specialAdCategories: get(firstRow, ["special_ad_categories", "specialadcategories"]) || "None",
          specialAdCategoryCountry: get(firstRow, ["special_ad_category_country", "specialadcategorycountry"]),
          campaignObjective: get(firstRow, ["campaign_objective", "objective"]),
          buyingType: get(firstRow, ["buying_type", "buyingtype"]) || "AUCTION",
          budgetLevel: get(firstRow, ["budget_level", "budgetlevel"]) || "ad_set",
          campaignSpendLimit: get(firstRow, ["campaign_spend_limit", "campaignspendlimit"]),
          campaignDailyBudget: get(firstRow, ["campaign_daily_budget", "campaigndailybudget"]),
          campaignLifetimeBudget: get(firstRow, ["campaign_lifetime_budget", "campaignlifetimebudget"]),
          campaignBidStrategy: get(firstRow, ["campaign_bid_strategy", "campaignbidstrategy"]),
          adSets: rows.map((row, idx) => ({
            id: String(idx + 1),
            adSetName: get(row, ["ad_set_name", "adsetname", "adset_name"]) || `Ad Set ${idx + 1}`,
            adSetRunStatus: get(row, ["ad_set_status", "adsetstatus", "status"]) || "ACTIVE",
            adSetTimeStart: get(row, ["start_time", "adset_start_time", "adsetstarttime"]),
            adSetTimeStop: get(row, ["end_time", "stop_time", "adset_stop_time", "adsetstoptime"]),
            adSetDailyBudget: get(row, ["daily_budget", "adset_daily_budget", "adsetdailybudget"]),
            adSetLifetimeBudget: get(row, ["lifetime_budget", "adset_lifetime_budget", "adsetlifetimebudget"]),
            adSetBidStrategy: get(row, ["bid_strategy", "adset_bid_strategy", "adsetbidstrategy"]),
            minimumROAS: get(row, ["minimum_roas", "minimumroas", "roas_goal"]),
            link: get(row, ["link", "url", "website_url"]),
            optimizationGoal: get(row, ["optimization_goal", "optimizationgoal"]),
            billingEvent: get(row, ["billing_event", "billingevent"]) || "IMPRESSIONS",
            country: get(row, ["country", "geo_country"]) || "United States",
            geoType: get(row, ["geo_type", "geotype"]) || "city",
            geoLocation: get(row, ["geo_location", "geolocation", "location"]),
            ageRange: get(row, ["age_range", "agerange", "age"]),
            gender: get(row, ["gender"]) || "all",
          })),
        };

        setMode("intake", importedData);
        toast.success(`Imported ${rows.length} ad set row(s) from CSV`);
      } catch {
        toast.error("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  // ── Submit handlers ───────────────────────────────────────────────────────

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaignName.trim()) {
      toast.error("Campaign Name is required to save draft");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDraftMutation.mutateAsync(convertToDraftData());
      toast.success("Campaign saved as draft");
    } catch {
      toast.error("Failed to save draft");
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

    // Capture which instance initiated the push so the reset targets it correctly
    const instanceId = activeIdRef.current;
    const accountId = formData.adAccountId;
    const pushPayload = convertToDatabase();

    setIsPushingToMeta(true);
    try {
      const result = await pushToMetaMutation.mutateAsync({
        ...pushPayload,
        adAccountId: accountId,
      });

      toast.success(
        `Campaign pushed to Ads Manager! Campaign ID: ${result.metaCampaignId}, ${result.metaAdSetIds.length} ad set(s) created.`
      );

      setSaveModal({ open: true, campaignData: pushPayload, source: "push", existingCampaignId: result.campaignId });

      // Reset only the instance that was submitted
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === instanceId
            ? { ...inst, mode: "choosing", isAdAccountValid: inst.isAdAccountValid, formData: { ...blankFormData(), adAccountId: accountId } }
            : inst
        )
      );
    } catch (error) {
      let msg = "Failed to push to Ads Manager";
      if (error instanceof Error) msg = error.message;
      else if (typeof error === "object" && error !== null && "message" in error)
        msg = (error as any).message;
      toast.error(msg);
    } finally {
      setIsPushingToMeta(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const instanceId = activeIdRef.current;
    const accountId = formData.adAccountId;
    const campaignPayload = convertToDatabase();

    setIsSubmitting(true);
    try {
      const excelResult = await generateExcelFromDataMutation.mutateAsync(campaignPayload);

      // Trigger download
      const bytes = new Uint8Array(
        atob(excelResult.data)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = excelResult.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel downloaded!");
      setSaveModal({ open: true, campaignData: campaignPayload, source: "excel" });

      // Reset the submitted instance, keep ad account ID
      setInstances((prev) =>
        prev.map((inst) =>
          inst.id === instanceId
            ? { ...inst, mode: "choosing", isAdAccountValid: inst.isAdAccountValid, formData: { ...blankFormData(), adAccountId: accountId } }
            : inst
        )
      );
    } catch (error) {
      let msg = "Failed to generate Excel";
      if (error instanceof Error) msg = error.message;
      else if (typeof error === "object" && error !== null && "message" in error)
        msg = (error as any).message;
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!user) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">Campaign Intake</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Build campaigns and ad sets for Meta Ads Manager
          </p>
        </div>

        {/* ── Choosing mode: pick Build New or Import CSV ── */}
        {activeInstance.mode === "choosing" ? (
          <div className="flex gap-6 items-start mt-4">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                <button
                  onClick={() => setMode("intake")}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors p-8 text-center group"
                >
                  <FilePlus className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <div>
                    <p className="font-semibold text-slate-800">Build New</p>
                    <p className="text-sm text-slate-500 mt-0.5">Fill in the form manually</p>
                  </div>
                </button>

                <label className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors p-8 text-center cursor-pointer group">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  <div>
                    <p className="font-semibold text-slate-800">Upload Campaign Export</p>
                    <p className="text-sm text-slate-500 mt-0.5">Import from a Meta CSV export</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImportCsv(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Right panel: campaign switcher */}
            <div className="hidden md:block w-52 shrink-0 sticky top-16">
              <CampaignSwitcher
                instances={instances}
                activeId={activeId}
                onSwitch={switchInstance}
                onNew={newInstance}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Progress stepper — sticky, sits below the mobile sidebar header (h-14) on small screens */}
            <div className="sticky top-14 md:top-0 z-20 bg-slate-50 py-2 -mx-4 px-4">
              <FormProgressStepper sections={FORM_SECTIONS} />
            </div>

            {/* Main layout: form + right campaign-switcher panel */}
            <div className="flex gap-6 items-start mt-2">
              {/* ── Form ── */}
              <div className="flex-1 min-w-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Campaign Details */}
                  <div id="section-campaign">
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
                  </div>

                  {/* Ad Sets */}
                  <div id="section-adsets">
                    <Card>
                      <CardHeader>
                        <CardTitle>Ad Sets</CardTitle>
                        <CardDescription>
                          Add one or more ad sets for this campaign
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {formData.adSets.map((adSet, index) => (
                          <div key={adSet.id} className="space-y-2">
                            <AdSetForm
                              adSet={adSet}
                              index={index}
                              onChange={(field, value) =>
                                handleAdSetChange(adSet.id, field, value)
                              }
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
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-3">
                    {/* Primary actions */}
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isSubmitting || generateExcelFromDataMutation.isPending}
                        className="flex-1"
                        variant="outline"
                      >
                        {isSubmitting ? "Generating…" : "Generate Excel & Download"}
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          isPushingToMeta ||
                          pushToMetaMutation.isPending ||
                          isSubmitting ||
                          !isAdAccountValid
                        }
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handlePushToMeta}
                        title={
                          !isAdAccountValid
                            ? "Enter and validate an Ad Account ID first"
                            : undefined
                        }
                      >
                        {isPushingToMeta ? "Pushing…" : "Push to Ads Manager"}
                      </Button>
                    </div>

                    {/* Secondary actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting || saveDraftMutation.isPending}
                        onClick={handleSaveDraft}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={duplicateInstance}
                        className="gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setMode("choosing")}
                      >
                        ← Start Over
                      </Button>
                    </div>
                  </div>
                </form>
              </div>

              {/* ── Right panel: campaign switcher (desktop only) ── */}
              <div className="hidden md:block w-52 shrink-0 sticky top-16">
                <CampaignSwitcher
                  instances={instances}
                  activeId={activeId}
                  onSwitch={switchInstance}
                  onNew={newInstance}
                />
              </div>
            </div>

            {/* Mobile: campaign switcher below the form (only when multiple intakes exist) */}
            {instances.length > 1 && (
              <div className="md:hidden mt-6">
                <CampaignSwitcher
                  instances={instances}
                  activeId={activeId}
                  onSwitch={switchInstance}
                  onNew={newInstance}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Save Campaign Modal */}
      {saveModal.open && saveModal.campaignData && (
        <SaveCampaignModal
          open={saveModal.open}
          onClose={() => setSaveModal((s) => ({ ...s, open: false }))}
          campaignData={saveModal.campaignData}
          source={saveModal.source}
          existingCampaignId={saveModal.existingCampaignId}
        />
      )}
    </div>
  );
}
