"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, List, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeadList {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export default function LeadListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchLists = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/lead-lists");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lists");
      }

      setLists(data.lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch lists");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/lead-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create list");
      }

      // Success - close modal and refresh lists
      setNewListName("");
      setIsCreating(false);
      await fetchLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteList = (id: string) => {
    setLists((prev) => prev.filter((list) => list.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateList();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewListName("");
      setError(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full p-6 lg:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <List className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lead Lists</h1>
            <p className="text-sm text-muted-foreground">
              {lists.length === 0
                ? "Create lists to organize your leads"
                : `${lists.length} list${lists.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreating(true)}
          className="gap-2"
          disabled={isCreating}
        >
          <Plus className="w-4 h-4" />
          New List
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="rounded-lg border border-border bg-card">
        {/* Create new list input */}
        {isCreating && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <Input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter list name..."
                className="max-w-sm bg-background"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleCreateList}
                disabled={!newListName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewListName("");
                  setError(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {lists.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-32 text-right">Leads</TableHead>
                <TableHead className="w-40">Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list) => (
                <TableRow key={list.id} className="group">
                  <TableCell className="font-medium">{list.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {list.member_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(list.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteList(list.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          !isCreating && (
            <div className="py-16 text-center">
              <List className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No lists yet</p>
              <Button
                variant="outline"
                onClick={() => setIsCreating(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create your first list
              </Button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
