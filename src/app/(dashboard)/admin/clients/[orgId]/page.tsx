"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Building2,
  Mail,
  Users,
  BarChart3,
  Target,
  Link2,
  Loader2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
}

interface Counts {
  users: number;
  emailAccounts: number;
  campaigns: number;
  leads: number;
  unconnectedEmailAccounts: number;
}

interface EmailAccount {
  id: string;
  email: string;
  sender_name: string | null;
  status: string;
  daily_limit: number;
  smartlead_account_id: string | null;
  created_at: string;
}

interface ScaledMailInbox {
  id: string;
  domain: string;
  warmup_age: number;
  emailMailboxCount: number;
  pricing: {
    oneTimePrice: number;
    monthlyPrice: number;
  };
  emailMailbox?: {
    first_name: string;
    last_name: string;
    alias: string;
  }[];
}

interface PreWarmInboxes {
  total: number;
  google: ScaledMailInbox[];
  outlook: ScaledMailInbox[];
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Provisioning modal state
  const [provisioningOpen, setProvisioningOpen] = useState(false);
  const [preWarmInboxes, setPreWarmInboxes] = useState<PreWarmInboxes | null>(
    null
  );
  const [inboxesLoading, setInboxesLoading] = useState(false);
  const [inboxesError, setInboxesError] = useState<string | null>(null);
  const [selectedInboxes, setSelectedInboxes] = useState<Set<string>>(
    new Set()
  );
  const [purchasing, setPurchasing] = useState(false);

