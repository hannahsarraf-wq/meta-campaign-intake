import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Trash2, Copy } from "lucide-react";

export default function Drafts() {
  const [, setLocation] = useLocation();
  const listDraftsQuery = trpc.campaigns.listDrafts.useQuery();
  const deleteDraftMutation = trpc.campaigns.deleteDraft.useMutation();
  const utils = trpc.useUtils();

  const handleLoadDraft = async (draftId: number) => {
    try {
      const data = await utils.campaigns.getWithAdSets.fetch({ campaignId: draftId });
      if (data) {
        sessionStorage.setItem("loadedDraft", JSON.stringify(data));
        setLocation("/intake");
      } else {
        toast.error("Failed to load draft data");
      }
    } catch (error) {
      toast.error("Failed to load draft");
      console.error(error);
    }
  };

  const handleDeleteDraft = async (draftId: number) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    try {
      await deleteDraftMutation.mutateAsync({ campaignId: draftId });
      await listDraftsQuery.refetch();
      toast.success("Draft deleted");
    } catch (error) {
      toast.error("Failed to delete draft");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Campaign Drafts</h1>
            <p className="text-slate-600 mt-2">View and manage your saved campaign drafts</p>
          </div>
          <Button onClick={() => setLocation("/intake")} variant="default">
            Create New Campaign
          </Button>
        </div>

        {listDraftsQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading drafts...</p>
          </div>
        ) : !listDraftsQuery.data || listDraftsQuery.data.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-slate-600 mb-4">No drafts yet. Start creating a campaign!</p>
              <Button onClick={() => setLocation("/intake")} variant="default">
                Create New Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {listDraftsQuery.data?.map((draft: any) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{draft.campaignName || "Untitled Campaign"}</CardTitle>
                      <CardDescription>
                        {draft.adSetCount || 0} ad set{draft.adSetCount !== 1 ? "s" : ""} • Saved{" "}
                        {new Date(draft.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLoadDraft(draft.id)}
                        className="gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteDraft(draft.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Objective</p>
                      <p className="font-medium">{draft.campaignObjective || "—"}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Budget Level</p>
                      <p className="font-medium">
                        {draft.budgetLevel === "campaign" ? "Campaign (CBO)" : "Ad Set Level"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
