/**
 * Quick test to check response format from /chat endpoint
 */

const PRODUCTION_URL = 'https://ai-bot-special.lenilani.com';

async function testResponseFormat() {
  console.log('🔍 Testing response format from /chat endpoint\n');

  const sessionId = `test_format_${Date.now()}`;

  // Test with email capture
  const message = "My email is test-response-check@lenilani.com";

  try {
    const response = await fetch(`${PRODUCTION_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });

    const data = await response.json();

    console.log('📊 Full Response Object:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    console.log('🔑 Response Keys:');
    console.log(Object.keys(data));
    console.log('\n');

    console.log('📋 Field Checks:');
    console.log(`   response: ${data.response ? 'EXISTS' : 'MISSING'}`);
    console.log(`   leadScore: ${data.leadScore !== undefined ? data.leadScore : 'UNDEFINED'}`);
    console.log(`   emailCaptured: ${data.emailCaptured !== undefined ? data.emailCaptured : 'UNDEFINED'}`);
    console.log(`   phoneCaptured: ${data.phoneCaptured !== undefined ? data.phoneCaptured : 'UNDEFINED'}`);
    console.log(`   escalationRequested: ${data.escalationRequested !== undefined ? data.escalationRequested : 'UNDEFINED'}`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

(async () => {
  await testResponseFormat();
})();
