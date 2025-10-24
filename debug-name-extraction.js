/**
 * Debug Name Extraction
 */

const PRODUCTION_URL = 'https://ai-bot-special.lenilani.com';

async function testNameExtraction() {
  console.log('🔍 DEBUGGING NAME EXTRACTION\n');

  const sessionId = `debug_${Date.now()}`;

  const tests = [
    "My email is test@example.com",
    "I'm John Smith",
    "Debug check"
  ];

  for (let i = 0; i < tests.length; i++) {
    const message = tests[i];

    console.log(`\n💬 Message ${i + 1}: "${message}"`);

    try {
      const response = await fetch(`${PRODUCTION_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      console.log('\n📦 Full Response Object:');
      console.log(JSON.stringify(data, null, 2));

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }
}

(async () => {
  await testNameExtraction();
})();
