ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id);
ALTER TABLE comments ADD COLUMN thread_id INTEGER REFERENCES comments(id);

CREATE INDEX visible_comment_threads_by_page ON comments (page, id DESC)
  WHERE hidden = 0 AND thread_id IS NULL;
CREATE INDEX visible_comment_replies_by_thread ON comments (thread_id, id)
  WHERE hidden = 0 AND thread_id IS NOT NULL;
