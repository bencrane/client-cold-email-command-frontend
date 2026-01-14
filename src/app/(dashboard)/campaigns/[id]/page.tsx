"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Loader2,
  Mail,
  Trash2,
  Plus,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
  smartlead_campaign_id: number | null;
}

interface Lead {
  campaign_lead_id: string;
  lead_id: string;
  added_at: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  linkedin_url: string;
  latest_title: string | null;
  latest_company: string | null;
  latest_company_domain: string | null;
}

interface LeadList {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
}

export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingLeads, setIsAddingLeads] = useState(false);
  const [isRemovingLeads, setIsRemovingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch campaign");
      setCampaign(data.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch campaign");
    }
  }, [campaignId]);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/leads`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch leads");
      setLeads(data.leads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch leads");
    }
  }, [campaignId]);

  const fetchLeadLists = useCallback(async () => {
    try {
      const response = await fetch("/api/lead-lists");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch lead lists");
      setLeadLists(data.lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lead lists");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaign(), fetchLeads(), fetchLeadLists()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCampaign, fetchLeads, fetchLeadLists]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(leads.map((l) => l.lead_id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(leadId);
      } else {
        next.delete(leadId);
      }
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    if (selectedLeads.size === 0) return;

    setIsRemovingLeads(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: Array.from(selectedLeads) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to remove leads");

      // Refresh leads and clear selection
      await fetchLeads();
      setSelectedLeads(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove leads");
    } finally {
      setIsRemovingLeads(false);
    }
  };

  const handleAddFromList = async () => {
    if (!selectedListId) return;

    setIsAddingLeads(true);
    setError(null);

    try {
      // First, get the leads from the selected list
      const listResponse = await fetch(`/api/lead-lists/${selectedListId}/members`);
      const listData = await listResponse.json();
      
      if (!listResponse.ok) {
        throw new Error(listData.error || "Failed to fetch list members");
      }

      const leadIds = listData.leads?.map((l: { id: string }) => l.id) || [];

      if (leadIds.length === 0) {
        setError("This list has no leads to add");
        setIsAddingLeads(false);
        return;
      }

      // Add leads to campaign
      const response = await fetch(`/api/campaigns/${campaignId}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add leads");

      // Refresh leads
      await fetchLeads();
      setSelectedListId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add leads");
    } finally {
      setIsAddingLeads(false);
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

  const getDisplayName = (lead: Lead) => {
    if (lead.full_name) return lead.full_name;
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ""} ${lead.last_name || ""}`.trim();
    }
    return "Unknown";
  };

  return (
    <div className="h-full p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/campaigns")}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Campaigns
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {campaign.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Add leads to your campaign
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => router.push(`/campaigns/${campaignId}/messages`)}>
          Continue to Messages
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Leads in Campaign Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium text-foreground">Leads in Campaign</h2>
            <Badge variant="secondary">{leads.length} leads</Badge>
          </div>
          {selectedLeads.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveSelected}
              disabled={isRemovingLeads}
              className="text-destructive hover:text-destructive"
            >
              {isRemovingLeads ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove Selected ({selectedLeads.size})
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No leads yet</h3>
              <p className="text-sm text-muted-foreground">
                Add leads from a lead list below
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Header Row */}
              <div className="px-4 py-3 bg-muted/50 flex items-center gap-4">
                <Checkbox
                  checked={selectedLeads.size === leads.length && leads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <div className="flex-1 grid grid-cols-3 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Name</span>
                  <span>Company</span>
                  <span>Title</span>
                </div>
              </div>
              {/* Lead Rows */}
              {leads.map((lead) => (
                <div
                  key={lead.lead_id}
                  className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={selectedLeads.has(lead.lead_id)}
                    onCheckedChange={(checked) =>
                      handleSelectLead(lead.lead_id, checked === true)
                    }
                  />
                  <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
                    <span className="font-medium text-foreground truncate">
                      {getDisplayName(lead)}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {lead.latest_company || "—"}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {lead.latest_title || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Add from Lead List Section */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Add from Lead List</h2>

        <div className="rounded-lg border border-border bg-card p-6">
          {leadLists.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">No lead lists</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a lead list first to add leads to campaigns
              </p>
              <Button variant="outline" onClick={() => router.push("/lead-lists")}>
                Go to Lead Lists
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Select a lead list to add all its leads to this campaign
              </p>
              <div className="space-y-2 mb-4">
                {leadLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListId(list.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      selectedListId === list.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground">
                          {list.name}
                        </span>
                        {list.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {list.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {list.member_count} lead{list.member_count !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleAddFromList}
                disabled={!selectedListId || isAddingLeads}
                className="w-full sm:w-auto"
              >
                {isAddingLeads ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Leads...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Campaign
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
