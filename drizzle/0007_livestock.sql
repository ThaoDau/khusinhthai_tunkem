ALTER TABLE land_parcels ADD COLUMN coop_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE land_parcels ADD COLUMN coop_ready INTEGER NOT NULL DEFAULT 0;
CREATE TABLE land_animals (
 id TEXT PRIMARY KEY,
 parcel_id TEXT NOT NULL REFERENCES land_parcels(id),
 kind TEXT NOT NULL,
 fed_at INTEGER NOT NULL DEFAULT 0,
 ready_at INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX land_animals_parcel ON land_animals(parcel_id);
