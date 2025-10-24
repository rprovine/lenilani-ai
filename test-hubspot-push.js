/**
 * Test HubSpot Push with Email + Name (All Score Levels)
 *
 * Tests that leads are pushed to HubSpot when they provide
 * both email and name, regardless of lead score.
 */

const PRODUCTION_URL = 'https://ai-bot-special.lenilani.com';

// Test 3 different score levels
const testCases = [
  {
    name: "Cold Lead Test",
    email: "cold-lead-test@lenilani.com",
    contactName: "John Smith",
    messages: [
      "Just browsing",
      "My email is cold-lead-test@lenilani.com",
      "I'm John Smith",
    ],
    expectedScore: "Low (0-40)"
  },
  {
    name: "Warm Lead Test",
    email: "warm-lead-test@lenilani.com",
    contactName: "Sarah Johnson",
    messages: [
      "We're spending a lot of time on manual data entry",
      "My email is warm-lead-test@lenilani.com",
      "I'm Sarah Johnson",
    ],
    expectedScore: "Warm (40-60)"
  },
  {
    name: "Hot Lead Test",
    email: "hot-lead-test@lenilani.com",
    contactName: "Mike Chen",
    messages: [
      "I'm the CEO and owner of a 25-employee company. We're losing serious money every day on manual processes - this is a critical problem",
      "We desperately need to fix this immediately and can afford to invest $5000 monthly",
      "My email is hot-lead-test@lenilani.com and I'm Mike Chen, the CEO",
    ],
    expectedScore: "Hot (80+)"
  }
];

async function testHubSpotPush(testCase, index) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST ${index + 1}/3: ${testCase.name}`);
  console.log(`Expected Score: ${testCase.expectedScore}`);
  console.log('='.repeat(70));

  const sessionId = `hubspot_test_${Date.now()}_${index}`;
  let finalScore = 0;
  let emailCaptured = false;
  let leadCaptured = false;

  for (let i = 0; i < testCase.messages.length; i++) {
    const message = testCase.messages[i];

    console.log(`\n💬 Message ${i + 1}: "${message}"`);

    try {
      const response = await fetch(`${PRODUCTION_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Bot responded`);

        if (data.leadScore !== undefined) {
          finalScore = data.leadScore;
          console.log(`   📊 Lead Score: ${data.leadScore}/100`);
        }

        if (data.emailCaptured) {
          emailCaptured = true;
          console.log(`   📧 Email captured: ${testCase.email}`);
        }

        if (data.leadCaptured) {
          leadCaptured = true;
          console.log(`   ✅ LEAD PUSHED TO HUBSPOT!`);
        }

      } else {
        console.error(`   ❌ Error: ${data.error}`);
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  // Verify results
  console.log(`\n📋 RESULTS FOR ${testCase.name}:`);
  console.log(`   Final Score: ${finalScore}/100`);
  console.log(`   Email Captured: ${emailCaptured ? 'YES' : 'NO'}`);
  console.log(`   Lead Pushed to HubSpot: ${leadCaptured ? 'YES ✅' : 'NO ❌'}`);

  const passed = emailCaptured && leadCaptured;

  if (passed) {
    console.log(`\n✅ TEST PASSED - Lead pushed to HubSpot with email + name`);
  } else {
    console.log(`\n❌ TEST FAILED`);
    if (!emailCaptured) console.log(`   - Email not captured`);
    if (!leadCaptured) console.log(`   - Lead not pushed to HubSpot`);
  }

  return passed;
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
  console.log('🧪 TESTING HUBSPOT PUSH - ALL SCORE LEVELS');
  console.log('='.repeat(70));
  console.log(`\nTesting: ${PRODUCTION_URL}`);
  console.log(`\nExpected Behavior:`);
  console.log(`  - ALL leads with email + name should be pushed to HubSpot`);
  console.log(`  - This includes cold, warm, and hot leads\n`);

  if (!await checkServer()) {
    console.error('❌ Production server not responding\n');
    process.exit(1);
  }

  console.log('✅ Server online\n');

  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const passed = await testHubSpotPush(testCases[i], i);
    results.push({ test: testCases[i].name, passed });

    // Wait between tests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
  });

  const allPassed = results.every(r => r.passed);

  console.log(`\n${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  console.log(`\n📌 NEXT STEP: Check HubSpot for these contacts:`);
  console.log(`   1. cold-lead-test@lenilani.com (John Smith)`);
  console.log(`   2. warm-lead-test@lenilani.com (Sarah Johnson)`);
  console.log(`   3. hot-lead-test@lenilani.com (Mike Chen)`);
  console.log(`\nAll 3 should be in HubSpot regardless of score.\n`);

})();
