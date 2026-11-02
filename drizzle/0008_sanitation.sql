CREATE TABLE toilet_visits(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,day TEXT NOT NULL,kind TEXT NOT NULL,created INTEGER NOT NULL,finished INTEGER NOT NULL,flushed INTEGER NOT NULL DEFAULT 0,wiped INTEGER NOT NULL DEFAULT 0,incident TEXT);
--> statement-breakpoint
CREATE INDEX toilet_visits_day ON toilet_visits(user_id,day);
--> statement-breakpoint
CREATE TABLE toilet_camera(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,name TEXT NOT NULL,created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE toilet_bail(incident TEXT PRIMARY KEY,user_id TEXT NOT NULL,paid_by TEXT);
