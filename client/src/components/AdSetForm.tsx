import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface AdSetFormProps {
  adSet: any;
  index: number;
  onChange: (field: string, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  budgetLevel: string;
  bidStrategies: readonly string[];
  optimizationGoals: readonly string[];
  billingEvents: readonly string[];
  adSetStatuses: readonly string[];
}

const GEO_FORMATTING_GUIDE = {
  zip: {
    placeholder: "e.g., 10001, 90210, 60601",
    helper: "Format: Comma-separated 5-digit ZIP codes. Country will be automatically added to Excel output (e.g., US:10001, US:90210)",
  },
  address: {
    placeholder: "e.g., Creamery Ln, Bowling Green, Kentucky (36.9685, -86.4808) +15mi",
    helper: "Format: Street name, City, State (latitude, longitude) +radius_in_miles. Country will be automatically added to Excel output.",
  },
  city: {
    placeholder: "e.g., Palo Alto, CA; New York, NY",
    helper: "Format: City, State abbreviation (e.g., Palo Alto, CA; New York, NY). Country will be automatically added to Excel output.",
  },
  region: {
    placeholder: "e.g., California, Texas, New York",
    helper: "Format: Full state/region names (no abbreviations). Delimit multiple with comma. Country will be automatically added to Excel output.",
  },
  county: {
    placeholder: "e.g., Warren County, Kentucky",
    helper: "Format: County name, State. Delimit multiple with semicolon (e.g., Warren County, Kentucky; Cook County, Illinois). Country will be automatically added to Excel output.",
  },
};

export default function AdSetForm({
  adSet,
  index,
  onChange,
  onRemove,
  canRemove,
  budgetLevel,
  bidStrategies,
  optimizationGoals,
  billingEvents,
  adSetStatuses,
}: AdSetFormProps) {
  const geoType = adSet.geoType || "city";
  const geoGuide = GEO_FORMATTING_GUIDE[geoType as keyof typeof GEO_FORMATTING_GUIDE];

  return (
    <Card className="relative">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Ad Set {index + 1}</h3>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Ad Set Name */}
          <div className="grid gap-2">
            <Label htmlFor={`adSetName-${adSet.id}`} className="font-medium">
              Ad Set Name *
            </Label>
            <Input
              id={`adSetName-${adSet.id}`}
              placeholder="e.g., Desktop - US - 18-35"
              value={adSet.adSetName}
              onChange={(e) => onChange("adSetName", e.target.value)}
              maxLength={255}
            />
            <p className="text-xs text-slate-500">
              {adSet.adSetName.length}/255 characters
            </p>
          </div>

          {/* Ad Set Status */}
          <div className="grid gap-2">
            <Label htmlFor={`adSetRunStatus-${adSet.id}`} className="font-medium">
              Ad Set Status *
            </Label>
            <Select value={adSet.adSetRunStatus} onValueChange={(value) => onChange("adSetRunStatus", value)}>
              <SelectTrigger id={`adSetRunStatus-${adSet.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adSetStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`adSetTimeStart-${adSet.id}`} className="font-medium text-sm">
                Start Time
              </Label>
              <Input
                id={`adSetTimeStart-${adSet.id}`}
                type="datetime-local"
                value={adSet.adSetTimeStart}
                onChange={(e) => onChange("adSetTimeStart", e.target.value)}
              />
              <p className="text-xs text-slate-500">Format: MM/DD/YY HH:MM</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`adSetTimeStop-${adSet.id}`} className="font-medium text-sm">
                Stop Time
              </Label>
              <Input
                id={`adSetTimeStop-${adSet.id}`}
                type="datetime-local"
                value={adSet.adSetTimeStop}
                onChange={(e) => onChange("adSetTimeStop", e.target.value)}
              />
              <p className="text-xs text-slate-500">Format: MM/DD/YY HH:MM</p>
            </div>
          </div>

          {/* Geo/Targeting Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Geo & Targeting</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country */}
              <div className="grid gap-2">
                <Label htmlFor={`country-${adSet.id}`} className="font-medium text-sm">
                  Country
                </Label>
                <Input
                  id={`country-${adSet.id}`}
                  placeholder="United States"
                  value={adSet.country || "United States"}
                  onChange={(e) => onChange("country", e.target.value)}
                  maxLength={255}
                />
                <p className="text-xs text-slate-500">Country will be automatically added to all geo formats in Excel</p>
              </div>

              {/* Geo Type Selector */}
              <div className="grid gap-2">
                <Label htmlFor={`geoType-${adSet.id}`} className="font-medium text-sm">
                  Geo Type
                </Label>
                <Select value={geoType} onValueChange={(value) => onChange("geoType", value)}>
                  <SelectTrigger id={`geoType-${adSet.id}`}>
                    <SelectValue placeholder="Select geo type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Code</SelectItem>
                    <SelectItem value="address">Address</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="region">Region/State</SelectItem>
                    <SelectItem value="county">County</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Geo Location Input */}
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor={`geoLocation-${adSet.id}`} className="font-medium text-sm">
                  Location Value(s)
                </Label>
                <Input
                  id={`geoLocation-${adSet.id}`}
                  placeholder={geoGuide.placeholder}
                  value={adSet.geoLocation || ""}
                  onChange={(e) => onChange("geoLocation", e.target.value)}
                />
                <p className="text-xs text-slate-500">{geoGuide.helper}</p>
              </div>

              {/* Age Range */}
              <div className="grid gap-2">
                <Label htmlFor={`ageRange-${adSet.id}`} className="font-medium text-sm">
                  Age Range
                </Label>
                <Input
                  id={`ageRange-${adSet.id}`}
                  placeholder="e.g., 18-35 or 25-44"
                  value={adSet.ageRange || ""}
                  onChange={(e) => onChange("ageRange", e.target.value)}
                />
                <p className="text-xs text-slate-500">Minimum and maximum age</p>
              </div>

              {/* Gender */}
              <div className="grid gap-2">
                <Label htmlFor={`gender-${adSet.id}`} className="font-medium text-sm">
                  Gender
                </Label>
                <Select value={adSet.gender || "all"} onValueChange={(value) => onChange("gender", value)}>
                  <SelectTrigger id={`gender-${adSet.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Budget Section - Only shown if Ad Set Level */}
          {budgetLevel === "ad_set" && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-900 mb-4">Budget</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`adSetDailyBudget-${adSet.id}`} className="font-medium text-sm">
                    Daily Budget
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`adSetDailyBudget-${adSet.id}`}
                      type="number"
                      placeholder="0.00"
                      value={adSet.adSetDailyBudget || ""}
                      onChange={(e) => onChange("adSetDailyBudget", e.target.value)}
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-slate-500">USD</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`adSetLifetimeBudget-${adSet.id}`} className="font-medium text-sm">
                    Lifetime Budget
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`adSetLifetimeBudget-${adSet.id}`}
                      type="number"
                      placeholder="0.00"
                      value={adSet.adSetLifetimeBudget || ""}
                      onChange={(e) => onChange("adSetLifetimeBudget", e.target.value)}
                      step="0.01"
                      min="0"
                    />
                    <span className="text-sm text-slate-500">USD</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">* At least one budget type is required</p>
            </div>
          )}

          {/* Bid Strategy - Only shown if Ad Set Level */}
          {budgetLevel === "ad_set" && (
            <div className="border-t pt-4">
              <div className="grid gap-2">
                <Label htmlFor={`adSetBidStrategy-${adSet.id}`} className="font-medium">
                  Ad Set Bid Strategy *
                </Label>
                <Select value={adSet.adSetBidStrategy} onValueChange={(value) => onChange("adSetBidStrategy", value)}>
                  <SelectTrigger id={`adSetBidStrategy-${adSet.id}`}>
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
            </div>
          )}

          {/* Link & Optimization Section */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Destination & Optimization</h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`link-${adSet.id}`} className="font-medium text-sm">
                  Link (Destination URL)
                </Label>
                <Input
                  id={`link-${adSet.id}`}
                  type="url"
                  placeholder="https://example.com"
                  value={adSet.link || ""}
                  onChange={(e) => onChange("link", e.target.value)}
                />
                <p className="text-xs text-slate-500">The URL where users will be directed</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`optimizationGoal-${adSet.id}`} className="font-medium">
                  Optimization Goal *
                </Label>
                <Select value={adSet.optimizationGoal} onValueChange={(value) => onChange("optimizationGoal", value)}>
                  <SelectTrigger id={`optimizationGoal-${adSet.id}`}>
                    <SelectValue placeholder="Select optimization goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {optimizationGoals.map((goal) => (
                      <SelectItem key={goal} value={goal}>
                        {goal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Billing Event — always Impressions */}
              <div className="grid gap-2">
                <Label className="font-medium">Billing Event</Label>
                <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 select-none">
                  IMPRESSIONS
                </div>
                <p className="text-xs text-slate-500">Always set to Impressions.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
