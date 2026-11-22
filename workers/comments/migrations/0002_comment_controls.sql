ALTER TABLE comments ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1));

DROP INDEX comments_by_page;
CREATE INDEX visible_comments_by_page ON comments (page, id DESC) WHERE hidden = 0;

CREATE TABLE comment_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  posting_enabled INTEGER NOT NULL CHECK (posting_enabled IN (0, 1))
);

INSERT INTO comment_settings (id, posting_enabled) VALUES (1, 1);
