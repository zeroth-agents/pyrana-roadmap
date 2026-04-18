import { z } from "zod";

// Enums
export const Lane = z.enum(["now", "next", "backlog", "done"]);
export const Size = z.enum(["S", "M", "L"]);
export const IdeaStatus = z.enum(["open", "promoted", "archived"]);
export const CommentTarget = z.enum(["initiative", "pillar", "idea"]);

export type Lane = z.infer<typeof Lane>;
export type Size = z.infer<typeof Size>;
export type IdeaStatus = z.infer<typeof IdeaStatus>;
export type CommentTarget = z.infer<typeof CommentTarget>;

// Request schemas
export const CreateInitiativeSchema = z.object({
  pillarId: z.string().uuid(),
  title: z.string().min(1).max(200),
  lane: Lane.optional().default("backlog"),
  size: Size.optional().default("M"),
  why: z.string().max(500).optional().default(""),
  dependsOn: z.array(z.string().uuid()).optional().default([]),
  linearProjectUrl: z.string().url().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const UpdateInitiativeSchema = z.object({
  pillarId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  lane: Lane.optional(),
  size: Size.optional(),
  why: z.string().max(500).optional(),
  dependsOn: z.array(z.string().uuid()).optional(),
  linearProjectUrl: z.string().url().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const ReorderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
    lane: Lane.optional(),
    pillarId: z.string().uuid().optional(),
  })
);

export const BulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  update: UpdateInitiativeSchema,
});

export const CreateCommentSchema = z.object({
  targetType: CommentTarget,
  targetId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

// Idea schemas
export const CreateIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  pillarId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const UpdateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  pillarId: z.string().uuid().nullable().optional(),
  priorityScore: z.number().int().nullable().optional(),
  status: IdeaStatus.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const PromoteIdeaSchema = z.object({
  pillarId: z.string().uuid(),
  lane: Lane.optional().default("backlog"),
  linearProjectId: z.string().optional(),
});

// Attachment schemas
export const AttachmentTarget = z.enum(["idea", "initiative"]);
export type AttachmentTarget = z.infer<typeof AttachmentTarget>;

export const CreateAttachmentLinkSchema = z.object({
  targetType: AttachmentTarget,
  targetId: z.string().uuid(),
  driveUrl: z.string().url(),
});

export const ListAttachmentsSchema = z.object({
  target_type: AttachmentTarget,
  target_id: z.string().uuid(),
});

export const VoteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export type VoteResponse = {
  upCount: number;
  downCount: number;
  score: number;
  userVote: 1 | -1 | 0;
};

// MCP Prompt schemas
export const PromptArgumentSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Argument name must start with a letter or underscore"),
  description: z.string().max(500).optional(),
  required: z.boolean().optional(),
});

export const CreatePromptSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(
      /^[a-z][a-z0-9_]+$/,
      "Prompt name must be 2-64 chars, lowercase letters/digits/underscore, starting with a letter"
    ),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  template: z.string().min(1).max(10000),
  arguments: z.array(PromptArgumentSchema).max(20).optional().default([]),
  enabled: z.boolean().optional().default(true),
});

export const UpdatePromptSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  template: z.string().min(1).max(10000).optional(),
  arguments: z.array(PromptArgumentSchema).max(20).optional(),
  enabled: z.boolean().optional(),
});

export type IdeasListResponse = {
  items: Array<{
    id: string;
    pillarId: string | null;
    title: string;
    body: string;
    authorId: string;
    authorName: string;
    priorityScore: number | null;
    status: IdeaStatus;
    promotedInitiativeId: string | null;
    linearProjectId: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
    createdAt: string;
    updatedAt: string;
    upCount: number;
    downCount: number;
    score: number;
    commentCount: number;
    userVote: 1 | -1 | 0;
  }>;
  total: number;
};
