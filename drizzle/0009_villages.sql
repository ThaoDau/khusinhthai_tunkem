CREATE TABLE villages(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,description TEXT NOT NULL DEFAULT '',owner_id TEXT UNIQUE,created INTEGER NOT NULL);
--> statement-breakpoint
INSERT INTO villages(id,name,description,created) VALUES('thao-dau','Thảo Đậu','Làng đầu tiên, lưu giữ nhà và tài sản của cư dân hiện tại.',0);
--> statement-breakpoint
CREATE TABLE accounts(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,name TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,color TEXT NOT NULL,village_id TEXT REFERENCES villages(id));
--> statement-breakpoint
INSERT INTO accounts(id,username,name,salt,hash,color,village_id) SELECT id,username,name,salt,hash,color,'thao-dau' FROM users;
--> statement-breakpoint
CREATE INDEX accounts_village ON accounts(village_id);
