import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bookmark } from "lucide-react";
import { useLocation } from "wouter";

export default function SavedCampaigns() {
  const [, setLocation] = useLocation();

  return (
    <div className="bg-slate-50 min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Saved Campaigns</h1>
          <p className="text-slate-600 text-sm mt-1">
            Campaigns that have been submitted or pushed to Ads Manager
          </p>
        </div>

        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <Bookmark className="w-10 h-10 text-slate-300" />
            <div>
              <p className="text-slate-600 font-medium">Saved campaigns view coming soon</p>
              <p className="text-slate-400 text-sm mt-1">
                Submitted and pushed campaigns will appear here.
              </p>
            </div>
            <Button onClick={() => setLocation("/intake")} variant="default" size="sm">
              Create New Campaign
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
