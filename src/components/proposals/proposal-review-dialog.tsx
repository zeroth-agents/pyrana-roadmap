"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Proposal {
  id: string;
  title: string;
  why: string;
  size: string;
  pillarId: string;
  proposedByName: string;
}

interface ProposalReviewDialogProps {
  proposal: Proposal;
  open: boolean;
  onClose: () => void;
  onReview: (id: string, data: {
    status: "accepted" | "rejected";
    reviewerNotes?: string;
    lane?: string;
  }) => Promise<void>;
}

export function ProposalReviewDialog({
  proposal,
  open,
  onClose,
  onReview,
}: ProposalReviewDialogProps) {
  const [notes, setNotes] = useState("");
  const [lane, setLane] = useState("backlog");
  const [submitting, setSubmitting] = useState(false);

  async function handleAction(status: "accepted" | "rejected") {
    setSubmitting(true);
    await onReview(proposal.id, {
      status,
      reviewerNotes: notes || undefined,
      ...(status === "accepted" && { lane }),
    });
    setSubmitting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Proposal</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <p className="text-sm font-medium">{proposal.title}</p>
          </div>
          <div>
            <Label className="text-xs">Why</Label>
            <p className="text-sm">{proposal.why}</p>
          </div>
          <div>
            <Label className="text-xs">Proposed by</Label>
            <p className="text-sm">{proposal.proposedByName}</p>
          </div>
          <div>
            <Label className="text-xs">Lane (if accepting)</Label>
            <Select value={lane} onValueChange={(v) => v && setLane(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Now</SelectItem>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => handleAction("rejected")}
            disabled={submitting}
          >
            Reject
          </Button>
          <Button
            onClick={() => handleAction("accepted")}
            disabled={submitting}
          >
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
