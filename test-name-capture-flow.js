/**
 * Test Name Capture Flow - Verify name is requested immediately after email
 *
 * Expected flow:
 * 1. Business need conversation
 * 2. Provide email
 * 3. Bot IMMEDIATELY asks for name (NOT scheduling)
 * 4. Provide name
 * 5. Bot then moves to scheduling
 */

const PRODUCTION_URL = 'https://ai-bot-special.lenilani.com';

const testConversation = [
  "I run a hotel with 25 employees and we're losing money because our booking system is manual. This is a major problem for my business.",
  "Yes, we need to fix this urgently. My email is test-flow@lenilani.com",
  // Bot should ask for name here - NOT move to scheduling
  "My name is Sarah Johnson",
  // Bot should now move to scheduling
  "Yes, I'd like to schedule a demo this week"
];

async function testNameCaptureFlow() {
  console.log('🧪 TESTING NAME CAPTURE FLOW');
  console.log('================================\n');
  console.log('Expected: Bot asks for name IMMEDIATELY after email\n');

  const sessionId = `test_name_flow_${Date.now()}`;
  let step = 1;

  for (const message of testConversation) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`STEP ${step}: ${message.substring(0, 60)}...`);
    console.log('='.repeat(60));

    try {
      const response = await fetch(`${PRODUCTION_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`\n✅ Bot Response:\n"${data.response}"\n`);

        // Check for critical flow indicators
        if (step === 2) {
          // After email provided - should ask for name
          const asksForName = /(?:may I have your name|what(?:'s| is) your name|could I get your name|your name)/i.test(data.response);
          const mentionsScheduling = /(?:schedule|meeting|call|consultation|demo|calendar)/i.test(data.response);

          console.log('📋 CRITICAL VALIDATION (Step 2 - After Email):');
          console.log(`   Asks for name: ${asksForName ? '✅ YES' : '❌ NO'}`);
          console.log(`   Mentions scheduling: ${mentionsScheduling ? '❌ WRONG (too early)' : '✅ CORRECT (not yet)'}`);

          if (!asksForName) {
            console.log('\n⚠️  WARNING: Bot did not ask for name after email!');
          }
          if (mentionsScheduling) {
            console.log('\n⚠️  WARNING: Bot mentioned scheduling too early (should wait for name)!');
          }
        }

        if (step === 3) {
          // After name provided - should now mention scheduling
          const mentionsScheduling = /(?:schedule|meeting|call|consultation|demo|calendar|Reno|introduce)/i.test(data.response);

          console.log('📋 VALIDATION (Step 3 - After Name):');
          console.log(`   Mentions scheduling/Reno: ${mentionsScheduling ? '✅ YES' : '⚠️  NO'}`);
        }

        if (data.leadScore !== undefined) {
          console.log(`📊 Lead Score: ${data.leadScore}/100`);
        }
        if (data.emailCaptured) {
          console.log('📧 Email captured: test-flow@lenilani.com');
        }
        if (data.escalationRequested) {
          console.log('🔥 Demo requested');
        }

      } else {
        console.error(`❌ Error: ${data.error}`);
        return;
      }

      step++;
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nManually verify above that:');
  console.log('1. ✅ After email (Step 2): Bot asked for name');
  console.log('2. ✅ After email (Step 2): Bot did NOT mention scheduling');
  console.log('3. ✅ After name (Step 3): Bot then moved to scheduling');
  console.log('\n');
}

async function checkServer() {
  try {
    const response = await fetch(PRODUCTION_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

(async () => {
  console.log(`🔍 Checking production: ${PRODUCTION_URL}\n`);

  if (!await checkServer()) {
    console.error('❌ Production server not responding\n');
    process.exit(1);
  }

  console.log('✅ Server online\n');
  await testNameCaptureFlow();
})();
