import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Clock } from "lucide-react";

export default function PushHistory() {
  return (
    <div className="bg-slate-50 min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Push History</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <ShieldAlert className="w-3 h-3" />
                Admin
              </span>
            </div>
            <p className="text-slate-600 text-sm mt-1">
              Full audit log of all campaigns pushed to Meta Ads Manager
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <Clock className="w-10 h-10 text-slate-300" />
            <div>
              <p className="text-slate-600 font-medium">Push history view coming soon</p>
              <p className="text-slate-400 text-sm mt-1">
                Admin-level push audit log will appear here in the next pass.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
