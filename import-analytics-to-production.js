/**
 * Import local analytics data to production Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Production Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importAnalytics() {
  console.log('📊 Importing local analytics data to production...\n');

  try {
    // Update analytics with local data
    const { data, error } = await supabase
      .from('analytics')
      .update({
        total_conversations: 11,
        total_messages: 28,
        emails_captured: 9,
        phones_captured: 0,
        escalations_requested: 0,
        roi_calculations: 0,
        service_recommendations: {
          "AI Chatbot": 2,
          "Fractional CTO": 0,
          "System Integration": 0,
          "Marketing Automation": 1,
          "Business Intelligence": 2
        },
        lead_scores: {
          "hot": 1,
          "cold": 2,
          "warm": 1,
          "qualified": 3
        },
        demos_requested: 2,
        pidgin_mode_activations: 0,
        average_messages_per_conversation: 0.00,
        conversations_by_day: {
          "2025-10-24": 11
        },
        start_time: '2025-10-24 07:51:26.492',
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select();

    if (error) {
      console.error('❌ Error importing analytics:', error.message);
      process.exit(1);
    }

    console.log('✅ Successfully imported analytics to production!');
    console.log('\nImported data:');
    console.log('  • 11 conversations');
    console.log('  • 28 total messages');
    console.log('  • 9 emails captured');
    console.log('  • Lead scores: 1 hot, 1 warm, 3 qualified, 2 cold');
    console.log('  • Service recommendations: 2 AI Chatbot, 2 BI, 1 Marketing');
    console.log('\n📈 Check production stats at: https://ai-bot-special.lenilani.com/stats\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

importAnalytics();
