-- Create analytics table for chatbot metrics
CREATE TABLE analytics (
  id SERIAL PRIMARY KEY,
  total_conversations INT NOT NULL DEFAULT 0,
  total_messages INT NOT NULL DEFAULT 0,
  emails_captured INT NOT NULL DEFAULT 0,
  phones_captured INT NOT NULL DEFAULT 0,
  escalations_requested INT NOT NULL DEFAULT 0,
  roi_calculations INT NOT NULL DEFAULT 0,
  service_recommendations JSONB NOT NULL DEFAULT '{
    "AI Chatbot": 0,
    "Business Intelligence": 0,
    "System Integration": 0,
    "Fractional CTO": 0,
    "Marketing Automation": 0
  }'::jsonb,
  lead_scores JSONB NOT NULL DEFAULT '{
    "hot": 0,
    "warm": 0,
    "qualified": 0,
    "cold": 0
  }'::jsonb,
  demos_requested INT NOT NULL DEFAULT 0,
  pidgin_mode_activations INT NOT NULL DEFAULT 0,
  average_messages_per_conversation DECIMAL(10, 2) NOT NULL DEFAULT 0,
  conversations_by_day JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on updated_at for faster queries
CREATE INDEX idx_analytics_updated_at ON analytics(updated_at DESC);

-- Insert initial analytics row (we'll use a single row with id=1 for all analytics)
INSERT INTO analytics (
  total_conversations,
  total_messages,
  emails_captured,
  phones_captured,
  escalations_requested,
  roi_calculations,
  service_recommendations,
  lead_scores,
  demos_requested,
  pidgin_mode_activations,
  average_messages_per_conversation,
  conversations_by_day,
  start_time
) VALUES (
  0,
  0,
  0,
  0,
  0,
  0,
  '{
    "AI Chatbot": 0,
    "Business Intelligence": 0,
    "System Integration": 0,
    "Fractional CTO": 0,
    "Marketing Automation": 0
  }'::jsonb,
  '{
    "hot": 0,
    "warm": 0,
    "qualified": 0,
    "cold": 0
  }'::jsonb,
  0,
  0,
  0,
  '{}'::jsonb,
  NOW()
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before any update
CREATE TRIGGER analytics_updated_at_trigger
BEFORE UPDATE ON analytics
FOR EACH ROW
EXECUTE FUNCTION update_analytics_updated_at();
