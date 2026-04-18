import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  timestamp,
  pgEnum,
  unique,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Enums
export const laneEnum = pgEnum("lane", ["now", "next", "backlog", "done"]);
export const sizeEnum = pgEnum("size", ["S", "M", "L"]);
export const ideaStatusEnum = pgEnum("idea_status", [
  "open",
  "promoted",
  "archived",
]);
export const commentTargetEnum = pgEnum("comment_target", [
  "initiative",
  "pillar",
  "idea",
]);
export const attachmentTargetEnum = pgEnum("attachment_target", [
  "idea",
  "initiative",
]);

// Tables
export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  entraOid: text("entra_oid").notNull().unique(),
  name: text().notNull(),
  email: text(),
  linearUserId: text("linear_user_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pillars = pgTable("pillars", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  boundary: text().notNull(),
  customerStory: text("customer_story").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const initiatives = pgTable("initiatives", {
  id: uuid().defaultRandom().primaryKey(),
  pillarId: uuid("pillar_id")
    .notNull()
    .references(() => pillars.id, { onDelete: "cascade" }),
  title: text().notNull(),
  lane: laneEnum().notNull().default("backlog"),
  size: sizeEnum().notNull().default("M"),
  why: text().notNull().default(""),
  dependsOn: uuid("depends_on")
    .array()
    .notNull()
    .default([]),
  linearProjectUrl: text("linear_project_url"),
  linearProjectId: text("linear_project_id"),
  linearId: text("linear_id"),
  linearStatus: text("linear_status"),
  description: text().notNull().default(""),
  content: text().notNull().default(""),
  milestones: text().notNull().default("[]"),
  linearProjectLead: text("linear_project_lead"),
  linearAssignee: text("linear_assignee"),
  linearSyncedAt: timestamp("linear_synced_at", { withTimezone: true }),
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  issueCountTotal: integer("issue_count_total").notNull().default(0),
  issueCountDone: integer("issue_count_done").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ideas = pgTable("ideas", {
  id: uuid().defaultRandom().primaryKey(),
  pillarId: uuid("pillar_id").references(() => pillars.id, {
    onDelete: "set null",
  }),
  title: text().notNull(),
  body: text().notNull(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  priorityScore: integer("priority_score"),
  status: ideaStatusEnum().notNull().default("open"),
  promotedInitiativeId: uuid("promoted_initiative_id").references(
    () => initiatives.id,
    { onDelete: "set null" }
  ),
  linearProjectId: text("linear_project_id"),
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ideaVotes = pgTable(
  "idea_votes",
  {
    id: uuid().defaultRandom().primaryKey(),
    ideaId: uuid("idea_id")
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    value: smallint().notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("idea_votes_idea_user_unique").on(table.ideaId, table.userId),
  ]
);

export const comments = pgTable("comments", {
  id: uuid().defaultRandom().primaryKey(),
  targetType: commentTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  body: text().notNull(),
  author: text().notNull(),
  authorName: text("author_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: uuid().defaultRandom().primaryKey(),
  targetType: attachmentTargetEnum("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  driveFileId: text("drive_file_id").notNull(),
  driveUrl: text("drive_url").notNull(),
  driveFolderId: text("drive_folder_id"),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mcpPrompts = pgTable("mcp_prompts", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull().unique(),
  title: text().notNull(),
  description: text().notNull().default(""),
  template: text().notNull(),
  arguments: jsonb()
    .$type<
      Array<{
        name: string;
        description?: string;
        required?: boolean;
      }>
    >()
    .notNull()
    .default([]),
  enabled: boolean().notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const personalAccessTokens = pgTable("personal_access_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  userOid: text("user_oid").notNull(),
  userName: text("user_name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenPrefix: text("token_prefix").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

// OAuth 2.1 authorization server tables

export const oauthClientTypeEnum = pgEnum("oauth_client_type", [
  "public",
  "confidential",
]);

export const oauthTokenTypeEnum = pgEnum("oauth_token_type", [
  "access",
  "refresh",
]);

export const oauthClients = pgTable("oauth_clients", {
  id: uuid().defaultRandom().primaryKey(),
  clientId: text("client_id").notNull().unique(),
  clientSecretHash: text("client_secret_hash"),
  clientSecretPrefix: text("client_secret_prefix"),
  clientType: oauthClientTypeEnum("client_type").notNull(),
  name: text().notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  scopes: text().array().notNull().default(["read"]),
  registrationType: text("registration_type").notNull(),
  ownerOid: text("owner_oid"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const oauthAuthCodes = pgTable("oauth_auth_codes", {
  id: uuid().defaultRandom().primaryKey(),
  codeHash: text("code_hash").notNull().unique(),
  clientId: text("client_id").notNull(),
  userOid: text("user_oid").notNull(),
  userName: text("user_name").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scopes: text().array().notNull(),
  resource: text(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenType: oauthTokenTypeEnum("token_type").notNull(),
  clientId: text("client_id").notNull(),
  userOid: text("user_oid").notNull(),
  userName: text("user_name").notNull(),
  scopes: text().array().notNull(),
  resource: text(),
  parentTokenId: uuid("parent_token_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});
