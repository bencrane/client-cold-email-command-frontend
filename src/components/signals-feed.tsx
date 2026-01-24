"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Rocket,
  Briefcase,
  DoorOpen,
  Newspaper,
  Target,
  TrendingUp,
  Users,
  Circle,
  ExternalLink,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Signal {
  id: string;
  org_id: string;
  signal_type: string;
  company_domain: string | null;
  company_name: string | null;
  headline: string;
  summary: string | null;
  source_url: string | null;
  source_name: string | null;
  relevance_note: string | null;
  related_lead_ids: string[] | null;
  signal_data: Record<string, unknown> | null;
  is_read: boolean;
  is_actionable: boolean;
  created_at: string;
}

type SignalType = "all" | "funding" | "leadership" | "departure" | "news" | "web_intent" | "job_posting" | "growth";

const SIGNAL_CONFIG: Record<string, { icon: typeof Rocket; label: string; color: string; bgColor: string }> = {
  funding: { icon: Rocket, label: "Funding", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  leadership: { icon: Briefcase, label: "Leadership", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  departure: { icon: DoorOpen, label: "Departure", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  news: { icon: Newspaper, label: "News", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  web_intent: { icon: Target, label: "Web Intent", color: "text-rose-400", bgColor: "bg-rose-500/10" },
  job_posting: { icon: Users, label: "Job Posting", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  growth: { icon: TrendingUp, label: "Growth", color: "text-green-400", bgColor: "bg-green-500/10" },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface SignalCardProps {
  signal: Signal;
  onMarkRead: (id: string) => void;
  compact?: boolean;
}

function SignalCard({ signal, onMarkRead, compact = false }: SignalCardProps) {
  const config = SIGNAL_CONFIG[signal.signal_type] || {
    icon: Newspaper,
    label: signal.signal_type,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
  };
  const Icon = config.icon;

  const handleClick = () => {
    if (!signal.is_read) {
      onMarkRead(signal.id);
    }
    if (signal.source_url) {
      window.open(signal.source_url, "_blank");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        signal.is_read
          ? "bg-card/30 border-border/50 hover:border-border"
          : "bg-card border-border hover:border-primary/30"
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              {!signal.is_read && (
                <Circle className="w-2 h-2 fill-primary text-primary flex-shrink-0" />
              )}
              <span
                className={`text-sm truncate ${
                  signal.is_read ? "text-muted-foreground" : "font-semibold text-foreground"
                }`}
              >
                {signal.company_name || signal.company_domain || "Unknown"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(signal.created_at)}
            </span>
          </div>

          <p
            className={`text-sm mb-1 ${
              signal.is_read ? "text-muted-foreground" : "text-foreground"
            } ${compact ? "line-clamp-1" : "line-clamp-2"}`}
          >
            {signal.headline}
          </p>

          {signal.summary && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {signal.summary}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {signal.relevance_note && (
              <>
                <span className="text-primary/80">{signal.relevance_note}</span>
                <span>·</span>
              </>
            )}
            {signal.source_name && <span>{signal.source_name}</span>}
            {signal.source_url && (
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface SignalsFeedProps {
  limit?: number;
  showFilters?: boolean;
  showViewAll?: boolean;
  compact?: boolean;
}

export function SignalsFeed({
  limit = 10,
  showFilters = true,
  showViewAll = true,
  compact = false,
}: SignalsFeedProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<SignalType>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchSignals = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (unreadOnly) params.set("unread_only", "true");

    try {
      const response = await fetch(`/api/signals?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setSignals(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [limit, typeFilter, unreadOnly]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const markAsRead = async (signalId: string) => {
    // Optimistic update
    setSignals((prev) =>
      prev.map((s) => (s.id === signalId ? { ...s, is_read: true } : s))
    );

    try {
      await fetch("/api/signals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_ids: [signalId] }),
      });
    } catch {
      // Revert on error
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, is_read: false } : s))
      );
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setSignals((prev) => prev.map((s) => ({ ...s, is_read: true })));

    try {
      await fetch("/api/signals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
    } catch {
      // Refetch on error
      fetchSignals();
    }
  };

  const unreadCount = signals.filter((s) => !s.is_read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {showFilters && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SignalType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="funding">🚀 Funding</SelectItem>
                <SelectItem value="leadership">👔 Leadership</SelectItem>
                <SelectItem value="departure">🚪 Departure</SelectItem>
                <SelectItem value="news">📰 News</SelectItem>
                <SelectItem value="web_intent">🎯 Web Intent</SelectItem>
                <SelectItem value="job_posting">💼 Job Posting</SelectItem>
                <SelectItem value="growth">📈 Growth</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                unreadOnly
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread only
            </button>
          </div>

          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      )}

      {/* Signals List */}
      {signals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">
            No signals yet — we&apos;ll surface relevant insights about your leads here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onMarkRead={markAsRead}
              compact={compact}
            />
          ))}
        </div>
      )}

      {/* View All Link */}
      {showViewAll && signals.length > 0 && (
        <div className="pt-2">
          <Link
            href="/signals"
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all signals
            <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
          </Link>
        </div>
      )}
    </div>
  );
}
