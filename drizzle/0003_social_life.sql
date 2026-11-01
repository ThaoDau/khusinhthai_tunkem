ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 100;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN hat INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN seat TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE inventory (user_id TEXT NOT NULL, item TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,item));
