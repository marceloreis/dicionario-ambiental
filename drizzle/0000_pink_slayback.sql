CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proposal_id` integer,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`details` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_proposal_created` ON `audit_events` (`proposal_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `editor_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`invited_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `editorial_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`term_id` integer,
	`term_slug` text NOT NULL,
	`term_label` text NOT NULL,
	`base_definition_id` integer,
	`dispositivo` text NOT NULL,
	`current_text` text DEFAULT '' NOT NULL,
	`proposed_text` text NOT NULL,
	`justification` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_id` text NOT NULL,
	`author_email` text NOT NULL,
	`reviewer_id` text,
	`release_version` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_proposals_status_updated` ON `editorial_proposals` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_proposals_author_status` ON `editorial_proposals` (`author_id`,`status`);--> statement-breakpoint
CREATE TABLE `review_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proposal_id` integer NOT NULL,
	`author_id` text NOT NULL,
	`author_email` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`proposal_id`) REFERENCES `editorial_proposals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_comments_proposal` ON `review_comments` (`proposal_id`);