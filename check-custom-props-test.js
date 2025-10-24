const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTest() {
  const sessionId = 'test-hubspot-1761302802363'; // The successful test from earlier

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }

  console.log('\n📋 Custom Properties Test Result:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Email:', data.contact_info.email);
  console.log('Name:', data.contact_info.name);
  console.log('Lead Captured:', data.lead_captured ? '✅ YES' : '❌ NO');
  console.log('Contact ID:', data.contact_id || 'NULL');
  console.log('Lead Score:', data.lead_score);
  console.log('Recommended Service:', data.recommended_service || 'NULL');

  console.log('\n📝 Full Contact Info:');
  console.log(JSON.stringify(data.contact_info, null, 2));

  if (data.lead_captured && data.contact_id) {
    console.log('\n🎉 SUCCESS! Contact was created in HubSpot!');
    console.log(`   HubSpot Contact ID: ${data.contact_id}`);
    console.log('\n   Custom properties that should be in HubSpot:');
    console.log(`   - ai_lead_score: ${data.lead_score}`);
    console.log(`   - ai_recommended_service: ${data.recommended_service || 'not set'}`);
    console.log(`   - ai_lead_priority: ${data.lead_priority || 'not set'}`);
  } else {
    console.log('\n⚠️  Lead was not captured to HubSpot yet');
    console.log('   Possible reasons:');
    console.log('   - Vercel still deploying latest code');
    console.log('   - Lead scoring threshold not met');
    console.log('   - Need to wait for deployment to complete');
  }
}

checkTest();
