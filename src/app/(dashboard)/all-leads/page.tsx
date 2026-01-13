"use client";

import { useEffect, useState, useCallback } from "react";
import { useSidebarContext } from "@/lib/sidebar-context";
import { FilterPanel, LeadsTable, type Filters, type Lead } from "@/components/leads";
import { Users } from "lucide-react";

export default function AllLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Inject filter panel into sidebar
  useEffect(() => {
    setContent(
      <FilterPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />
    );

    return () => setContent(null);
  }, [filters, handleFilterChange, clearFilters, setContent]);

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
  }, [filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="h-full p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">All Leads</h1>
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

      {/* Table */}
      <LeadsTable leads={leads} loading={loading} error={error} />
    </div>
  );
}
