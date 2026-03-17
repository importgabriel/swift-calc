-- Create calculations table for storing calculator history
CREATE TABLE IF NOT EXISTS calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expression TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for efficient sorting
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON calculations (created_at DESC);

-- Enable Row Level Security
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a simple calculator app)
CREATE POLICY "Allow all operations on calculations" ON calculations
  FOR ALL USING (true);