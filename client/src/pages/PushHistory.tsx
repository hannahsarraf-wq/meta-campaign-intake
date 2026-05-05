import { useAuth } from "@/_core/hooks/useAuth";
import { isAdminUser } from "@/lib/admin";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Clock, Loader2, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function PushHistory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAdminUser(user)) {
    setLocation("/");
    return null;
  }

  return <PushHistoryContent />;
}

function PushHistoryContent() {
  const { data: history, isLoading } = trpc.campaigns.listPushHistory.useQuery();

  return (
    <div className="bg-slate-50 min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Push History</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-3 h-3" />
              Admin
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Campaigns pushed to Meta Ads Manager in the last 30 days
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !history?.length ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
              <Clock className="w-10 h-10 text-slate-300" />
              <div>
                <p className="text-slate-600 font-medium">No pushes in the last 30 days</p>
                <p className="text-slate-400 text-sm mt-1">
                  Push records appear here after campaigns are sent to Ads Manager.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{entry.campaignName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500">
                          Pushed by {entry.userName || entry.userEmail || "unknown"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {format(new Date(entry.pushedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Meta ID: {entry.metaCampaignId}
                        </span>
                      </div>
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
