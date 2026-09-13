ALTER TABLE `editorial_proposals` ADD `proposal_kind` text DEFAULT 'definition' NOT NULL;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `target_scope` text;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `target_note_id` integer;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `target_norm_id` integer;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `note_type` text;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `note_title` text;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `note_source_url` text;--> statement-breakpoint
ALTER TABLE `editorial_proposals` ADD `note_reference_date` text;