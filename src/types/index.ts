import { z } from "zod";

// Enums
export const Lane = z.enum(["now", "next", "backlog"]);
export const Size = z.enum(["S", "M", "L"]);
export const ProposalStatus = z.enum(["pending", "accepted", "rejected"]);
export const CommentTarget = z.enum(["initiative", "pillar"]);

export type Lane = z.infer<typeof Lane>;
export type Size = z.infer<typeof Size>;
export type ProposalStatus = z.infer<typeof ProposalStatus>;
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
});

export const UpdateInitiativeSchema = z.object({
  pillarId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  lane: Lane.optional(),
  size: Size.optional(),
  why: z.string().max(500).optional(),
  dependsOn: z.array(z.string().uuid()).optional(),
  linearProjectUrl: z.string().url().nullable().optional(),
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

export const CreateProposalSchema = z.object({
  pillarId: z.string().uuid(),
  title: z.string().min(1).max(200),
  size: Size.optional().default("M"),
  why: z.string().max(500).optional().default(""),
});

export const ReviewProposalSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  reviewerNotes: z.string().max(500).optional(),
  lane: Lane.optional().default("backlog"),
  dependsOn: z.array(z.string().uuid()).optional().default([]),
});

export const CreateCommentSchema = z.object({
  targetType: CommentTarget,
  targetId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});
