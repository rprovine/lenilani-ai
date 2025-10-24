/**
 * Add one guaranteed hot lead to analytics
 * Designed to score 80+ points
 */

const conversation = {
  name: "Construction Company CEO",
  messages: [
    "I'm the CEO and owner of a construction company with 25 employees. We're losing money every day because our project tracking is manual - this is a critical major problem for my business and we're desperate",
    "This is costing us serious money and is urgent. We can afford to invest $3000 per month and need to fix this immediately",
    "Let me schedule a consultation right away. My email is ceo@islandbuilders.com and I want to move on this ASAP this week"
  ]
};

async function addHotLead() {
  console.log('🔥 Adding guaranteed hot lead...\n');

  const sessionId = `hot_lead_${Date.now()}`;

  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i];

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Message ${i + 1}/${conversation.messages.length}`);
        if (data.leadScore !== undefined) {
          console.log(`   📊 Lead Score: ${data.leadScore}/100`);
          if (data.leadScore >= 80) {
            console.log('   🔥 HOT LEAD!');
          }
        }
        if (data.emailCaptured) console.log('   📧 Email captured');
      } else {
        console.error(`❌ Error: ${data.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      break;
    }
  }

  console.log('\n✅ Hot lead added!');
  console.log('📈 Check: http://localhost:3000/admin\n');
}

async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/');
    return response.ok;
  } catch (error) {
    return false;
  }
}

(async () => {
  if (!await checkServer()) {
    console.error('❌ Server not running\n');
    process.exit(1);
  }
  await addHotLead();
})();
