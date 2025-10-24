/**
 * Full System Test - Chatbot → Analytics → HubSpot
 *
 * This script:
 * 1. Simulates a hot lead conversation
 * 2. Captures email and requests demo
 * 3. Verifies lead appears in analytics
 * 4. Should trigger HubSpot integration
 */

const PRODUCTION_URL = 'https://ai-bot-special.lenilani.com';

const testConversation = {
  name: "Test Lead - Full System",
  messages: [
    "Hi there! I'm the CEO of a growing hotel chain with 45 employees. We're losing serious money every day because our booking and reporting systems are completely manual - this is a critical problem for our business",
    "We desperately need real-time dashboards and automated reports. This is extremely urgent and we can afford to invest $8000 per month to fix this immediately",
    "Yes, I'd love to schedule a demo ASAP! My email is sarah.johnson@paradiseresorts.com and my phone is 808-555-1234. This is critical for our business and we need to move on this right away this week"
  ]
};

async function runFullSystemTest() {
  console.log('🧪 FULL SYSTEM TEST');
  console.log('===================\n');
  console.log('Testing: Chatbot → Analytics → HubSpot Integration\n');

  const sessionId = `test_${Date.now()}`;
  let finalLeadScore = 0;
  let emailCaptured = false;
  let phoneCaptured = false;
  let demoRequested = false;

  console.log('📝 Simulating conversation...\n');

  for (let i = 0; i < testConversation.messages.length; i++) {
    const message = testConversation.messages[i];

    console.log(`\n💬 User: "${message.substring(0, 80)}..."`);

    try {
      const response = await fetch(`${PRODUCTION_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`\n🤖 Bot: "${data.response.substring(0, 100)}..."`);

        if (data.leadScore !== undefined) {
          finalLeadScore = data.leadScore;
          console.log(`\n📊 Lead Score: ${data.leadScore}/100`);

          if (data.leadScore >= 80) {
            console.log('   🔥 HOT LEAD!');
          } else if (data.leadScore >= 60) {
            console.log('   🟡 Warm lead');
          }
        }

        if (data.emailCaptured) {
          emailCaptured = true;
          console.log('   ✅ Email captured');
        }

        if (data.phoneCaptured) {
          phoneCaptured = true;
          console.log('   ✅ Phone captured');
        }

        if (data.escalationRequested) {
          demoRequested = true;
          console.log('   ✅ Demo requested');
        }
      } else {
        console.error(`❌ Error: ${data.error}`);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
  }

  console.log('\n\n📊 TEST RESULTS');
  console.log('================\n');

  console.log('✓ Conversation completed');
  console.log(`✓ Final lead score: ${finalLeadScore}/100`);
  console.log(`✓ Email captured: ${emailCaptured ? 'YES' : 'NO'}`);
  console.log(`✓ Phone captured: ${phoneCaptured ? 'YES' : 'NO'}`);
  console.log(`✓ Demo requested: ${demoRequested ? 'YES' : 'NO'}`);

  console.log('\n\n🔍 NEXT STEPS - MANUAL VERIFICATION');
  console.log('====================================\n');

  console.log('1. CHECK ANALYTICS:');
  console.log(`   ${PRODUCTION_URL}/admin`);
  console.log(`   ${PRODUCTION_URL}/stats`);
  console.log('   → Look for the test lead in the dashboard\n');

  console.log('2. CHECK HUBSPOT:');
  console.log('   → Open HubSpot Contacts');
  console.log('   → Search for: sarah.johnson@paradiseresorts.com');
  console.log('   → Verify contact was created/updated');
  console.log('   → Check lead score and notes\n');

  console.log('3. EXPECTED IN HUBSPOT:');
  console.log('   • Contact: Sarah Johnson');
  console.log('   • Email: sarah.johnson@paradiseresorts.com');
  console.log('   • Phone: 808-555-1234');
  console.log('   • Company: Paradise Resorts (45 employees)');
  console.log(`   • Lead Score: ${finalLeadScore}`);
  console.log('   • Lifecycle Stage: Lead or MQL');
  console.log('   • Notes: Should contain conversation summary\n');

  if (finalLeadScore >= 80 && emailCaptured && demoRequested) {
    console.log('✅ TEST PASSED - All conditions met for HubSpot sync');
  } else {
    console.log('⚠️  TEST PARTIAL - Some conditions not met:');
    if (finalLeadScore < 80) console.log('   - Lead score below 80');
    if (!emailCaptured) console.log('   - Email not captured');
    if (!demoRequested) console.log('   - Demo not requested');
  }

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
  await runFullSystemTest();
})();
