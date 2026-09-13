import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const editorProfiles = sqliteTable("editor_profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["editor", "reviewer", "admin"] }).notNull().default("editor"),
  invitedBy: text("invited_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const proposals = sqliteTable("editorial_proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  termId: integer("term_id"),
  termSlug: text("term_slug").notNull(),
  termLabel: text("term_label").notNull(),
  baseDefinitionId: integer("base_definition_id"),
  proposalKind: text("proposal_kind", { enum: ["definition", "note"] }).notNull().default("definition"),
  targetScope: text("target_scope", { enum: ["definition", "norm"] }),
  targetNoteId: integer("target_note_id"),
  targetNormId: integer("target_norm_id"),
  noteType: text("note_type", { enum: ["historica", "comparativa", "jurisprudencial", "editorial", "bibliografica"] }),
  noteTitle: text("note_title"),
  noteSourceUrl: text("note_source_url"),
  noteReferenceDate: text("note_reference_date"),
  dispositivo: text("dispositivo").notNull(),
  currentText: text("current_text").notNull().default(""),
  proposedText: text("proposed_text").notNull(),
  justification: text("justification").notNull(),
  status: text("status", { enum: ["draft", "in_review", "approved", "published", "returned"] }).notNull().default("draft"),
  authorId: text("author_id").notNull(),
  authorEmail: text("author_email").notNull(),
  reviewerId: text("reviewer_id"),
  releaseVersion: text("release_version"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_proposals_status_updated").on(table.status, table.updatedAt),
  index("idx_proposals_author_status").on(table.authorId, table.status),
]);

export const reviewComments = sqliteTable("review_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proposalId: integer("proposal_id").notNull().references(() => proposals.id),
  authorId: text("author_id").notNull(),
  authorEmail: text("author_email").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_comments_proposal").on(table.proposalId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  proposalId: integer("proposal_id"),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_audit_proposal_created").on(table.proposalId, table.createdAt)]);
