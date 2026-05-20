-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ranking INTEGER,
  address TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'Salvador',
  state TEXT DEFAULT 'BA',
  phone TEXT,
  description TEXT,
  cuisine_type TEXT,
  price_range TEXT,
  average_price NUMERIC,
  hours TEXT,
  image_url TEXT,
  instagram_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'exame_casual_2025',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_neighborhood ON restaurants(neighborhood);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_restaurants_source ON restaurants(source);
CREATE INDEX IF NOT EXISTS idx_restaurants_external_id ON restaurants(external_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
