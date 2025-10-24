/**
 * Add one ULTRA hot lead - designed to score 90+ points
 * Combines ALL high-value keywords in strategic messages
 */

const conversation = {
  name: "Ultra Hot Lead",
  messages: [
    "I'm the CEO, owner, and founder of a 30-employee company. We're losing serious money every single day because of this critical major problem - it's costing us desperately and we have a $5000 monthly budget we can afford to invest to fix this urgent issue immediately right away ASAP",
    "This is extremely urgent and critical - we're desperate to fix this major problem immediately. We're losing money and it's costing us. I need this fixed right away ASAP this week. We can afford to spend $5000 per month and I'm the owner who makes decisions",
    "Perfect! My email is ceo@ultra-hot-lead.com and I want to schedule a consultation immediately. This is urgent and critical for my 30-employee company"
  ]
};

async function addUltraHotLead() {
  console.log('🔥🔥🔥 Adding ULTRA hot lead with maximum keywords...\n');

  const sessionId = `ultra_hot_${Date.now()}`;

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
            console.log('   🔥🔥🔥 HOT LEAD!!!');
          } else if (data.leadScore >= 60) {
            console.log(`   ⚠️  Only warm (need ${80 - data.leadScore} more points)`);
          }
        }
        if (data.emailCaptured) console.log('   📧 Email captured (+10 bonus)');
      } else {
        console.error(`❌ Error: ${data.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      break;
    }
  }

  console.log('\n✅ Lead added - check analytics!\n');
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
  await addUltraHotLead();
})();
