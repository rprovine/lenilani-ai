/**
 * One-time script to migrate analytics data from JSON file to Supabase
 * Run with: node migrate-analytics.js
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAnalytics() {
  console.log('🔄 Starting analytics migration...\n');

  // Read JSON file
  const jsonFile = './analytics-data.json';
  if (!fs.existsSync(jsonFile)) {
    console.log('❌ No analytics-data.json file found. Nothing to migrate.');
    return;
  }

  const fileData = fs.readFileSync(jsonFile, 'utf8');
  const analyticsData = JSON.parse(fileData);

  console.log('📊 Found analytics data:');
  console.log(`   - Total Conversations: ${analyticsData.totalConversations}`);
  console.log(`   - Total Messages: ${analyticsData.totalMessages}`);
  console.log(`   - Emails Captured: ${analyticsData.emailsCaptured}`);
  console.log(`   - Phones Captured: ${analyticsData.phonesCaptured}`);
  console.log(`   - Lead Scores:`, analyticsData.leadScores);
  console.log('');

  // Update Supabase
  const { error } = await supabase
    .from('analytics')
    .update({
      total_conversations: analyticsData.totalConversations,
      total_messages: analyticsData.totalMessages,
      emails_captured: analyticsData.emailsCaptured,
      phones_captured: analyticsData.phonesCaptured,
      escalations_requested: analyticsData.escalationsRequested,
      roi_calculations: analyticsData.roiCalculations,
      service_recommendations: analyticsData.serviceRecommendations,
      lead_scores: analyticsData.leadScores,
      demos_requested: analyticsData.demosRequested,
      pidgin_mode_activations: analyticsData.pidginModeActivations,
      average_messages_per_conversation: analyticsData.averageMessagesPerConversation,
      conversations_by_day: analyticsData.conversationsByDay,
      start_time: analyticsData.startTime
    })
    .eq('id', 1);

  if (error) {
    console.error('❌ Error migrating to Supabase:', error.message);
    return;
  }

  console.log('✅ Successfully migrated analytics to Supabase!');

  // Verify migration
  const { data, error: fetchError } = await supabase
    .from('analytics')
    .select('*')
    .eq('id', 1)
    .single();

  if (fetchError) {
    console.error('❌ Error verifying migration:', fetchError.message);
    return;
  }

  console.log('\n📊 Verified data in Supabase:');
  console.log(`   - Total Conversations: ${data.total_conversations}`);
  console.log(`   - Total Messages: ${data.total_messages}`);
  console.log(`   - Emails Captured: ${data.emails_captured}`);
  console.log(`   - Lead Scores:`, data.lead_scores);
  console.log('\n✨ Migration complete! You can now delete analytics-data.json if desired.');
}

migrateAnalytics().catch(console.error);
