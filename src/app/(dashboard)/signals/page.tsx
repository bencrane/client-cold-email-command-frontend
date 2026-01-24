"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Loader2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Signal {
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

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typeFilter, setTypeFilter] = useState<SignalType>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchSignals = useCallback(async (reset = false) => {
    const offset = reset ? 0 : signals.length;
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("offset", offset.toString());
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (unreadOnly) params.set("unread_only", "true");

    try {
      if (reset) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await fetch(`/api/signals?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        const newSignals = Array.isArray(data) ? data : [];
        if (reset) {
          setSignals(newSignals);
        } else {
          setSignals((prev) => [...prev, ...newSignals]);
        }
        setHasMore(newSignals.length === 20);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [signals.length, typeFilter, unreadOnly]);

  // Initial load and filter changes
  useEffect(() => {
    fetchSignals(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, unreadOnly]);

  // Infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          fetchSignals(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading, fetchSignals]);

  const markAsRead = async (signalId: string) => {
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
      setSignals((prev) =>
        prev.map((s) => (s.id === signalId ? { ...s, is_read: false } : s))
      );
    }
  };

  const markAllAsRead = async () => {
    setSignals((prev) => prev.map((s) => ({ ...s, is_read: true })));

    try {
      await fetch("/api/signals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
    } catch {
      fetchSignals(true);
    }
  };

  const handleCardClick = (signal: Signal) => {
    if (!signal.is_read) {
      markAsRead(signal.id);
    }
    if (expandedId === signal.id) {
      setExpandedId(null);
    } else {
      setExpandedId(signal.id);
    }
  };

  const unreadCount = signals.filter((s) => !s.is_read).length;

  return (
    <div className="h-full p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Signals Feed</h1>
            <p className="text-sm text-muted-foreground">
              Real-time insights about your leads and target accounts
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as SignalType)}>
            <SelectTrigger className="w-[160px]">
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
            Unread only {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-1" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Signals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : signals.length === 0 ? (
        <div className="text-center py-20">
          <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            No signals yet — we&apos;ll surface relevant insights about your leads here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {signals.map((signal) => {
            const config = SIGNAL_CONFIG[signal.signal_type] || {
              icon: Newspaper,
              label: signal.signal_type,
              color: "text-gray-400",
              bgColor: "bg-gray-500/10",
            };
            const Icon = config.icon;
            const isExpanded = expandedId === signal.id;

            return (
              <div
                key={signal.id}
                className={`rounded-lg border transition-all ${
                  signal.is_read
                    ? "bg-card/30 border-border/50"
                    : "bg-card border-border"
                }`}
              >
                <button
                  onClick={() => handleCardClick(signal)}
                  className="w-full text-left p-4"
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-2.5 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {!signal.is_read && (
                            <Circle className="w-2 h-2 fill-primary text-primary flex-shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              signal.is_read
                                ? "text-muted-foreground"
                                : "font-semibold text-foreground"
                            }`}
                          >
                            {signal.company_name || signal.company_domain || "Unknown"}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatRelativeTime(signal.created_at)}
                        </span>
                      </div>

                      <p
                        className={`text-sm mb-2 ${
                          signal.is_read ? "text-muted-foreground" : "text-foreground"
                        } ${isExpanded ? "" : "line-clamp-2"}`}
                      >
                        {signal.headline}
                      </p>

                      {signal.relevance_note && (
                        <p className="text-xs text-primary/80 mb-2">
                          {signal.relevance_note}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {signal.source_name && <span>{signal.source_name}</span>}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 mt-0">
                    <div className="pt-4 pl-14">
                      {signal.summary && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {signal.summary}
                        </p>
                      )}
                      {signal.source_url && (
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View source
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load More Trigger */}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isLoadingMore && (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            )}
            {!hasMore && signals.length > 0 && (
              <p className="text-xs text-muted-foreground">No more signals</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
