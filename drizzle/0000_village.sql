CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, name TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, color TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 0, team TEXT, area TEXT NOT NULL DEFAULT 'temple', action TEXT NOT NULL DEFAULT '', action_at INTEGER NOT NULL DEFAULT 0, seen INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE teams (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, owner TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL, channel TEXT NOT NULL, recipient TEXT, body TEXT NOT NULL, created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE progress (user_id TEXT NOT NULL, task TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,task,day));
--> statement-breakpoint
CREATE TABLE cases (id TEXT PRIMARY KEY, plaintiff TEXT NOT NULL, defendant TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE votes (case_id TEXT NOT NULL, user_id TEXT NOT NULL, PRIMARY KEY(case_id,user_id));
--> statement-breakpoint
CREATE INDEX messages_channel ON messages(channel,id);
