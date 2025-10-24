const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestResult() {
  const sessionId = 'test-hubspot-1761302802363';

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('\n📋 Test Result for:', sessionId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Email:', data.contact_info.email);
  console.log('Name:', data.contact_info.name);
  console.log('Lead Captured:', data.lead_captured ? '✅ YES' : '❌ NO');
  console.log('Contact ID:', data.contact_id || 'NULL');
  console.log('Lead Score:', data.lead_score);

  if (data.lead_captured && data.contact_id) {
    console.log('\n🎉 SUCCESS! Contact was created in HubSpot!');
    console.log(`   HubSpot Contact ID: ${data.contact_id}`);
    console.log('\n✅ The lazy initialization fix worked!');
  } else if (data.lead_captured && !data.contact_id) {
    console.log('\n⚠️  Flag set but no contact ID - HubSpot push may have failed');
  } else {
    console.log('\n❌ FAILED: Lead was not captured to HubSpot');
    console.log('   The getHubSpotClient() may still be returning null');
  }
}

checkTestResult();
