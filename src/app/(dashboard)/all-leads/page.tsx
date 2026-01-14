"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSidebarContext } from "@/lib/sidebar-context";
import { FilterPanel, LeadsTable, type Filters, type Lead, type LeadList } from "@/components/leads";
import { Users, ListPlus, X, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState("all");
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [addingToList, setAddingToList] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const newListInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    industry: "",
    employee_range: "",
    country: "",
    title: "",
  });

  const { setContent } = useSidebarContext();

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      industry: "",
      employee_range: "",
      country: "",
      title: "",
    });
  }, []);

  const handleListChange = useCallback((listId: string) => {
    setSelectedListId(listId);
  }, []);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedLeadIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  const addToList = useCallback(async (listId: string) => {
    if (selectedLeadIds.size === 0) return;

    setAddingToList(true);
    try {
      const res = await fetch(`/api/lead-lists/${listId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: Array.from(selectedLeadIds) }),
      });

      if (res.ok) {
        const data = await res.json();
        // Show success - clear selection
        clearSelection();
        // Refresh lead lists to update counts
        fetchLeadLists();
        // Close dropdown
        setDropdownOpen(false);
        // Show a toast or notification
        console.log(`Added ${data.added} leads to list`);
      } else {
        const data = await res.json();
        console.error("Failed to add leads:", data.error);
      }
    } catch (err) {
      console.error("Failed to add leads to list:", err);
    } finally {
      setAddingToList(false);
    }
  }, [selectedLeadIds, clearSelection]);

  const createListAndAddLeads = useCallback(async () => {
    if (!newListName.trim() || selectedLeadIds.size === 0) return;

    setCreatingList(true);
    try {
      const impersonateEmail = localStorage.getItem("impersonate_email");
      const params = new URLSearchParams();
      if (impersonateEmail) params.set("email", impersonateEmail);

      // Create the list
      const createRes = await fetch(`/api/lead-lists?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        console.error("Failed to create list:", data.error);
        return;
      }

      const { list } = await createRes.json();

      // Add leads to the new list
      const addRes = await fetch(`/api/lead-lists/${list.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: Array.from(selectedLeadIds) }),
      });

      if (addRes.ok) {
        const data = await addRes.json();
        clearSelection();
        fetchLeadLists();
        setNewListName("");
        setIsCreatingList(false);
        setDropdownOpen(false);
        console.log(`Created list "${list.name}" and added ${data.added} leads`);
      }
    } catch (err) {
      console.error("Failed to create list and add leads:", err);
    } finally {
      setCreatingList(false);
    }
  }, [newListName, selectedLeadIds, clearSelection]);

  // Fetch lead lists for the org
  const fetchLeadLists = useCallback(async () => {
    try {
      const impersonateEmail = localStorage.getItem("impersonate_email");
      const params = new URLSearchParams();
      if (impersonateEmail) params.set("email", impersonateEmail);

      const res = await fetch(`/api/lead-lists?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.lists) {
        setLeadLists(
          data.lists.map((list: { id: string; name: string }) => ({
            id: list.id,
            name: list.name,
          }))
        );
      }
    } catch {
      // Silently fail - lists are optional
      console.error("Failed to fetch lead lists");
    }
  }, []);

  // Fetch lead lists on mount
  useEffect(() => {
    fetchLeadLists();
  }, [fetchLeadLists]);

  // Inject filter panel into sidebar
  useEffect(() => {
    setContent(
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        selectedListId={selectedListId}
        onListChange={handleListChange}
        leadLists={leadLists}
      />
    );

    return () => setContent(null);
  }, [filters, handleFilterChange, clearFilters, setContent, selectedListId, handleListChange, leadLists]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const impersonateEmail = localStorage.getItem("impersonate_email");
      const params = new URLSearchParams();

      if (impersonateEmail) params.set("email", impersonateEmail);
      if (filters.search) params.set("search", filters.search);
      if (filters.industry) params.set("industry", filters.industry);
      if (filters.employee_range) params.set("employee_range", filters.employee_range);
      if (filters.country) params.set("country", filters.country);
      if (filters.title) params.set("title", filters.title);
      if (selectedListId && selectedListId !== "all") {
        params.set("list_id", selectedListId);
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch leads");
        return;
      }

      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, [filters, selectedListId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Get the selected list name for display
  const selectedListName = selectedListId === "all" 
    ? "All Leads" 
    : leadLists.find((l) => l.id === selectedListId)?.name || "All Leads";

  return (
    <div className="h-full p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">{selectedListName}</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              {loading ? (
                "Loading leads..."
              ) : total > 0 ? (
                <>
                  <span className="text-foreground font-medium">{total.toLocaleString()}</span> leads found
                </>
              ) : (
                "No leads match your filters"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedLeadIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {selectedLeadIds.size} lead{selectedLeadIds.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex-1" />
          <DropdownMenu open={dropdownOpen} onOpenChange={(open) => {
            setDropdownOpen(open);
            if (!open) {
              setIsCreatingList(false);
              setNewListName("");
            }
          }}>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={addingToList || creatingList}>
                <ListPlus className="w-4 h-4 mr-2" />
                {addingToList || creatingList ? "Adding..." : "Add to List"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {isCreatingList ? (
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2">New list name</p>
                  <div className="flex gap-2">
                    <Input
                      ref={newListInputRef}
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list name..."
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newListName.trim()) {
                          createListAndAddLeads();
                        }
                        if (e.key === "Escape") {
                          setIsCreatingList(false);
                          setNewListName("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      disabled={!newListName.trim() || creatingList}
                      onClick={createListAndAddLeads}
                    >
                      {creatingList ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {leadLists.map((list) => (
                    <DropdownMenuItem
                      key={list.id}
                      onClick={() => addToList(list.id)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {list.name}
                    </DropdownMenuItem>
                  ))}
                  {leadLists.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsCreatingList(true);
                      setTimeout(() => newListInputRef.current?.focus(), 0);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create new list...
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Table */}
      <LeadsTable
        leads={leads}
        loading={loading}
        error={error}
        selectedIds={selectedLeadIds}
        onSelectionChange={handleSelectionChange}
      />
    </div>
  );
}
