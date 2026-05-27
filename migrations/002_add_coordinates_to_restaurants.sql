-- Add latitude and longitude to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add index for coordinates
CREATE INDEX IF NOT EXISTS idx_restaurants_coordinates ON restaurants(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
