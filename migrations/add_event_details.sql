-- Add additional event detail fields
ALTER TABLE events
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS performers TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS age_restriction TEXT,
ADD COLUMN IF NOT EXISTS organizer TEXT;

-- Add indexes for searching on new fields if needed
CREATE INDEX IF NOT EXISTS idx_events_performers ON events(performers) WHERE performers IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer) WHERE organizer IS NOT NULL;
