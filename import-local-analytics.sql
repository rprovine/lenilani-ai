-- Import local analytics data to production
-- This preserves the analytics data from local development

UPDATE analytics
SET
  total_conversations = 11,
  total_messages = 28,
  emails_captured = 9,
  phones_captured = 0,
  escalations_requested = 0,
  roi_calculations = 0,
  service_recommendations = '{"AI Chatbot": 2, "Fractional CTO": 0, "System Integration": 0, "Marketing Automation": 1, "Business Intelligence": 2}'::jsonb,
  lead_scores = '{"hot": 1, "cold": 2, "warm": 1, "qualified": 3}'::jsonb,
  demos_requested = 2,
  pidgin_mode_activations = 0,
  average_messages_per_conversation = 0.00,
  conversations_by_day = '{"2025-10-24": 11}'::jsonb,
  start_time = '2025-10-24 07:51:26.492',
  updated_at = NOW()
WHERE id = 1;
