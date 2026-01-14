"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Settings,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  name: string;
  status: string;
  settings: CampaignSettings;
}

interface CampaignSettings {
  max_emails_per_day?: number;
  max_new_leads_per_day?: number;
  schedule?: {
    days?: number[];
    start_hour?: string;
    end_hour?: string;
    timezone?: string;
  };
  plain_text?: boolean;
  open_tracking?: boolean;
  unsubscribe_link?: boolean;
}

interface EmailAccount {
  id: string;
  email: string;
  sender_name: string;
  daily_limit: number;
  status: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const DEFAULT_SETTINGS: CampaignSettings = {
  max_emails_per_day: 1000,
  max_new_leads_per_day: 1000,
  schedule: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    start_hour: "09:00",
    end_hour: "17:00",
    timezone: "America/New_York",
  },
  plain_text: false,
  open_tracking: false,
  unsubscribe_link: true,
};

function CampaignOverview({
  leadsCount,
  emailAccounts,
}: {
  leadsCount: number;
  emailAccounts: EmailAccount[];
}) {
  const activeAccounts = emailAccounts.filter((a) => a.status === "active");
  const dailyCapacity = activeAccounts.reduce((sum, a) => sum + (a.daily_limit || 0), 0);
  const daysToContact = dailyCapacity > 0 ? Math.ceil(leadsCount / dailyCapacity) : 0;

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-medium text-foreground mb-3">Campaign Overview</h2>
      <div className="space-y-1.5 text-sm">
        <p className="text-muted-foreground">
          <span className="text-foreground font-medium">{leadsCount.toLocaleString()}</span> leads in campaign{" "}
          <span className="text-muted-foreground/60">·</span>{" "}
          <span className="text-foreground font-medium">{emailAccounts.length}</span> email accounts{" "}
          <span className="text-muted-foreground/80">({activeAccounts.length} active)</span>
        </p>
        <p className="text-muted-foreground">
          Daily capacity:{" "}
          <span className="text-foreground font-medium">~{dailyCapacity.toLocaleString()}</span> emails/day
        </p>
        <p className="text-muted-foreground">
          Estimated time to contact all leads:{" "}
          <span className="text-foreground font-medium">
            ~{daysToContact} {daysToContact === 1 ? "day" : "days"}
          </span>
        </p>
      </div>
    </section>
  );
}

export default function CampaignSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [settings, setSettings] = useState<CampaignSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<CampaignSettings>(DEFAULT_SETTINGS);
  const [leadsCount, setLeadsCount] = useState(0);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch campaign");
      setCampaign(data.campaign);
      
      // Merge saved settings with defaults
      const merged = {
        ...DEFAULT_SETTINGS,
        ...data.campaign.settings,
        schedule: {
          ...DEFAULT_SETTINGS.schedule,
          ...data.campaign.settings?.schedule,
        },
      };
      setSettings(merged);
      setSavedSettings(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch campaign");
    }
  }, [campaignId]);

  const fetchLeadsCount = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/leads`);
      const data = await response.json();
      if (response.ok) {
        setLeadsCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // Non-critical, silently fail
    }
  }, [campaignId]);

  const fetchEmailAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/email-accounts");
      const data = await response.json();
      if (response.ok) {
        setEmailAccounts(Array.isArray(data) ? data : []);
      }
    } catch {
      // Non-critical, silently fail
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaign(), fetchLeadsCount(), fetchEmailAccounts()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCampaign, fetchLeadsCount, fetchEmailAccounts]);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSettings = (updates: Partial<CampaignSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const updateSchedule = (updates: Partial<CampaignSettings["schedule"]>) => {
    setSettings((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, ...updates },
    }));
  };

  const toggleDay = (day: number) => {
    const currentDays = settings.schedule?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    updateSchedule({ days: newDays });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save settings");

      setSavedSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 lg:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-full p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Campaign not found</p>
          <Button
            variant="ghost"
            onClick={() => router.push("/campaigns")}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaignId}/messages`)}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Messages
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {campaign.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure campaign settings
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => router.push(`/campaigns/${campaignId}/review`)}>
          Continue to Review
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8 max-w-2xl">
        {/* Campaign Overview */}
        <CampaignOverview leadsCount={leadsCount} emailAccounts={emailAccounts} />

        {/* Limits Section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Limits</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="maxEmails" className="text-sm font-medium">
                Max Emails/Day
              </Label>
              <Input
                id="maxEmails"
                type="number"
                min={1}
                value={settings.max_emails_per_day || ""}
                onChange={(e) =>
                  updateSettings({ max_emails_per_day: parseInt(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="maxLeads" className="text-sm font-medium">
                Max New Leads/Day
              </Label>
              <Input
                id="maxLeads"
                type="number"
                min={1}
                value={settings.max_new_leads_per_day || ""}
                onChange={(e) =>
                  updateSettings({ max_new_leads_per_day: parseInt(e.target.value) || 0 })
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </section>

        {/* Sending Schedule Section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Sending Schedule</h2>
          
          {/* Active Days */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block">Active Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isActive = settings.schedule?.days?.includes(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div>
              <Label htmlFor="startTime" className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={settings.schedule?.start_hour || "09:00"}
                onChange={(e) => updateSchedule({ start_hour: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="endTime" className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={settings.schedule?.end_hour || "17:00"}
                onChange={(e) => updateSchedule({ end_hour: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <Label className="text-sm font-medium">Timezone</Label>
            <Select
              value={settings.schedule?.timezone || "America/New_York"}
              onValueChange={(value) => updateSchedule({ timezone: value })}
            >
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Options Section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-medium text-foreground mb-4">Options</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="plainText"
                checked={settings.plain_text || false}
                onCheckedChange={(checked) =>
                  updateSettings({ plain_text: checked === true })
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="plainText" className="text-sm font-medium cursor-pointer">
                  Plain Text Emails
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Send emails without HTML formatting
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="openTracking"
                checked={settings.open_tracking || false}
                onCheckedChange={(checked) =>
                  updateSettings({ open_tracking: checked === true })
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="openTracking" className="text-sm font-medium cursor-pointer">
                  Open Tracking
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track when recipients open emails
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="unsubscribeLink"
                checked={settings.unsubscribe_link !== false}
                onCheckedChange={(checked) =>
                  updateSettings({ unsubscribe_link: checked === true })
                }
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="unsubscribeLink" className="text-sm font-medium cursor-pointer">
                  Unsubscribe Link
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow recipients to unsubscribe
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
