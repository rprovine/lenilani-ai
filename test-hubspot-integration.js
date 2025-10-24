/**
 * HubSpot Integration Test
 * Tests the complete flow: conversation -> email capture -> name capture -> HubSpot push
 */

const axios = require('axios');

const BASE_URL = 'https://ai-bot-special.lenilani.com';
const sessionId = `test-hubspot-${Date.now()}`;

async function testHubSpotIntegration() {
  console.log('🧪 Testing HubSpot Integration\n');
  console.log(`Session ID: ${sessionId}\n`);

  try {
    // Step 1: Start conversation
    console.log('1️⃣ Starting conversation...');
    const response1 = await axios.post(`${BASE_URL}/chat`, {
      message: "Hi, I'm interested in your AI chatbot services",
      sessionId
    });
    console.log(`✅ Bot: ${response1.data.response.substring(0, 100)}...`);
    console.log(`   Email captured: ${response1.data.emailCaptured || false}`);
    console.log(`   Name captured: ${response1.data.nameCaptured || false}\n`);

    // Step 2: Provide email
    console.log('2️⃣ Providing email address...');
    const testEmail = `hubspot-test-${Date.now()}@lenilani.com`;
    const response2 = await axios.post(`${BASE_URL}/chat`, {
      message: `My email is ${testEmail}`,
      sessionId
    });
    console.log(`✅ Bot: ${response2.data.response.substring(0, 100)}...`);
    console.log(`   Email captured: ${response2.data.emailCaptured || false}`);
    console.log(`   Name captured: ${response2.data.nameCaptured || false}`);
    console.log(`   Contact info:`, response2.data.contactInfo || 'none');
    console.log(`   Lead score: ${response2.data.leadScore || 0}\n`);

    // Step 3: Provide name
    console.log('3️⃣ Providing name...');
    const testName = 'John HubSpot Tester';
    const response3 = await axios.post(`${BASE_URL}/chat`, {
      message: `I'm ${testName}`,
      sessionId
    });
    console.log(`✅ Bot: ${response3.data.response.substring(0, 100)}...`);
    console.log(`   Email captured: ${response3.data.emailCaptured || false}`);
    console.log(`   Name captured: ${response3.data.nameCaptured || false}`);
    console.log(`   Contact info:`, response3.data.contactInfo || 'none');
    console.log(`   Lead score: ${response3.data.leadScore || 0}\n`);

    // Step 4: Continue conversation to build lead score
    console.log('4️⃣ Building engagement...');
    const response4 = await axios.post(`${BASE_URL}/chat`, {
      message: "We need something that can handle 1000+ inquiries per day and integrate with our CRM",
      sessionId
    });
    console.log(`✅ Bot: ${response4.data.response.substring(0, 100)}...`);
    console.log(`   Lead score: ${response4.data.leadScore || 0}\n`);

    // Step 5: Verify in HubSpot
    console.log('5️⃣ Verification Summary:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Test Email: ${testEmail}`);
    console.log(`Test Name: ${testName}`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Final Lead Score: ${response4.data.leadScore || 0}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Action Required:');
    console.log('1. Check HubSpot for contact with email:', testEmail);
    console.log('2. Verify contact name:', testName);
    console.log('3. Check contact properties for lead score and service recommendations');
    console.log('\n🔗 HubSpot Contacts: https://app.hubspot.com/contacts/');

    console.log('\n✅ Test completed successfully!');
    console.log('\nIf the contact appears in HubSpot with the correct information,');
    console.log('the HubSpot integration is working correctly! 🎉');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    process.exit(1);
  }
}

testHubSpotIntegration();
