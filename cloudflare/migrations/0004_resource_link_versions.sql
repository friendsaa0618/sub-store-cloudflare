CREATE TABLE IF NOT EXISTS resource_link_versions (
  resource_type TEXT NOT NULL CHECK (resource_type IN ('source', 'collection')),
  resource_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (resource_type, resource_id)
);
