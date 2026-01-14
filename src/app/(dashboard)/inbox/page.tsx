"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Inbox,
  Send,
  AlertTriangle,
  Mail,
  Star,
  ThumbsDown,
  Clock,
  Loader2,
  Circle,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  thread_id: string | null;
  lead_email: string;
  lead_name: string | null;
  subject: string;
  body: string;
  direction: "inbound" | "outbound";
  status: "read" | "unread";
  category: string | null;
  received_at: string;
  smartlead_campaign_id: number | null;
}

interface Campaign {
  id: string;
  name: string;
  smartlead_campaign_id: number | null;
}

interface EmailAccount {
  id: string;
  email: string;
  sender_name: string;
}

type Folder = "inbox" | "sent" | "bounced" | "all";
type StatusFilter = "interested" | "not_interested" | "out_of_office" | null;
type ReadState = "unread" | "read" | null;

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyText, setReplyText] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<Folder>("inbox");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [readState, setReadState] = useState<ReadState>(null);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const fetchMessages = useCallback(async () => {
    const params = new URLSearchParams();

    // Folder filter
    if (folder === "inbox") params.set("direction", "inbound");
    else if (folder === "sent") params.set("direction", "outbound");
    else if (folder === "bounced") params.set("category", "bounced");

    // Status filter
    if (statusFilter) params.set("category", statusFilter);

    // Read state
    if (readState) params.set("status", readState);

    // Campaign filter
    if (campaignFilter && campaignFilter !== "all") {
      const campaign = campaigns.find((c) => c.id === campaignFilter);
      if (campaign?.smartlead_campaign_id) {
        params.set("campaign_id", campaign.smartlead_campaign_id.toString());
      }
    }

    // Search
    if (search.trim()) params.set("search", search.trim());

    try {
      const response = await fetch(`/api/inbox?${params.toString()}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
    }
  }, [folder, statusFilter, readState, campaignFilter, search, campaigns]);

  const fetchThreadMessages = useCallback(async (threadId: string | null, messageId: string) => {
    if (!threadId) {
      // No thread, just show the single message
      const msg = messages.find((m) => m.id === messageId);
      setThreadMessages(msg ? [msg] : []);
      return;
    }

    try {
      const response = await fetch(`/api/inbox?thread_id=${threadId}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        // Sort by date ascending (oldest first)
        const sorted = data.sort(
          (a: Message, b: Message) =>
            new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
        );
        setThreadMessages(sorted);
      }
    } catch {
      // Fall back to single message
      const msg = messages.find((m) => m.id === messageId);
      setThreadMessages(msg ? [msg] : []);
    }
  }, [messages]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch("/api/campaigns");
      const data = await response.json();
      if (response.ok) {
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchEmailAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/email-accounts");
      const data = await response.json();
      if (response.ok) {
        setEmailAccounts(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaigns(), fetchEmailAccounts()]);
      setIsLoading(false);
    };
    load();
  }, [fetchCampaigns, fetchEmailAccounts]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const updateMessage = async (
    messageId: string,
    updates: { status?: string; category?: string }
  ) => {
    try {
      const response = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: [messageId], ...updates }),
      });

      if (response.ok) {
        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updates } as Message : m))
        );
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, ...updates } as Message : m))
        );
        if (selectedMessage?.id === messageId) {
          setSelectedMessage((prev) => (prev ? { ...prev, ...updates } as Message : null));
        }
      }
    } catch {
      // Silently fail
    }
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowReplyComposer(false);
    setReplyText("");
    // Fetch thread messages
    fetchThreadMessages(message.thread_id, message.id);
    // Auto mark as read
    if (message.status === "unread") {
      updateMessage(message.id, { status: "read" });
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedMessage) return;

    // Log to console for now — will wire up to Smartlead later
    console.log("Sending reply:", {
      to: selectedMessage.lead_email,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText,
      thread_id: selectedMessage.thread_id,
      campaign_id: selectedMessage.smartlead_campaign_id,
    });

    // Reset composer
    setReplyText("");
    setShowReplyComposer(false);
  };

  const folderItems = [
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "sent", label: "Sent", icon: Send },
    { id: "bounced", label: "Bounced", icon: AlertTriangle },
    { id: "all", label: "All", icon: Mail },
  ];

  const statusItems = [
    { id: "interested", label: "Interested", icon: Star },
    { id: "not_interested", label: "Not Interested", icon: ThumbsDown },
    { id: "out_of_office", label: "Out of Office", icon: Clock },
  ];

  const categoryLabels: Record<string, string> = {
    interested: "Interested",
    not_interested: "Not Interested",
    out_of_office: "Out of Office",
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Filters */}
      <div className="w-64 border-r border-border bg-card/50 p-4 flex flex-col gap-6 overflow-y-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Folder */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Folder
          </p>
          <div className="space-y-1">
            {folderItems.map((item) => {
              const Icon = item.icon;
              const isActive = folder === item.id && !statusFilter;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setFolder(item.id as Folder);
                    setStatusFilter(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Status
          </p>
          <div className="space-y-1">
            {statusItems.map((item) => {
              const Icon = item.icon;
              const isActive = statusFilter === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setStatusFilter(isActive ? null : (item.id as StatusFilter));
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Read State */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Read State
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setReadState(readState === "unread" ? null : "unread")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                readState === "unread"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setReadState(readState === "read" ? null : "read")}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                readState === "read"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Campaign Filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Campaign
          </p>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sender Account Filter */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Sender Account
          </p>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {emailAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.sender_name || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Middle Column - Message List */}
      <div className="w-96 border-r border-border overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">
              No messages yet — replies will appear here when leads respond to your campaigns.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((message) => {
              const isSelected = selectedMessage?.id === message.id;
              const isUnread = message.status === "unread";
              return (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    <div className="pt-1.5">
                      {isUnread ? (
                        <Circle className="w-2 h-2 fill-primary text-primary" />
                      ) : (
                        <div className="w-2 h-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`text-sm truncate ${
                            isUnread ? "font-bold text-foreground" : "text-foreground"
                          }`}
                        >
                          {message.lead_name || message.lead_email}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatRelativeTime(message.received_at)}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate mb-1 ${
                          isUnread ? "font-semibold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {message.subject || "(No subject)"}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isUnread ? "text-muted-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {message.body?.slice(0, 100) || ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column - Message Detail */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!selectedMessage ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Select a message to view</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header with actions */}
            <div className="p-4 border-b border-border flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {selectedMessage.lead_name || selectedMessage.lead_email}
                </h2>
                <p className="text-sm text-muted-foreground truncate">
                  {selectedMessage.lead_email}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() =>
                    updateMessage(selectedMessage.id, {
                      status: selectedMessage.status === "read" ? "unread" : "read",
                    })
                  }
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selectedMessage.status === "read" ? "Mark unread" : "Mark read"}
                </button>
                <span className="text-muted-foreground/30">·</span>
                <Select
                  value={selectedMessage.category || "none"}
                  onValueChange={(value) =>
                    updateMessage(selectedMessage.id, {
                      category: value === "none" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="h-auto py-0 px-0 border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground w-auto gap-1">
                    <SelectValue>
                      {selectedMessage.category
                        ? categoryLabels[selectedMessage.category] || selectedMessage.category
                        : "Categorize"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="out_of_office">Out of Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Thread / Conversation */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-base font-medium text-foreground mb-4">
                {selectedMessage.subject || "(No subject)"}
              </h3>

              <div className="space-y-4">
                {threadMessages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-4 ${
                          isOutbound
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted/50 border border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-foreground">
                            {isOutbound ? "You" : msg.lead_name || msg.lead_email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(msg.received_at)}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm text-foreground/90">
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reply Composer */}
            {showReplyComposer ? (
              <div className="p-4 border-t border-border bg-card/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Reply</span>
                  <button
                    onClick={() => {
                      setShowReplyComposer(false);
                      setReplyText("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                />
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowReplyComposer(true)}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Reply
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
