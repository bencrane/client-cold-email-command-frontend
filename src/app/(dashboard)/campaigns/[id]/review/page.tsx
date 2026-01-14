"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Rocket,
  Calendar,
  Users,
  Mail,
  Settings,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  name: string;
  status: string;
  settings: {
    max_emails_per_day?: number;
    max_new_leads_per_day?: number;
    start_date?: string;
    schedule?: {
      days?: number[];
      start_hour?: string;
      end_hour?: string;
      timezone?: string;
    };
  };
}

interface Sequence {
  id: string;
  seq_number: number;
  subject: string;
  delay_days: number;
}

interface EmailAccount {
  id: string;
  email: string;
  daily_limit: number;
  status: string;
}

const DAY_NAMES: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

const TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern",
  "America/Chicago": "Central",
  "America/Denver": "Mountain",
  "America/Los_Angeles": "Pacific",
  "America/Anchorage": "Alaska",
  "Pacific/Honolulu": "Hawaii",
  "Europe/London": "GMT",
  "Europe/Paris": "CET",
  "Asia/Tokyo": "JST",
  "Asia/Shanghai": "CST",
  "Australia/Sydney": "AEST",
};

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function formatDays(days: number[]): string {
  if (!days || days.length === 0) return "No days selected";
  if (days.length === 7) return "Every day";
  if (JSON.stringify(days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) return "Mon-Fri";
  if (JSON.stringify(days.sort()) === JSON.stringify([0, 6])) return "Weekends";
  return days.map((d) => DAY_NAMES[d]).join(", ");
}

export default function CampaignReviewPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [launchType, setLaunchType] = useState<"now" | "scheduled">("scheduled");
  const [isLaunching, setIsLaunching] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [campaignRes, leadsRes, sequencesRes, accountsRes] = await Promise.all([
        fetch(`/api/campaigns/${campaignId}`),
        fetch(`/api/campaigns/${campaignId}/leads`),
        fetch(`/api/campaigns/${campaignId}/sequences`),
        fetch("/api/email-accounts"),
      ]);

      const campaignData = await campaignRes.json();
      const leadsData = await leadsRes.json();
      const sequencesData = await sequencesRes.json();
      const accountsData = await accountsRes.json();

      if (!campaignRes.ok) throw new Error(campaignData.error || "Failed to fetch campaign");

      setCampaign(campaignData.campaign);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
      setSequences(Array.isArray(sequencesData) ? sequencesData : []);
      setEmailAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign data");
    }
  }, [campaignId]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };
    load();
  }, [fetchData]);

  const activeAccounts = emailAccounts.filter((a) => a.status === "active");
  const dailyCapacity = activeAccounts.reduce((sum, a) => sum + (a.daily_limit || 0), 0);
  const daysToComplete = dailyCapacity > 0 ? Math.ceil(leads.length / dailyCapacity) : 0;

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);

    try {
      // Update campaign status to active
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "active",
          settings: {
            ...campaign?.settings,
            launched_at: new Date().toISOString(),
            launch_type: launchType,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to launch campaign");
      }

      // TODO: Push to Smartlead here
      // await pushToSmartlead(campaignId);

      setShowLaunchModal(false);
      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to launch campaign");
    } finally {
      setIsLaunching(false);
    }
  };

  const openLaunchModal = (type: "now" | "scheduled") => {
    setLaunchType(type);
    setShowLaunchModal(true);
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

  const schedule = campaign.settings?.schedule;
  const startDate = campaign.settings?.start_date
    ? new Date(campaign.settings.start_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

  return (
    <div className="h-full p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/campaigns/${campaignId}/settings`)}
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Settings
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Review & Launch</h1>
            <p className="text-sm text-muted-foreground">
              Review your campaign before launching
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Campaign Info */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Campaign</p>
              <p className="text-lg font-semibold text-foreground">{campaign.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 capitalize">
                {campaign.status}
              </span>
            </div>
          </div>
        </section>

        {/* Leads */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">Leads</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            <span className="text-foreground font-medium">{leads.length.toLocaleString()}</span> leads in campaign
          </p>
          <Link
            href={`/campaigns/${campaignId}`}
            className="text-sm text-primary hover:underline"
          >
            Edit Leads →
          </Link>
        </section>

        {/* Messages */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">Messages</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            <span className="text-foreground font-medium">{sequences.length}</span> steps in sequence
          </p>
          {sequences.length > 0 && (
            <div className="space-y-2 mb-3">
              {sequences.slice(0, 5).map((seq) => (
                <div key={seq.id} className="text-sm text-muted-foreground">
                  <span className="text-foreground">Step {seq.seq_number}:</span>{" "}
                  "{seq.subject?.slice(0, 40) || "No subject"}{seq.subject?.length > 40 ? "..." : ""}" —{" "}
                  {seq.seq_number === 1
                    ? "sends immediately"
                    : `sends after ${seq.delay_days} day${seq.delay_days !== 1 ? "s" : ""}`}
                </div>
              ))}
              {sequences.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{sequences.length - 5} more steps
                </p>
              )}
            </div>
          )}
          <Link
            href={`/campaigns/${campaignId}/messages`}
            className="text-sm text-primary hover:underline"
          >
            Edit Messages →
          </Link>
        </section>

        {/* Settings */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">Settings</h2>
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
            <p>
              <span className="text-foreground">Start Date:</span> {startDate}
            </p>
            <p>
              <span className="text-foreground">Schedule:</span>{" "}
              {formatDays(schedule?.days || [])}, {formatTime(schedule?.start_hour || "09:00")} -{" "}
              {formatTime(schedule?.end_hour || "17:00")} (
              {TIMEZONE_LABELS[schedule?.timezone || "America/New_York"] || schedule?.timezone})
            </p>
            <p>
              <span className="text-foreground">Max Emails/Day:</span>{" "}
              {(campaign.settings?.max_emails_per_day || 1000).toLocaleString()}
            </p>
          </div>
          <Link
            href={`/campaigns/${campaignId}/settings`}
            className="text-sm text-primary hover:underline"
          >
            Edit Settings →
          </Link>
        </section>

        {/* Email Accounts */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-foreground">Email Accounts</h2>
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">{emailAccounts.length}</span> accounts (
              {activeAccounts.length} active) ·{" "}
              <span className="text-foreground font-medium">~{dailyCapacity.toLocaleString()}</span> emails/day
              capacity
            </p>
            <p>
              Estimated completion:{" "}
              <span className="text-foreground font-medium">
                ~{daysToComplete} {daysToComplete === 1 ? "day" : "days"}
              </span>
            </p>
          </div>
        </section>

        {/* Launch Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => openLaunchModal("now")}
            className="flex-1"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Launch Now
          </Button>
          <Button onClick={() => openLaunchModal("scheduled")} className="flex-1">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Campaign
          </Button>
        </div>
      </div>

      {/* Launch Confirmation Modal */}
      <Dialog open={showLaunchModal} onOpenChange={setShowLaunchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              {launchType === "now" ? "Launch Campaign Now?" : "Schedule Campaign?"}
            </DialogTitle>
            <DialogDescription>
              {launchType === "now"
                ? `This will immediately start sending emails to ${leads.length.toLocaleString()} leads. Emails will begin going out within minutes.`
                : `This will schedule your campaign to start on ${startDate}. Emails will be sent to ${leads.length.toLocaleString()} leads according to your configured schedule.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowLaunchModal(false)}
              disabled={isLaunching}
            >
              Cancel
            </Button>
            <Button onClick={handleLaunch} disabled={isLaunching}>
              {isLaunching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {launchType === "now" ? "Launching..." : "Scheduling..."}
                </>
              ) : (
                <>
                  {launchType === "now" ? "Yes, Launch Now" : "Yes, Schedule Campaign"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
