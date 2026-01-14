"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Save,
  Loader2,
  Mail,
  Reply,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
  smartlead_campaign_id: number | null;
}

interface Sequence {
  id?: string;
  campaign_id: string;
  seq_number: number;
  subject: string;
  body: string;
  delay_days: number;
  is_reply?: boolean;
}

const AVAILABLE_VARIABLES = [
  { label: "First Name", value: "{{first_name}}" },
  { label: "Last Name", value: "{{last_name}}" },
  { label: "Full Name", value: "{{full_name}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Company", value: "{{company}}" },
  { label: "Title", value: "{{title}}" },
];

// Helper to create a comparable key for a sequence
function getSequenceKey(seq: Sequence): string {
  return JSON.stringify({
    subject: seq.subject,
    body: seq.body,
    delay_days: seq.delay_days,
    seq_number: seq.seq_number,
  });
}

export default function CampaignMessagesPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [savedSequences, setSavedSequences] = useState<Sequence[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeInputRef, setActiveInputRef] = useState<{
    stepNumber: number;
    field: "subject" | "body";
  } | null>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (sequences.length !== savedSequences.length) return true;
    return sequences.some((seq, index) => {
      const saved = savedSequences[index];
      if (!saved) return true;
      return getSequenceKey(seq) !== getSequenceKey(saved);
    });
  }, [sequences, savedSequences]);

  // Refs for input fields to handle cursor position
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(
    new Map()
  );

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

  const fetchSequences = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sequences`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch sequences");
      const mappedSequences = data.map((seq: Sequence) => ({
        ...seq,
        is_reply: seq.seq_number > 1,
      }));
      setSequences(mappedSequences);
      setSavedSequences(mappedSequences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sequences");
    }
  }, [campaignId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCampaign(), fetchSequences()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchCampaign, fetchSequences]);

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
  };

  const addStep = () => {
    const newStepNumber = sequences.length + 1;
    const newSequence: Sequence = {
      campaign_id: campaignId,
      seq_number: newStepNumber,
      subject: "",
      body: "",
      delay_days: newStepNumber === 1 ? 0 : 3,
      is_reply: newStepNumber > 1,
    };
    setSequences([...sequences, newSequence]);
    setExpandedSteps((prev) => new Set(prev).add(newStepNumber));
  };

  const updateSequence = (stepNumber: number, updates: Partial<Sequence>) => {
    setSequences((prev) =>
      prev.map((seq) =>
        seq.seq_number === stepNumber ? { ...seq, ...updates } : seq
      )
    );
  };

  const deleteStep = (stepNumber: number) => {
    setSequences((prev) => {
      const filtered = prev.filter((seq) => seq.seq_number !== stepNumber);
      // Renumber remaining sequences
      return filtered.map((seq, index) => ({
        ...seq,
        seq_number: index + 1,
        is_reply: index > 0,
        delay_days: index === 0 ? 0 : seq.delay_days || 3,
      }));
    });
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.delete(stepNumber);
      return next;
    });
  };

  const saveSequences = async (collapseStepNumber?: number) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sequences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequences: sequences.map((seq) => ({
            subject: seq.subject,
            body: seq.body,
            delay_days: seq.delay_days,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save sequences");

      // Update with returned data (includes IDs)
      const updatedSequences = data.map((seq: Sequence) => ({
        ...seq,
        is_reply: seq.seq_number > 1,
      }));
      setSequences(updatedSequences);
      setSavedSequences(updatedSequences);

      // Collapse the step after successful save
      if (collapseStepNumber !== undefined) {
        setExpandedSteps((prev) => {
          const next = new Set(prev);
          next.delete(collapseStepNumber);
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sequences");
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    if (!activeInputRef) return;

    const refKey = `${activeInputRef.stepNumber}-${activeInputRef.field}`;
    const input = inputRefs.current.get(refKey);
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue =
      sequences.find((s) => s.seq_number === activeInputRef.stepNumber)?.[
        activeInputRef.field
      ] || "";

    const newValue =
      currentValue.substring(0, start) + variable + currentValue.substring(end);

    updateSequence(activeInputRef.stepNumber, {
      [activeInputRef.field]: newValue,
    });

    // Restore focus and cursor position after update
    setTimeout(() => {
      input.focus();
      const newPosition = start + variable.length;
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleInputFocus = (stepNumber: number, field: "subject" | "body") => {
    setActiveInputRef({ stepNumber, field });
  };

  const setInputRef = (
    stepNumber: number,
    field: "subject" | "body",
    el: HTMLInputElement | HTMLTextAreaElement | null
  ) => {
    const key = `${stepNumber}-${field}`;
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
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

  return (
    <div className="h-full p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Campaign
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
                {sequences.length} step{sequences.length !== 1 ? "s" : ""} in
                sequence
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addStep}>
            <Plus className="w-4 h-4 mr-2" />
            Add Step
          </Button>
          <Button onClick={() => router.push(`/campaigns/${campaignId}/settings`)}>
            Continue to Settings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Sequence Steps */}
      <div className="space-y-4 mb-8">
        {sequences.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">No steps yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first email step to start building your sequence
            </p>
            <Button onClick={addStep}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Step
            </Button>
          </div>
        ) : (
          sequences.map((sequence) => (
            <SequenceCard
              key={sequence.seq_number}
              sequence={sequence}
              isExpanded={expandedSteps.has(sequence.seq_number)}
              onToggle={() => toggleStep(sequence.seq_number)}
              onUpdate={(updates) => updateSequence(sequence.seq_number, updates)}
              onDelete={() => deleteStep(sequence.seq_number)}
              onSave={() => saveSequences(sequence.seq_number)}
              isSaving={isSaving}
              hasChanges={hasUnsavedChanges()}
              onInputFocus={handleInputFocus}
              setInputRef={setInputRef}
              onInsertVariable={insertVariable}
            />
          ))
        )}
      </div>

      {/* Available Variables */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">
          Available Variables
        </h3>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_VARIABLES.map((variable) => (
            <button
              key={variable.value}
              onClick={() => insertVariable(variable.value)}
              className="px-3 py-1.5 text-sm font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 transition-colors"
            >
              {variable.value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SequenceCardProps {
  sequence: Sequence;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<Sequence>) => void;
  onDelete: () => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  onInputFocus: (stepNumber: number, field: "subject" | "body") => void;
  setInputRef: (
    stepNumber: number,
    field: "subject" | "body",
    el: HTMLInputElement | HTMLTextAreaElement | null
  ) => void;
  onInsertVariable: (variable: string) => void;
}

function SequenceCard({
  sequence,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  onSave,
  isSaving,
  hasChanges,
  onInputFocus,
  setInputRef,
}: SequenceCardProps) {
  const isFirstStep = sequence.seq_number === 1;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Collapsed Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
          {sequence.seq_number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {sequence.subject || "Untitled step"}
            </span>
            {isFirstStep ? (
              <Badge variant="outline" className="text-xs shrink-0">
                <Mail className="w-3 h-3 mr-1" />
                New
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFirstStep
              ? "Sends immediately"
              : `Wait ${sequence.delay_days} day${sequence.delay_days !== 1 ? "s" : ""}`}
          </p>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          {/* Send as Reply Checkbox (for steps 2+) */}
          {!isFirstStep && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                id={`reply-${sequence.seq_number}`}
                checked={sequence.is_reply}
                onCheckedChange={(checked) =>
                  onUpdate({ is_reply: checked === true })
                }
              />
              <Label
                htmlFor={`reply-${sequence.seq_number}`}
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Send as thread reply (same conversation)
              </Label>
            </div>
          )}

          {/* Subject Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onInputFocus(sequence.seq_number, "subject");
                }}
              >
                Insert Variable
              </Button>
            </div>
            <Input
              ref={(el) => setInputRef(sequence.seq_number, "subject", el)}
              value={sequence.subject}
              onChange={(e) => onUpdate({ subject: e.target.value })}
              onFocus={() => onInputFocus(sequence.seq_number, "subject")}
              placeholder="Enter email subject..."
              className="font-normal"
            />
          </div>

          {/* Body Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-medium">
                Body <span className="text-destructive">*</span>
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  onInputFocus(sequence.seq_number, "body");
                }}
              >
                Insert Variable
              </Button>
            </div>
            <textarea
              ref={(el) => setInputRef(sequence.seq_number, "body", el)}
              value={sequence.body}
              onChange={(e) => onUpdate({ body: e.target.value })}
              onFocus={() => onInputFocus(sequence.seq_number, "body")}
              placeholder="Enter email body..."
              rows={6}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-y min-h-[120px]"
            />
          </div>

          {/* Delay Field (for steps 2+) */}
          {!isFirstStep && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-1.5 block">
                Delay after previous step
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Wait</span>
                <Input
                  type="number"
                  min={1}
                  value={sequence.delay_days}
                  onChange={(e) =>
                    onUpdate({ delay_days: parseInt(e.target.value) || 1 })
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  day{sequence.delay_days !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isSaving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Step
            </Button>
            <Button
              onClick={onSave}
              disabled={isSaving || !hasChanges}
              size="sm"
              className="min-w-[130px] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
