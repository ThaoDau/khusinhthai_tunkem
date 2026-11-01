ALTER TABLE users ADD COLUMN jailed_until INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN farm_at INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN theft_at INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE garden_plots (id INTEGER PRIMARY KEY, ready_at INTEGER NOT NULL DEFAULT 0, watered_at INTEGER NOT NULL DEFAULT 0, harvested_at INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE incidents (id TEXT PRIMARY KEY, culprit TEXT NOT NULL, item TEXT NOT NULL, location TEXT NOT NULL, suspects TEXT NOT NULL, clue TEXT NOT NULL, eliminated TEXT NOT NULL DEFAULT '[]', quorum INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'open', created INTEGER NOT NULL, expires INTEGER NOT NULL, solved_name TEXT);
--> statement-breakpoint
CREATE TABLE incident_votes (incident_id TEXT NOT NULL, voter TEXT NOT NULL, suspect TEXT NOT NULL, created INTEGER NOT NULL, PRIMARY KEY(incident_id,voter));
--> statement-breakpoint
CREATE INDEX incidents_open ON incidents(status,created);
