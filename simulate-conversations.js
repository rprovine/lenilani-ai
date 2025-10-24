/**
 * Simulate 16 realistic Hawaii business conversations to populate analytics
 * Includes hot, warm, qualified, and cold leads across various industries
 * Run with: node simulate-conversations.js
 */

const conversations = [
  // Conversation 1: Poke Restaurant - Warm Lead
  {
    name: "Sarah - Ono Poke Bowl",
    messages: [
      "Aloha! We run a poke restaurant and I'm spending 3-4 hours every day updating spreadsheets for inventory and orders. There has to be a better way?",
      "How much time could this actually save us?",
      "That sounds amazing. My email is sarah@onopoke.com - can you send me more info?",
      "Actually, can I just schedule a call to discuss this?"
    ]
  },

  // Conversation 2: Tourist Activity - Hot Lead
  {
    name: "Mike - Hawaii Adventure Tours",
    messages: [
      "I'm the owner of a tour company with 12 employees. We're losing money tracking bookings manually - this is a major problem and critical for my business",
      "We have 200 bookings monthly and this is costing us serious time. We're desperate to fix this immediately and can afford to invest",
      "I'd like to move on this right away. Mike@HawaiiAdventureTours.com",
      "Yeah, let's schedule a demo this week"
    ]
  },

  // Conversation 3: Surf Shop - Cold Lead
  {
    name: "Jake - North Shore Surf",
    messages: [
      "What kind of AI stuff do you do?",
      "Interesting, but we're pretty small. Not sure we need this yet",
      "Nah, we're good for now. Just looking around. Mahalo!"
    ]
  },

  // Conversation 4: Real Estate - Warm Lead + Demo
  {
    name: "Lisa - Pacific Properties",
    messages: [
      "I need help automating my customer service. I get SO many repetitive questions about properties",
      "Could a chatbot handle questions about pricing, availability, neighborhoods?",
      "How fast can you build something like this?",
      "I'm interested. Lisa@PacificPropertiesHI.com - send me some case studies?",
      "Actually yes, let me book a time to chat about this"
    ]
  },

  // Conversation 5: Coffee Shop - Warm Lead
  {
    name: "James - Kona Koffee",
    messages: [
      "We have a loyalty program but everything is manual. We want to automate email marketing based on customer purchases",
      "We have 2,000 customers across 3 locations. Right now someone manually sends emails. So inefficient!",
      "12 hours a week... yeah that tracks. What's involved in setting this up?",
      "Let's talk. james@konakoffee.com"
    ]
  },

  // Conversation 6: Startup - Hot Lead + Phone
  {
    name: "Rachel - TechStartup Hawaii",
    messages: [
      "I'm the founder of a tech startup with 8 team members. We're losing money without proper tech guidance - investors keep asking and this is critical for my company",
      "This is urgent - we need strategic help immediately. We're desperate and can afford to invest in a fractional CTO right away",
      "Can we schedule a consultation this week? rachel@techstartuphawaii.com and my cell is 808-555-0123"
    ]
  },

  // Conversation 7: Restaurant - Pidgin + Qualified Lead
  {
    name: "Marcus - Da Kine Grill",
    messages: [
      "Eh, we get one big problem with our POS system and da kitchen display",
      "Shoots, can talk pidgin?",
      "Da ting always jam up, kitchen no can see da orders. We need one bettah system",
      "Das it! We need um. How much?",
      "K den, Marcus@DaKineGrill.com - send me info"
    ]
  },

  // Conversation 8: Hotel - Hot Lead + Demo
  {
    name: "David - Waikiki Beach Hotel",
    messages: [
      "I'm the owner of a boutique hotel with 20 employees. Our Excel reports are a major problem - this is costing us money and is critical for my business",
      "We're desperate for real-time data. This is urgent - I need to fix this immediately and can afford to invest in the right solution",
      "I want a demo ASAP this week. david@waikikibeachhotel.com",
      "Perfect, booking for next Tuesday!"
    ]
  },

  // Conversation 9: Yoga Studio - Cold Lead (Price Shopper)
  {
    name: "Amy - Aloha Yoga",
    messages: [
      "How much does a chatbot cost?",
      "Just give me a ballpark",
      "That's too expensive. What about just the cheapest option?",
      "Still too much. Do you have any free trials?",
      "Nah, I'll think about it. Thanks though"
    ]
  },

  // Conversation 10: Event Planning - Hot Lead + Phone + Urgency
  {
    name: "Jennifer - Island Events",
    messages: [
      "I'm the owner of an event planning company with 15 employees. We're losing money on disconnected systems - this is a critical major problem for my business",
      "We do 50 events yearly and are desperate. This is costing us serious money and I need to fix it immediately. I can afford to invest right away",
      "I want to move fast this week. jennifer@islandeventshawaii.com and 808-555-0199",
      "Perfect, booking for Thursday morning. This is urgent!"
    ]
  },

  // Conversation 11: Medical Clinic - Hot Lead + Compliance Urgency
  {
    name: "Dr. Patel - Aloha Family Medical",
    messages: [
      "I'm the owner of a family practice with 3 doctors and 15 employees. Our patient scheduling system is from the 90s and we're losing money because of it",
      "We get 150 patient appointments per week. This is costing us major problems - wasting 15+ hours weekly on manual scheduling",
      "That's over $40,000 per year lost? This is a critical issue. I need to fix this immediately",
      "This is urgent. I run my company and can invest in the right solution. My email is dr.patel@alohafamilymed.com and cell 808-555-0234",
      "Yes, I want to schedule a demo this week. We need this ASAP"
    ]
  },

  // Conversation 12: Law Firm - Warm Lead + Document Management
  {
    name: "Attorney Wong - Pacific Legal Group",
    messages: [
      "I'm a partner at a law firm with 12 employees. Our document management is costing us major problems - we have thousands of case files",
      "We're wasting 20 hours weekly just searching for files. This is critical for our business",
      "Can you build a system that handles this? I need to invest in the right solution soon",
      "That would be a game-changer. How complex is this and what's the budget range?",
      "I'd like to explore this. Send information to wong@pacificlegalgroup.com",
      "Actually, let me schedule a consultation this month to discuss our needs"
    ]
  },

  // Conversation 13: Catering Company - Qualified Lead + Inventory
  {
    name: "Keiko - Maui Catering Co",
    messages: [
      "I run a catering company with 8 team members. Our inventory tracking is a major problem - Google Sheets isn't cutting it",
      "We do 30-40 events monthly and this is costing us money from over-ordering and waste",
      "How would automation work for tracking food inventory and coordinating between kitchen and event sites?",
      "That sounds like what my business needs. What's the timeline and budget for this?",
      "Let me discuss with my partner, but I'm interested. keiko@mauicatering.com"
    ]
  },

  // Conversation 14: Construction Company - Hot Lead + Phone
  {
    name: "Tom - Island Builders",
    messages: [
      "I'm the owner of a construction company with 25 employees. We're losing money because project tracking is all manual - this is critical",
      "We have 8 active projects and my team is desperate for a better system. We're wasting hours daily on spreadsheets",
      "We need to track timelines, budgets, materials, labor - everything. This is costing us serious money and I need to fix it immediately",
      "How fast can you build this? I can afford to invest in the right solution",
      "I want to move on this right away. tom@islandbuilders.com and 808-555-0345",
      "Perfect, I'll book a call for this week. This is urgent for my company"
    ]
  },

  // Conversation 15: Spa & Wellness - Warm Lead + Customer Experience
  {
    name: "Leilani - Heavenly Spa Maui",
    messages: [
      "I run a day spa with 10 employees. Our booking system is outdated and clients complain - this is a major problem",
      "We get 200-300 bookings monthly. I need automated reminders and better integration. This is costing us time",
      "How much time could automation save my business? I'm ready to invest soon",
      "18 hours a week! That's costing us money. What's the budget range for this?",
      "I need numbers and a proposal. My email is leilani@heavenlyspamamaui.com",
      "Yes, let's schedule time this month to discuss in detail"
    ]
  },

  // Conversation 16: Retail Chain - Hot Lead + Multi-location
  {
    name: "Kevin - Hawaii Surf & Sport",
    messages: [
      "I'm the CEO and founder of a surf shop chain with 5 locations and 30 employees. Our inventory is costing us major problems",
      "We're a $3M/year company running on QuickBooks and Excel. This is critical - we're losing money from poor inventory management",
      "We're wasting 25 hours weekly on manual counts. Products get lost, we over-order - this is desperate. I need to fix it immediately",
      "That ROI is eye-opening. I run my business and can afford to invest in the right solution. What's involved?",
      "I'm ready to move right away. kevin@hawaiisurfandsport.com and 808-555-0456. Can we talk this week?",
      "Excellent, I'll book for this week. This is urgent!"
    ]
  }
];

