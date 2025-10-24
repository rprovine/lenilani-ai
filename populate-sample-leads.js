/**
 * Quick script to populate analytics with sample leads
 * 2 hot, 2 warm, 2 qualified, 2 cold leads
 */

const conversations = [
  // HOT LEAD 1: Tour Company
  {
    name: "Mike - Hawaii Adventure Tours",
    messages: [
      "I'm the owner of a tour company with 12 employees. We're losing money tracking bookings manually - this is a major problem and critical for my business",
      "We have 200 bookings monthly and this is costing us serious time. We're desperate to fix this immediately and can afford to invest",
      "I'd like to move on this right away. Mike@HawaiiAdventureTours.com",
      "Yeah, let's schedule a demo this week"
    ]
  },

  // HOT LEAD 2: Hotel
  {
    name: "David - Waikiki Beach Hotel",
    messages: [
      "I'm the owner of a boutique hotel with 20 employees. Our Excel reports are a major problem - this is costing us money and is critical for my business",
      "We're desperate for real-time data. This is urgent - I need to fix this immediately and can afford to invest in the right solution",
      "I want a demo ASAP this week. david@waikikibeachhotel.com"
    ]
  },

  // WARM LEAD 1: Poke Restaurant
  {
    name: "Sarah - Ono Poke Bowl",
    messages: [
      "Aloha! We run a poke restaurant and I'm spending 3-4 hours every day updating spreadsheets for inventory and orders. There has to be a better way?",
      "How much time could this actually save us?",
      "That sounds amazing. My email is sarah@onopoke.com - can you send me more info?"
    ]
  },

  // WARM LEAD 2: Real Estate
  {
    name: "Lisa - Pacific Properties",
    messages: [
      "I need help automating my customer service. I get SO many repetitive questions about properties",
      "Could a chatbot handle questions about pricing, availability, neighborhoods?",
      "I'm interested. Lisa@PacificPropertiesHI.com - send me some case studies?"
    ]
  },

  // QUALIFIED LEAD 1: Coffee Shop
  {
    name: "James - Kona Koffee",
    messages: [
      "We have a loyalty program but everything is manual. We want to automate email marketing based on customer purchases",
      "We have 2,000 customers across 3 locations. What's involved in setting this up?",
      "Let's talk. james@konakoffee.com"
    ]
  },

  // QUALIFIED LEAD 2: Catering
  {
    name: "Keiko - Maui Catering Co",
    messages: [
      "I run a catering company. Our inventory tracking is a problem - Google Sheets isn't cutting it",
      "We do 30-40 events monthly. How would automation work for tracking food inventory?",
      "That sounds like what my business needs. keiko@mauicatering.com"
    ]
  },

  // COLD LEAD 1: Surf Shop
  {
    name: "Jake - North Shore Surf",
    messages: [
      "What kind of AI stuff do you do?",
      "Interesting, but we're pretty small. Not sure we need this yet"
    ]
  },

  // COLD LEAD 2: Yoga Studio
  {
    name: "Amy - Aloha Yoga",
    messages: [
      "How much does a chatbot cost?",
      "That's too expensive. Do you have any free trials?",
      "Nah, I'll think about it. Thanks though"
    ]
  }
];

async function simulateConversation(conversation, index) {
  console.log(`\n[${index + 1}/8] ${conversation.name}`);

  const sessionId = `sample_${Date.now()}_${index}`;

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
        console.log(`  ✅ Message ${i + 1}/${conversation.messages.length}`);
        if (data.emailCaptured) console.log('     📧 Email captured');
        if (data.escalationRequested) console.log('     🔥 Demo requested');
      } else {
        console.error(`  ❌ Error: ${data.error}`);
      }

      // Wait 800ms between messages
      if (i < conversation.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      break;
    }
  }

  // Wait 1.5s between conversations to avoid rate limiting
  if (index < conversations.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
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
  console.log('🔍 Checking server...');

  if (!await checkServer()) {
    console.error('\n❌ Server not running on http://localhost:3000');
    console.log('💡 Start with: npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Server running!\n');
  console.log('📊 Populating with sample leads...');
  console.log('   - 2 hot leads');
  console.log('   - 2 warm leads');
  console.log('   - 2 qualified leads');
  console.log('   - 2 cold leads');

  const startTime = Date.now();

  for (let i = 0; i < conversations.length; i++) {
    await simulateConversation(conversations[i], i);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ Complete!');
  console.log(`📊 Processed 8 conversations in ${duration}s`);
  console.log('\n📈 View analytics:');
  console.log('   http://localhost:3000/admin');
  console.log('   http://localhost:3000/stats\n');
})();
