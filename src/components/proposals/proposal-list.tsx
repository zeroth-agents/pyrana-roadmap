"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProposalReviewDialog } from "./proposal-review-dialog";

interface Proposal {
  id: string;
  title: string;
  why: string;
  size: string;
  pillarId: string;
  proposedByName: string;
  status: string;
  reviewerNotes?: string;
}

interface Pillar {
  id: string;
  name: string;
}

interface ProposalListProps {
  proposals: Proposal[];
  pillars: Pillar[];
  onReview: (id: string, data: {
    status: "accepted" | "rejected";
    reviewerNotes?: string;
    lane?: string;
  }) => Promise<void>;
}

export function ProposalList({ proposals, pillars, onReview }: ProposalListProps) {
  const [reviewing, setReviewing] = useState<Proposal | null>(null);
  const pillarMap = Object.fromEntries(pillars.map((p) => [p.id, p.name]));

  const pending = proposals.filter((p) => p.status === "pending");
  const resolved = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No pending proposals</p>
        )}
        <div className="grid gap-3">
          {pending.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer hover:shadow-md"
              onClick={() => setReviewing(p)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.why}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{pillarMap[p.pillarId]}</Badge>
                    <Badge variant="secondary">{p.size}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  by {p.proposedByName}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Resolved</h2>
          <div className="grid gap-2">
            {resolved.map((p) => (
              <Card key={p.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-3">
                  <span className="text-sm">{p.title}</span>
                  <Badge variant={p.status === "accepted" ? "default" : "destructive"}>
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewing && (
        <ProposalReviewDialog
          proposal={reviewing}
          open
          onClose={() => setReviewing(null)}
          onReview={onReview}
        />
      )}
    </div>
  );
}
