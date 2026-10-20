-- Corrections sent from the site (functions/api/report.js).
-- Create once:  npx wrangler d1 execute terraverba --remote --file=functions/schema.sql
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created TEXT NOT NULL DEFAULT (datetime('now')),
  kind TEXT NOT NULL,
  language_id TEXT, language_name TEXT,
  concept TEXT, shown TEXT,
  fix TEXT, note TEXT,
  contact TEXT,           -- private: never copied to GitHub
  locale TEXT, page TEXT,
  who TEXT NOT NULL,      -- salted hash of the sender's IP, for rate limiting only
  issue INTEGER,          -- GitHub issue number, once opened
  status TEXT NOT NULL DEFAULT 'new'
);
CREATE INDEX IF NOT EXISTS reports_who ON reports (who, created);