  // Smartlead modal state
  const [smartleadOpen, setSmartleadOpen] = useState(false);

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientRes, accountsRes] = await Promise.all([
        fetch(`/api/admin/clients/${orgId}`),
        fetch(`/api/admin/clients/${orgId}/email-accounts`),
      ]);

      if (!clientRes.ok) {
        throw new Error("Failed to fetch client details");
      }

      const clientData = await clientRes.json();
      setOrganization(clientData.organization);
      setCounts(clientData.counts);

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setEmailAccounts(accountsData.emailAccounts || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      fetchClientData();
    }
  }, [orgId, fetchClientData]);

  const fetchPreWarmInboxes = async () => {
    setInboxesLoading(true);
    setInboxesError(null);
    try {
      const response = await fetch("/api/admin/scaledmail/pre-warm-inboxes");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch inboxes");
      }
      const data = await response.json();
      setPreWarmInboxes(data);
    } catch (err) {
      setInboxesError(
        err instanceof Error ? err.message : "Failed to load inboxes"
      );
    } finally {
      setInboxesLoading(false);
    }
  };

  const handleOpenProvisioning = () => {
    setProvisioningOpen(true);
    setSelectedInboxes(new Set());
    fetchPreWarmInboxes();
  };

  const toggleInboxSelection = (inboxId: string) => {
    const newSelection = new Set(selectedInboxes);
    if (newSelection.has(inboxId)) {
      newSelection.delete(inboxId);
    } else {
      newSelection.add(inboxId);
    }
    setSelectedInboxes(newSelection);
  };

  const handlePurchase = async () => {
    if (selectedInboxes.size === 0) return;

    setPurchasing(true);
    try {
      const allInboxes = [
        ...(preWarmInboxes?.google || []),
        ...(preWarmInboxes?.outlook || []),
      ];

      const domains = allInboxes
        .filter((inbox) => selectedInboxes.has(inbox.id))
        .map((inbox) => ({
          id: inbox.id,
          domain: inbox.domain,
        }));

      const response = await fetch("/api/admin/scaledmail/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domains,
          orgId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Purchase failed");
      }

      setProvisioningOpen(false);
      setSelectedInboxes(new Set());
      // Refresh the data
      fetchClientData();
    } catch (err) {
      setInboxesError(
        err instanceof Error ? err.message : "Purchase failed"
      );
    } finally {
      setPurchasing(false);
    }
  };

  const renderInboxList = (inboxes: ScaledMailInbox[], type: string) => {
    if (!inboxes || inboxes.length === 0) {
      return (
        <p className="text-gray-500 text-sm py-2">No {type} inboxes available</p>
      );
    }

    return (
      <div className="space-y-2">
        {inboxes.map((inbox) => (
          <div
            key={inbox.id}
            onClick={() => toggleInboxSelection(inbox.id)}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedInboxes.has(inbox.id)
                ? "border-blue-500 bg-blue-500/10"
                : "border-[#2a2a2a] hover:border-[#3a3a3a]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center ${
                selectedInboxes.has(inbox.id)
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-600"
              }`}
            >
              {selectedInboxes.has(inbox.id) && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{inbox.domain}</p>
              <p className="text-sm text-gray-500">
                {inbox.warmup_age} month{inbox.warmup_age !== 1 ? "s" : ""} warm
                • {inbox.emailMailboxCount} mailbox
                {inbox.emailMailboxCount !== 1 ? "es" : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white">${inbox.pricing.oneTimePrice}</p>
              <p className="text-xs text-gray-500">
                + ${inbox.pricing.monthlyPrice}/mo
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        {error || "Organization not found"}
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span
            className="hover:text-gray-300 cursor-pointer"
            onClick={() => router.push("/admin")}
          >
            Admin
          </span>
          <span>/</span>
          <span
            className="hover:text-gray-300 cursor-pointer"
            onClick={() => router.push("/admin/clients")}
          >
            Clients
          </span>
          <span>/</span>
          <span className="text-white">{organization.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{organization.name}</h1>
        {organization.domain && (
          <p className="text-gray-400 mt-1">{organization.domain}</p>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Overview */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Overview</h2>
          </div>

          <div className="space-y-3">
            {organization.industry && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Industry</span>
                <span className="text-white">{organization.industry}</span>
              </div>
            )}
            {organization.company_size && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Size</span>
                <span className="text-white">{organization.company_size}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Created</span>
              <span className="text-white">
                {new Date(organization.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                  <Users className="w-3 h-3" />
                  <span>Users</span>
                </div>
                <p className="text-xl font-semibold text-white">
                  {counts?.users || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                  <Mail className="w-3 h-3" />
                  <span>Emails</span>
                </div>
                <p className="text-xl font-semibold text-white">
                  {counts?.emailAccounts || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Campaigns</span>
                </div>
                <p className="text-xl font-semibold text-white">
                  {counts?.campaigns || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
                  <Target className="w-3 h-3" />
                  <span>Leads</span>
                </div>
                <p className="text-xl font-semibold text-white">
                  {counts?.leads || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Email Account Provisioning */}
        <div
          onClick={handleOpenProvisioning}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-[#2a2a2a] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Email Provisioning
            </h2>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Purchase new email inboxes from ScaledMail
          </p>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-green-400 border-green-400/30">
              Click to provision
            </Badge>
          </div>
        </div>

        {/* Card 3: Smartlead Inbox Configuration */}
        <div
          onClick={() => setSmartleadOpen(true)}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-[#2a2a2a] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Link2 className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Smartlead Config
            </h2>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Connect purchased inboxes to Smartlead
          </p>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-orange-400 border-orange-400/30">
              {counts?.unconnectedEmailAccounts || 0} unconnected
            </Badge>
          </div>
        </div>
      </div>

      {/* Email Accounts Table */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
        <div className="p-4 border-b border-[#1a1a1a]">
          <h2 className="text-lg font-semibold text-white">Email Accounts</h2>
          <p className="text-sm text-gray-500">
            All email accounts assigned to this organization
          </p>
        </div>

        {emailAccounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No email accounts provisioned yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Sender Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Daily Limit</TableHead>
                <TableHead>Smartlead</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium text-white">
                    {account.email}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {account.sender_name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        account.status === "active" ? "default" : "secondary"
                      }
                    >
                      {account.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {account.daily_limit}
                  </TableCell>
                  <TableCell>
                    {account.smartlead_account_id ? (
                      <Badge variant="default" className="bg-green-600">
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Not connected</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(account.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Provisioning Modal */}
      <Dialog open={provisioningOpen} onOpenChange={setProvisioningOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Account Provisioning</DialogTitle>
            <DialogDescription>
              Select pre-warmed inboxes to purchase from ScaledMail
            </DialogDescription>
          </DialogHeader>

          {inboxesLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          )}

          {inboxesError && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
              {inboxesError}
            </div>
          )}

          {!inboxesLoading && !inboxesError && preWarmInboxes && (
            <div className="space-y-6">
              {/* Google Inboxes */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Google Workspace ({preWarmInboxes.google?.length || 0}{" "}
                  available)
                </h3>
                {renderInboxList(preWarmInboxes.google, "Google")}
              </div>

              {/* Outlook Inboxes */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Microsoft Outlook ({preWarmInboxes.outlook?.length || 0}{" "}
                  available)
                </h3>
                {renderInboxList(preWarmInboxes.outlook, "Outlook")}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProvisioningOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={selectedInboxes.size === 0 || purchasing}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                `Purchase ${selectedInboxes.size} inbox${
                  selectedInboxes.size !== 1 ? "es" : ""
                }`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smartlead Placeholder Modal */}
      <Dialog open={smartleadOpen} onOpenChange={setSmartleadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smartlead Inbox Configuration</DialogTitle>
            <DialogDescription>
              Connect your purchased inboxes to Smartlead for campaign sending
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 text-center">
            <Link2 className="w-12 h-12 text-orange-400 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400">Smartlead connection coming soon</p>
            <p className="text-sm text-gray-600 mt-2">
              {counts?.unconnectedEmailAccounts || 0} email accounts waiting to
              be connected
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSmartleadOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
