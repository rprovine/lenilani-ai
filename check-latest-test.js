const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConversation() {
  const sessionId = 'test-hubspot-1761301231823';
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log('\n📋 Latest Test Conversation:', sessionId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Email:', data.contact_info.email);
  console.log('Name:', data.contact_info.name);
  console.log('Lead Captured:', data.lead_captured, data.lead_captured ? '✅' : '❌');
  console.log('Contact ID:', data.contact_id || 'NULL');
  console.log('Lead Score:', data.lead_score);
  console.log('\nUpdated At:', data.updated_at);
  
  if (!data.lead_captured) {
    console.log('\n⚠️  WARNING: Lead was NOT captured to HubSpot');
    console.log('   This means the HubSpot push condition was not met');
  } else {
    console.log('\n✅ Lead was successfully captured to HubSpot!');
    console.log('   HubSpot Contact ID:', data.contact_id);
  }
}

checkConversation();
