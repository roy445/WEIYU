-- Run once on the production PostgreSQL database before deploying announcement display settings.
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'inbox';

ALTER TABLE announcements
  DROP CONSTRAINT IF EXISTS announcements_display_mode_check;

ALTER TABLE announcements
  ADD CONSTRAINT announcements_display_mode_check
  CHECK (display_mode IN ('inbox', 'marquee', 'pinned'));

CREATE INDEX IF NOT EXISTS announcements_display_published_idx
  ON announcements(display_mode, published_at DESC);
