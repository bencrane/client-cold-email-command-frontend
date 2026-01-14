"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, Pause, Mail, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused" | "draft" | "completed";
  smartlead_campaign_id: number | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/campaigns");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch campaigns");
      }

      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      // Success - close form and refresh campaigns
      setNewCampaignName("");
      setIsCreating(false);
      await fetchCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete campaign");
      }

      // Remove from local state
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete campaign");
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const inactiveCampaigns = campaigns.filter((c) => c.status === "paused" || c.status === "draft");

  if (isLoading) {
    return (
      <div className="h-full p-6 lg:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Create and manage your outbound email campaigns
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Create a Campaign Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">Create a Campaign</h2>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          {isCreating ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaignName" className="text-sm font-medium">
                  Campaign Name
                </Label>
                <Input
                  id="campaignName"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="e.g., Q1 Enterprise Outreach"
                  className="mt-1.5"
                  autoFocus
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCampaignName.trim()) {
                      handleCreateCampaign();
                    }
                    if (e.key === "Escape") {
                      setIsCreating(false);
                      setNewCampaignName("");
                      setError(null);
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateCampaign}
                  disabled={!newCampaignName.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Campaign"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsCreating(false);
                    setNewCampaignName("");
                    setError(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          )}
        </div>
      </section>

      {/* Active Campaigns Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium text-foreground">Active Campaigns</h2>
          {activeCampaigns.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCampaigns.length}
            </Badge>
          )}
        </div>

        {activeCampaigns.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Play className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active campaigns</p>
            <p className="text-xs text-muted-foreground mt-1">
              Active campaigns will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDeleteCampaign}
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Inactive Campaigns Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-medium text-foreground">Inactive Campaigns</h2>
          {inactiveCampaigns.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {inactiveCampaigns.length}
            </Badge>
          )}
        </div>

        {inactiveCampaigns.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <Pause className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No inactive campaigns</p>
            <p className="text-xs text-muted-foreground mt-1">
              Paused and draft campaigns will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {inactiveCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDeleteCampaign}
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CampaignCard({
  campaign,
  onDelete,
  onClick,
}: {
  campaign: Campaign;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{campaign.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
              {campaign.smartlead_campaign_id && (
                <span className="text-xs text-muted-foreground">
                  SmartLead #{campaign.smartlead_campaign_id}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === "active" ? (
            <Badge variant="default" className="bg-green-600">
              Active
            </Badge>
          ) : campaign.status === "paused" ? (
            <Badge variant="secondary">Paused</Badge>
          ) : (
            <Badge variant="outline">Draft</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(campaign.id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
