"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch("/api/admin/clients");
        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span
            className="hover:text-gray-300 cursor-pointer"
            onClick={() => router.push("/admin")}
          >
            Admin
          </span>
          <span>/</span>
          <span className="text-white">Clients</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Client Organizations</h1>
        <p className="text-gray-400 mt-1">
          Manage client accounts and email provisioning
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && organizations.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No organizations found</p>
        </div>
      )}

      {/* Organizations Grid */}
      {!loading && !error && organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => router.push(`/admin/clients/${org.id}`)}
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-[#2a2a2a] cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {org.name}
                  </h2>
                  {org.domain && (
                    <p className="text-sm text-gray-500 truncate">{org.domain}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {org.industry && (
                  <div>
                    <span className="text-gray-500">Industry:</span>
                    <span className="text-gray-300 ml-1">{org.industry}</span>
                  </div>
                )}
                {org.company_size && (
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <span className="text-gray-300 ml-1">{org.company_size}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                <p className="text-xs text-gray-600">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
