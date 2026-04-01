"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

interface CommentThreadProps {
  targetType: "initiative" | "pillar" | "idea";
  targetId: string;
}

export function CommentThread({ targetType, targetId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(
      `/api/comments?target_type=${targetType}&target_id=${targetId}`
    )
      .then((r) => r.json())
      .then(setComments);
  }, [targetType, targetId]);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, body }),
    });
    setBody("");
    setSubmitting(false);
    const updated = await fetch(
      `/api/comments?target_type=${targetType}&target_id=${targetId}`
    ).then((r) => r.json());
    setComments(updated);
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Comments</h4>
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet</p>
      )}
      {comments.map((c) => (
        <div key={c.id} className="rounded border p-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="font-medium">{c.authorName}</span>
            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="mt-1 text-sm">{c.body}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.shiftKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Add a comment… (⇧/⌘+Enter to post)"
          className="min-h-[60px]"
        />
        <Button onClick={handleSubmit} disabled={submitting} size="sm">
          Post
        </Button>
      </div>
    </div>
  );
}
