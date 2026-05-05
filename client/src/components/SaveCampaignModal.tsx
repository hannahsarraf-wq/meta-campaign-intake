import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AdSetInput = {
  adSetName: string;
  adSetRunStatus: string;
  adSetTimeStart?: string;
  adSetTimeStop?: string;
  adSetDailyBudget?: number;
  adSetLifetimeBudget?: number;
  adSetBidStrategy?: string;
  minimumROAS?: number;
  link?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  country?: string;
  geoType?: string;
  geoLocation?: string;
  ageRange?: string;
  gender?: string;
};

type CampaignInput = {
  campaignName: string;
  campaignStatus: string;
  specialAdCategories?: string;
  specialAdCategoryCountry?: string;
  campaignObjective: string;
  buyingType: string;
  campaignSpendLimit?: number;
  campaignDailyBudget?: number;
  campaignLifetimeBudget?: number;
  campaignBidStrategy?: string;
  budgetLevel: string;
  adSets: AdSetInput[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  campaignData: CampaignInput;
  source?: string;
  /** If provided, the campaign was already pushed/generated with this server-side ID — skip the save step */
  existingCampaignId?: number;
  onSaved?: (campaignId: number) => void;
};

export default function SaveCampaignModal({ open, onClose, campaignData, source = "manual", existingCampaignId, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const saveCampaign = trpc.campaigns.saveCampaign.useMutation();

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveCampaign.mutateAsync({
        ...campaignData,
        source,
        campaignId: existingCampaignId,
      });
      toast.success("Campaign saved to Saved Campaigns.");
      onSaved?.(result.campaignId);
      onClose();
    } catch {
      toast.error("Failed to save campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save campaign?</DialogTitle>
          <DialogDescription>
            Save <strong>{campaignData.campaignName}</strong> to your Saved Campaigns so you can load and edit it later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Not now
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
