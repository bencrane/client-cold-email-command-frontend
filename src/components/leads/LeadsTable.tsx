"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface Lead {
  id: string;
  full_name: string | null;
  linkedin_url: string;
  latest_company: string | null;
  latest_title: string | null;
  industry: string | null;
  employee_count_range: string | null;
  country: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  error: string | null;
}

export function LeadsTable({ leads, loading, error }: LeadsTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Loading leads...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Please try again or contact support.
          </p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No leads found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try adjusting your filters
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </TableHead>
            <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Company
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title
            </TableHead>
            <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Industry
            </TableHead>
            <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
              LinkedIn
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow 
              key={lead.id} 
              className="border-border hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-medium text-foreground">
                {lead.full_name || (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {lead.latest_company || "—"}
              </TableCell>
              <TableCell>
                {lead.latest_title ? (
                  <span className="text-muted-foreground text-sm">
                    {lead.latest_title}
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell>
                {lead.industry ? (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {lead.industry}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <a
                  href={lead.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="sr-only">View Profile</span>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
