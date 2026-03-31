"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Paperclip,
  Upload,
  Link2,
  Trash2,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Loader2,
} from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  driveUrl: string;
  uploadedByName: string;
  createdAt: string;
}

interface AttachmentSectionProps {
  targetType: "idea" | "initiative";
  targetId: string;
  readOnly?: boolean;
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/markdown",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const ACCEPT_STRING = ALLOWED_MIME_TYPES.join(",");

function getFileIcon(mimeType: string) {
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/markdown" ||
    mimeType === "text/plain"
  ) {
    return FileText;
  }
  if (mimeType.startsWith("image/")) {
    return Image;
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "text/csv"
  ) {
    return FileSpreadsheet;
  }
  return File;
}

export function AttachmentSection({
  targetType,
  targetId,
  readOnly = false,
}: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attachments?target_type=${targetType}&target_id=${targetId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch {
      // Silently fail — attachments are non-critical
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    setLoading(true);
    fetchAttachments();
  }, [fetchAttachments]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    if (file.size > MAX_FILE_SIZE) {
      alert("File is too large. Maximum size is 25MB.");
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      alert("File type not allowed.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("targetType", targetType);
      formData.append("targetId", targetId);
      formData.append("file", file);

      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const created = await res.json();
        setAttachments((prev) => [...prev, created]);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Upload failed");
      }
    } catch {
      alert("Upload failed");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleLinkSubmit() {
    if (!linkUrl.trim()) return;

    setLinkSubmitting(true);
    setLinkError(null);
    try {
      const res = await fetch("/api/attachments/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          driveUrl: linkUrl.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setAttachments((prev) => [...prev, created]);
        setLinkUrl("");
        setLinkDialogOpen(false);
      } else {
        const err = await res.json().catch(() => null);
        setLinkError(err?.error ?? "Failed to link file");
      }
    } catch {
      setLinkError("Failed to link file");
    } finally {
      setLinkSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 204) {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Paperclip className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Attachments</h4>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              <span>{uploading ? "Uploading..." : "Upload"}</span>
            </Button>
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="sm">
                    <Link2 className="size-3.5" />
                    <span>Link</span>
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link a Google Drive File</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Paste a Google Drive sharing URL. The file must be accessible
                    to the service account.
                  </p>
                  <Input
                    value={linkUrl}
                    onChange={(e) => {
                      setLinkUrl(e.target.value);
                      setLinkError(null);
                    }}
                    placeholder="https://drive.google.com/file/d/..."
                    onKeyDown={(e) => e.key === "Enter" && handleLinkSubmit()}
                  />
                  {linkError && (
                    <p className="text-xs text-destructive">{linkError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleLinkSubmit}
                    disabled={linkSubmitting || !linkUrl.trim()}
                    size="sm"
                  >
                    {linkSubmitting ? "Linking..." : "Link File"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Attachment list */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading attachments...</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No attachments</p>
      ) : (
        <div className="flex flex-col gap-1">
          {attachments.map((att) => {
            const Icon = getFileIcon(att.mimeType);
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors group"
              >
                <Icon className="size-4 text-muted-foreground flex-shrink-0" />
                <a
                  href={att.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm text-foreground hover:underline"
                  title={att.fileName}
                >
                  {att.fileName}
                </a>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {att.uploadedByName}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(att.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                    title="Delete attachment"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
