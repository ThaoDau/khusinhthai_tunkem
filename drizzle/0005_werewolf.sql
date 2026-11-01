ALTER TABLE users ADD COLUMN wf_room TEXT;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN wf_locked INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE wf_rooms (id TEXT PRIMARY KEY, title TEXT NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, nonce TEXT NOT NULL, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE wf_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, game INTEGER NOT NULL, channel TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX wf_messages_room ON wf_messages(room_id,game,channel,id);
