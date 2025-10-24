const axios = require('axios');

const BASE_URL = 'https://ai-bot-special.lenilani.com';

async function testDirectCapture() {
  console.log('🧪 Testing Direct Lead Capture with Custom Properties\n');

  const testEmail = `direct-capture-test-${Date.now()}@lenilani.com`;

  try {
    const response = await axios.post(`${BASE_URL}/api/capture-lead`, {
      email: testEmail,
      firstname: 'Direct',
      lastname: 'Capture Test',
      phone: '808-555-1234',
      company: 'Test Company Inc',
      message: 'Testing custom properties integration',
      conversationSummary: 'User discussed AI chatbot needs, showed high intent, mentioned 80 hours/week of manual work',
      leadScore: 75,
      leadPriority: 'high',
      recommendedService: 'ai_chatbot',
      roiData: {
        potentialSavings: 50000,
        roi: 300,
        hoursPerWeek: 80,
        workType: 'Customer support responses'
      }
    });

    console.log('✅ Lead capture successful!\n');
    console.log('📋 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.contactId) {
      console.log('\n🎉 SUCCESS! Contact created in HubSpot');
      console.log(`   Contact ID: ${response.data.contactId}`);
      console.log(`   New Contact: ${response.data.isNew ? 'Yes' : 'No (updated existing)'}`);
      console.log('\n📊 Custom properties that should be in HubSpot:');
      console.log('   - ai_lead_score: 75');
      console.log('   - ai_lead_priority: high');
      console.log('   - ai_recommended_service: ai_chatbot');
      console.log('   - ai_annual_savings: 50000');
      console.log('   - ai_roi_percentage: 300');
      console.log('   - ai_hours_per_week: 80');
      console.log('   - ai_work_type: Customer support responses');
      console.log('\n✅ Now check HubSpot for contact:', testEmail);
    } else {
      console.log('\n⚠️  Unexpected response');
    }

  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('\nFull error response:');
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDirectCapture()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  });
