import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { Bookmark, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

export default function SavedCampaigns() {
  const [, setLocation] = useLocation();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: campaigns, isLoading } = trpc.campaigns.listSaved.useQuery();
  const deleteMutation = trpc.campaigns.deleteCampaign.useMutation({
    onSuccess: () => {
      utils.campaigns.listSaved.invalidate();
      toast.success("Campaign deleted.");
    },
    onError: () => toast.error("Failed to delete campaign."),
  });
  const duplicateMutation = trpc.campaigns.duplicateCampaign.useMutation({
    onSuccess: () => {
      utils.campaigns.listDrafts.invalidate();
      toast.success("Campaign duplicated as a draft.");
    },
    onError: () => toast.error("Failed to duplicate campaign."),
  });

  const confirmDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ campaignId: deleteId });
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Saved Campaigns</h1>
            <p className="text-slate-600 text-sm mt-1">
              Campaigns that have been submitted or pushed to Ads Manager
            </p>
          </div>
          <Button onClick={() => setLocation("/intake")} size="sm">
            New Campaign
          </Button>
        </div>

        {!campaigns?.length ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <Bookmark className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-slate-600 font-medium">No saved campaigns yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  Generate an Excel file or push a campaign to save it here.
                </p>
              </div>
              <Button onClick={() => setLocation("/intake")} variant="default" size="sm">
                Create New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{campaign.campaignName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500">
                          {campaign.adSetCount} ad set{campaign.adSetCount !== 1 ? "s" : ""}
                        </span>
                        {campaign.campaignObjective && (
                          <span className="text-xs text-slate-500">{campaign.campaignObjective}</span>
                        )}
                        {campaign.source && campaign.source !== "manual" && (
                          <span className="text-xs text-blue-600 capitalize">{campaign.source}</span>
                        )}
                        <span className="text-xs text-slate-400">
                          Saved {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                        </span>
                        {campaign.pushedAt && (
                          <span className="text-xs text-green-600">
                            Pushed {format(new Date(campaign.pushedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/intake?campaignId=${campaign.id}`)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateMutation.mutate({ campaignId: campaign.id })}
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(campaign.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign and all its ad sets. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
