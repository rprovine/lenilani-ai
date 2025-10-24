-- Create conversations table to persist conversation contexts across serverless cold starts
CREATE TABLE conversations (
  session_id TEXT PRIMARY KEY,
  contact_info JSONB NOT NULL DEFAULT '{}',
  lead_score INT NOT NULL DEFAULT 0,
  escalation_requested BOOLEAN NOT NULL DEFAULT FALSE,
  lead_captured BOOLEAN NOT NULL DEFAULT FALSE,
  contact_id TEXT,
  demo_mode JSONB,
  recommended_service JSONB,
  roi_data JSONB,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on session_id for faster lookups
CREATE INDEX idx_conversations_session_id ON conversations(session_id);

-- Create index on updated_at for cleanup queries
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before any update
CREATE TRIGGER conversations_updated_at_trigger
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_conversations_updated_at();

-- Add comment explaining table purpose
COMMENT ON TABLE conversations IS 'Persists chatbot conversation contexts across serverless cold starts to maintain state for email capture, lead scoring, and HubSpot integration';
