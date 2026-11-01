ALTER TABLE users ADD COLUMN x REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN z REAL NOT NULL DEFAULT 10;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN facing REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN position_at INTEGER NOT NULL DEFAULT 0;
