const axios = require('axios');

const BASE_URL = 'https://ai-bot-special.lenilani.com';
const sessionId = `test-custom-props-${Date.now()}`;

async function testCustomProperties() {
  console.log('🧪 Testing HubSpot Custom Properties Integration\n');
  console.log(`Session ID: ${sessionId}\n`);

  try {
    // Step 1: Start conversation
    console.log('1️⃣  Starting conversation...');
    await axios.post(`${BASE_URL}/chat`, {
      message: "Hi, I'm interested in automating our customer support",
      sessionId
    });
    console.log('   ✅ Conversation started\n');

    // Step 2: Provide email (triggers lead capture)
    console.log('2️⃣  Providing email address...');
    const testEmail = `custom-props-test-${Date.now()}@lenilani.com`;
    await axios.post(`${BASE_URL}/chat`, {
      message: `My email is ${testEmail}`,
      sessionId
    });
    console.log(`   ✅ Email provided: ${testEmail}\n`);

    // Step 3: Provide name
    console.log('3️⃣  Providing name...');
    await axios.post(`${BASE_URL}/chat`, {
      message: "I'm Sarah Custom Properties",
      sessionId
    });
    console.log('   ✅ Name provided: Sarah Custom Properties\n');

    // Step 4: Build engagement (should trigger lead scoring)
    console.log('4️⃣  Building conversation context...');
    await axios.post(`${BASE_URL}/chat`, {
      message: "We get about 500 customer inquiries per day. Each one takes our team about 10 minutes to respond to manually.",
      sessionId
    });
    console.log('   ✅ Provided volume and time data\n');

    // Step 5: Show pain points (increase lead score)
    console.log('5️⃣  Describing pain points...');
    await axios.post(`${BASE_URL}/chat`, {
      message: "Our team spends 80 hours per week just answering the same questions over and over. We need to automate this ASAP.",
      sessionId
    });
    console.log('   ✅ Described pain points and urgency\n');

    // Step 6: Ask about solution (high intent)
    console.log('6️⃣  Showing purchase intent...');
    const response = await axios.post(`${BASE_URL}/chat`, {
      message: "What would it cost to build an AI chatbot for our website? We have a budget approved for this quarter.",
      sessionId
    });
    console.log('   ✅ Showed purchase intent\n');

    // Check if lead was captured
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (response.data.leadCaptured) {
      console.log('🎉 SUCCESS! Lead captured to HubSpot\n');
      console.log('📋 Contact Details:');
      console.log(`   Email: ${response.data.contactInfo.email}`);
      console.log(`   Name: ${response.data.contactInfo.name}`);

      if (response.data.contactInfo.leadScore !== undefined) {
        console.log(`   Lead Score: ${response.data.contactInfo.leadScore}`);
        console.log(`   Lead Priority: ${response.data.contactInfo.leadPriority || 'Not set'}`);
      }

      if (response.data.contactInfo.recommendedService) {
        console.log(`   Recommended Service: ${response.data.contactInfo.recommendedService}`);
      }

      console.log('\n✅ Custom properties should now be visible in HubSpot!');
      console.log('   Check the contact in HubSpot to verify:');
      console.log('   - AI Lead Score');
      console.log('   - AI Lead Priority');
      console.log('   - AI Recommended Service (should be "ai_chatbot")');
      console.log('   - AI Hours Per Week (should be 80)');
      console.log('   - AI Work Type');

    } else {
      console.log('⚠️  Lead capture flag not set');
      console.log('   This might be because:');
      console.log('   - Not enough conversation history');
      console.log('   - Lead scoring threshold not met');
      console.log('   - HubSpot client not initialized');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nTest email: ${testEmail}`);
    console.log('Search for this email in HubSpot to verify custom properties!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testCustomProperties()
  .then(() => {
    console.log('✅ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  });
