import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export interface SwitcherInstance {
  id: string;
  formData: { campaignName: string };
}

interface CampaignSwitcherProps {
  instances: SwitcherInstance[];
  activeId: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
}

export function CampaignSwitcher({
  instances,
  activeId,
  onSwitch,
  onNew,
}: CampaignSwitcherProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Active Intakes
        </h3>
        <button
          type="button"
          onClick={onNew}
          title="New campaign intake"
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <ul className="space-y-0.5">
        {instances.map((inst) => {
          const name = inst.formData.campaignName.trim() || "Untitled Campaign";
          const isActive = inst.id === activeId;
          return (
            <li key={inst.id}>
              <button
                type="button"
                onClick={() => onSwitch(inst.id)}
                className={cn(
                  "w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isActive ? "bg-blue-500" : "bg-slate-300"
                  )}
                />
                <span className="truncate">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
