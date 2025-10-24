const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConversation() {
  const sessionId = 'test-hubspot-1761300767430';
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  console.log('\n📋 Conversation Data for:', sessionId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Contact Info:', JSON.stringify(data.contact_info, null, 2));
  console.log('\nLead Captured:', data.lead_captured);
  console.log('Lead Score:', data.lead_score);
  console.log('Contact ID:', data.contact_id);
  console.log('Escalation Requested:', data.escalation_requested);
  console.log('\nUpdated At:', data.updated_at);
}

checkConversation();
