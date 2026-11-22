CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL UNIQUE,
  page TEXT NOT NULL,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX comments_by_page ON comments (page, id DESC);

CREATE TABLE review_quota (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  minute INTEGER NOT NULL,
  used INTEGER NOT NULL
);