// Simulate a single conversation
async function simulateConversation(conversation, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎭 Starting Conversation ${index + 1}: ${conversation.name}`);
  console.log('='.repeat(60));

  const sessionId = `sim_${Date.now()}_${index}`;

  for (let i = 0; i < conversation.messages.length; i++) {
    const message = conversation.messages[i];

    console.log(`\n[${i + 1}/${conversation.messages.length}] User: ${message.substring(0, 80)}${message.length > 80 ? '...' : ''}`);

    try {
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Bot: ${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}`);

        // Log important events
        if (data.emailCaptured) console.log('   📧 Email captured!');
        if (data.phoneCaptured) console.log('   📞 Phone captured!');
        if (data.escalationRequested) console.log('   🔥 Escalation requested!');
        if (data.serviceRecommendation) console.log(`   🎯 Service: ${data.serviceRecommendation.service}`);
        if (data.roiCalculation) console.log(`   💰 ROI: $${data.roiCalculation.annualSavings}`);
        if (data.leadScore !== undefined) console.log(`   📊 Lead Score: ${data.leadScore}/100`);

      } else {
        console.error(`❌ Error: ${data.error || 'Unknown error'}`);
      }

      // Wait between messages to simulate realistic typing/thinking
      if (i < conversation.messages.length - 1) {
        const delay = 1000 + Math.random() * 1000; // 1-2 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error) {
      console.error(`❌ Network error: ${error.message}`);
      break;
    }
  }

  console.log(`\n✅ Conversation ${index + 1} complete!`);
}

// Run all conversations
async function runAllConversations() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting Conversation Simulation');
  console.log('📊 This will populate your analytics dashboard with realistic data');
  console.log('='.repeat(60));

  const startTime = Date.now();

  for (let i = 0; i < conversations.length; i++) {
    await simulateConversation(conversations[i], i);

    // Wait between conversations
    if (i < conversations.length - 1) {
      const delay = 2000 + Math.random() * 1000; // 2-3 seconds
      console.log(`\n⏳ Waiting ${(delay / 1000).toFixed(1)}s before next conversation...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SIMULATION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Processed ${conversations.length} conversations in ${duration} seconds`);
  console.log('\n📊 Check your analytics at:');
  console.log('   Admin Dashboard: http://localhost:3000/admin');
  console.log('   Public Stats:    http://localhost:3000/stats');
  console.log('\n💡 Tip: The dashboards auto-refresh every 30 seconds');
  console.log('='.repeat(60) + '\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/');
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main execution
(async () => {
  console.log('🔍 Checking if server is running...');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.error('\n❌ Error: Server is not running on http://localhost:3000');
    console.log('💡 Please start the server first with: npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Server is running!\n');

  await runAllConversations();
})();
