const { Client } = require('@hubspot/api-client');
require('dotenv').config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

// Email templates with compelling copy
const emailTemplates = {
  welcomeEmail: {
    name: 'AI Chatbot Lead - Immediate Welcome',
    subject: '{{contact.firstname}}, let\'s turn those hours into revenue 🚀',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>Thanks for chatting with our AI assistant! I'm Reno, and I noticed you're looking for ways to {{#if contact.ai_work_type}}automate {{contact.ai_work_type}}{{else}}save time and grow your business{{/if}}.</p>

      <p><strong>Here's what caught my attention:</strong></p>
      <ul>
        {{#if contact.ai_hours_per_week}}<li>You're spending <strong>{{contact.ai_hours_per_week}} hours/week</strong> on manual work</li>{{/if}}
        {{#if contact.ai_annual_savings}}<li>Potential savings: <strong>\${{contact.ai_annual_savings}}/year</strong></li>{{/if}}
        {{#if contact.ai_roi_percentage}}<li>Estimated ROI: <strong>{{contact.ai_roi_percentage}}%</strong></li>{{/if}}
      </ul>

      <p>Most Hawaii businesses we work with see results in the first 30 days:</p>
      <ul>
        <li>✅ 10-20 hours saved per week</li>
        <li>✅ 35% boost in operational efficiency</li>
        <li>✅ 42% average first-year revenue growth</li>
      </ul>

      <p><strong>Ready to see what this looks like for your business?</strong></p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Book Your Free 30-Min Strategy Call</a></p>

      <p>No sales pressure. Just real talk about what's possible for your business.</p>

      <p>E komo mai (welcome),<br>
      Reno Provine<br>
      Founder, LeniLani Consulting<br>
      📞 (808) 766-1164</p>

      <p style="font-size: 12px; color: #666;">P.S. — We're kama'aina owned and work exclusively with Hawaii small businesses. Enterprise solutions at island-appropriate pricing.</p>
    `
  },

  highPriorityAlert: {
    name: 'AI Chatbot - High Priority Lead Fast Track',
    subject: '{{contact.firstname}}, I\'m clearing my calendar for you',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>I just reviewed your conversation with our AI assistant, and I wanted to reach out personally.</p>

      <p>Based on what you shared{{#if contact.ai_work_type}} about {{contact.ai_work_type}}{{/if}}, I think we can make a <em>significant</em> impact on your business — fast.</p>

      {{#if contact.ai_annual_savings}}
      <p><strong>Here's the opportunity I see:</strong><br>
      You mentioned challenges that are costing you roughly <strong>\${{contact.ai_annual_savings}}/year</strong>. Most of our clients eliminate 60-80% of that cost within 90 days.</p>
      {{/if}}

      <p><strong>What I'm proposing:</strong></p>

      <p>I'd like to personally walk you through exactly how we'd solve this for your business. Not generic solutions — a specific plan built around your needs.</p>

      <p>I'm holding three slots this week specifically for high-potential opportunities like yours:</p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Grab One of 3 Priority Slots →</a></p>

      <p><strong>On this call, you'll get:</strong></p>
      <ul>
        <li>📊 Custom ROI analysis for your specific situation</li>
        <li>🗺️ 90-day implementation roadmap</li>
        <li>💰 Exact pricing (no surprises, ever)</li>
        <li>⚡ Quick wins you can implement this week</li>
      </ul>

      <p>Most businesses we work with start seeing results within the first 30 days. One client saved 23 hours/week in their first month alone.</p>

      <p>Shall we explore what's possible?</p>

      <p>With aloha,<br>
      Reno Provine<br>
      Founder & Chief Technology Officer<br>
      LeniLani Consulting<br>
      📞 (808) 766-1164<br>
      📧 reno@lenilani.com</p>

      <p style="font-size: 12px; color: #666; border-left: 3px solid #0ea5e9; padding-left: 12px; margin-top: 24px;">
      <strong>Why LeniLani?</strong><br>
      ✓ Former AWS engineer, local Hawaii roots<br>
      ✓ 35% avg efficiency gains, 42% avg revenue growth<br>
      ✓ Month-to-month (no long contracts)<br>
      ✓ Starting at $1,500/month vs. $12k+ for full-time CTO
      </p>
    `
  },

  aiChatbotNurture: {
    name: 'AI Chatbot Service - Value Nurture',
    subject: 'How {{company.name}} can answer 80% of inquiries automatically',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>Following up on your interest in AI chatbot solutions...</p>

      <p><strong>Quick question:</strong> What if 80% of your customer inquiries were answered instantly, 24/7, without hiring anyone?</p>

      <p>That's exactly what we built for a Hawaii tourism company last quarter:</p>

      <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Real Hawaii Business Results:</strong></p>
        <ul style="margin: 10px 0 0 0;">
          <li>Handles 500+ inquiries/day automatically</li>
          <li>Team saved 80 hours/week</li>
          <li>Response time: 24 hours → 30 seconds</li>
          <li>Customer satisfaction up 47%</li>
        </ul>
      </div>

      <p><strong>Your AI chatbot would:</strong></p>
      <ul>
        <li>🤖 Answer FAQs instantly (trained on YOUR business)</li>
        <li>📅 Book appointments automatically</li>
        <li>🎯 Qualify leads while you sleep</li>
        <li>📊 Push hot leads directly to HubSpot</li>
        <li>🌴 Speak with aloha (culturally aware for Hawaii market)</li>
      </ul>

      <p><strong>Investment:</strong> Starting at $1,500/month<br>
      <strong>ROI Timeline:</strong> Most clients break even in 45-60 days</p>

      <p>Want to see what this looks like for {{company.name}}?</p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Book a Free Demo Call</a></p>

      <p>I'll show you:</p>
      <ol>
        <li>Live demo of an AI chatbot in action</li>
        <li>Exact setup process (takes 2-3 weeks)</li>
        <li>Custom ROI calculator for your business</li>
      </ol>

      <p>Mahalo,<br>
      Reno<br>
      📞 (808) 766-1164</p>

      <p style="font-size: 12px; color: #666;">P.S. — Check out our own AI chatbot at <a href="https://ai-bot-special.lenilani.com">ai-bot-special.lenilani.com</a>. Yes, it's the one you chatted with. Pretty cool, right? 😉</p>
    `
  },

  businessIntelligenceNurture: {
    name: 'Business Intelligence - Value Nurture',
    subject: 'Stop drowning in spreadsheets, {{contact.firstname}}',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>I noticed you're interested in turning your data into actual insights.</p>

      <p>Let me guess: You have data scattered across multiple systems, you're manually pulling reports in Excel, and by the time you see the numbers, they're already outdated?</p>

      <p>You're not alone. 73% of Hawaii small businesses we talk to are sitting on goldmines of data but have no way to actually use it.</p>

      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>What changes with proper BI:</strong></p>
        <ul style="margin: 10px 0 0 0;">
          <li>📊 Real-time dashboards (not week-old Excel files)</li>
          <li>🎯 Spot trends before your competitors do</li>
          <li>⚡ Make decisions in minutes, not days</li>
          <li>💰 Average client finds $50k+ in hidden revenue</li>
        </ul>
      </div>

      <p><strong>Here's what we build:</strong></p>
      <ul>
        <li>Automated data pipelines (connects all your systems)</li>
        <li>Smart dashboards that update in real-time</li>
        <li>Custom alerts when numbers move</li>
        <li>Mobile access (check your business from the beach)</li>
      </ul>

      <p><strong>Recent Hawaii client example:</strong><br>
      Local retail chain was spending 15 hours/week manually compiling sales reports. We automated everything. Now they get real-time insights, spotted a trending product category, and increased revenue by 28% in that category alone.</p>

      <p><strong>Timeline:</strong> Most implementations done in 4-6 weeks<br>
      <strong>Investment:</strong> Starting at $1,500/month<br>
      <strong>ROI:</strong> Average payback in 2-3 months</p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Show Me What's Possible</a></p>

      <p>On the call, I'll show you:</p>
      <ol>
        <li>Live demo of real Hawaii business dashboards</li>
        <li>What your dashboard could look like</li>
        <li>Exact data sources we'd connect</li>
        <li>Quick wins you can implement immediately</li>
      </ol>

      <p>No obligation. Just real insights into what's possible.</p>

      <p>E komo mai,<br>
      Reno Provine<br>
      📞 (808) 766-1164</p>
    `
  },

  systemIntegrationNurture: {
    name: 'System Integration - Value Nurture',
    subject: 'Your systems should talk to each other, {{contact.firstname}}',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>You mentioned needing help with system integration and automation...</p>

      <p><strong>Let me paint a picture:</strong></p>

      <p>Right now, you're probably copying data between systems, manually updating records, and wondering why technology is making your life <em>harder</em> instead of easier.</p>

      <p>Sound familiar?</p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>What integration fixes:</strong></p>
        <ul style="margin: 10px 0 0 0;">
          <li>❌ No more manual data entry between systems</li>
          <li>❌ No more "which system has the right info?"</li>
          <li>❌ No more paying for tools you can't connect</li>
          <li>✅ Everything syncs automatically, 24/7</li>
        </ul>
      </div>

      <p><strong>Common integrations we build:</strong></p>
      <ul>
        <li>🔗 QuickBooks ↔ HubSpot (sales to accounting, automatic)</li>
        <li>🔗 Shopify ↔ Inventory System (real-time stock updates)</li>
        <li>🔗 Email ↔ CRM (never lose a lead again)</li>
        <li>🔗 Website Forms ↔ Multiple Systems (one form, multiple destinations)</li>
      </ul>

      <p><strong>Real Hawaii example:</strong><br>
      A local service business was manually entering customer data into 3 different systems. 4 hours every day. We integrated everything. Now it happens automatically. That's 20 hours/week back — worth about $40k/year in freed-up time.</p>

      <p><strong>Your situation{{#if contact.ai_hours_per_week}} (spending {{contact.ai_hours_per_week}} hours/week on manual work){{/if}}:</strong></p>

      <p>We can likely eliminate 70-90% of that manual work. Most integrations pay for themselves in the first 60 days.</p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Let's Map Your Integration Strategy</a></p>

      <p><strong>On this call:</strong></p>
      <ol>
        <li>Audit your current systems (what you have)</li>
        <li>Map the ideal flow (what you need)</li>
        <li>Show you exactly how we'd connect everything</li>
        <li>Give you 2-3 quick wins you can do yourself</li>
      </ol>

      <p>30 minutes. Zero pressure. Maximum value.</p>

      <p>Mahalo,<br>
      Reno<br>
      📞 (808) 766-1164</p>

      <p style="font-size: 12px; color: #666;">P.S. — Month-to-month engagements starting at $1,500/month. No long-term contracts. Ever.</p>
    `
  },

  fractionalCTONurture: {
    name: 'Fractional CTO - Value Nurture',
    subject: 'A CTO for $1,500/month? Yes, really.',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>I saw you're exploring Fractional CTO services for {{company.name}}.</p>

      <p>Smart move. Here's why:</p>

      <p>A full-time CTO in Hawaii costs $12,000-$18,000/month (salary + benefits). Plus, you're probably not big enough to keep them busy full-time anyway.</p>

      <p><strong>That's where fractional comes in.</strong></p>

      <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>What you get with LeniLani Fractional CTO:</strong></p>
        <ul style="margin: 10px 0 0 0;">
          <li>🎯 Technology strategy & roadmap</li>
          <li>🛡️ Vendor management (stop getting ripped off)</li>
          <li>📊 Make vs. buy decisions</li>
          <li>🚀 Implementation oversight</li>
          <li>💰 Tech budget optimization</li>
          <li>👥 Team guidance & hiring support</li>
        </ul>
      </div>

      <p><strong>Real Hawaii client story:</strong></p>

      <p>Local professional services firm was paying $8,500/month for a marketing automation platform they barely used. I reviewed their tech stack, found 3 redundant tools, and saved them $96,000/year. My fractional CTO service paid for itself in the first week.</p>

      <p><strong>What makes this different from consulting:</strong></p>

      <p>I don't just give you a report and disappear. I'm your ongoing strategic technology partner. Monthly strategy sessions, unlimited Slack/email access, vendor negotiations, emergency support.</p>

      <p>You get enterprise-level CTO thinking without the enterprise-level cost.</p>

      <p><strong>Investment:</strong> Starting at $1,500/month<br>
      <strong>Commitment:</strong> Month-to-month (cancel anytime)<br>
      <strong>ROI:</strong> Avg client saves 4-6x their monthly investment</p>

      <p><a href="https://meetings-na2.hubspot.com/reno" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Book Your Strategy Session</a></p>

      <p><strong>On this call, we'll:</strong></p>
      <ol>
        <li>Review your current tech situation</li>
        <li>Identify 3-5 immediate opportunities</li>
        <li>Map a 90-day technology roadmap</li>
        <li>Show you where you're likely overspending</li>
      </ol>

      <p>Most businesses walk away with at least one actionable insight worth thousands. Even if you don't hire me.</p>

      <p>With aloha,<br>
      Reno Provine<br>
      Former AWS Engineer | Local Hawaii Roots<br>
      📞 (808) 766-1164<br>
      📧 reno@lenilani.com</p>

      <p style="font-size: 12px; color: #666; border-left: 3px solid #8b5cf6; padding-left: 12px;">
      <strong>About me:</strong> 15+ years in enterprise tech, worked with AWS, now helping Hawaii small businesses get enterprise capabilities at island prices. Kama'aina owned, ohana operated.
      </p>
    `
  },

  reengagementEmail: {
    name: 'AI Chatbot Lead - Re-engagement',
    subject: '{{contact.firstname}}, did I lose you?',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>I haven't heard back from you since our AI assistant chat, so I wanted to check in.</p>

      <p><strong>Three possibilities:</strong></p>

      <ol>
        <li><strong>Bad timing.</strong> You're interested but swamped. (Totally get it.)</li>
        <li><strong>Wrong fit.</strong> What we offer doesn't match what you need. (No worries, happens.)</li>
        <li><strong>Need more info.</strong> You have questions I haven't answered yet. (Let's fix that.)</li>
      </ol>

      <p>If it's #1 or #3, I'd love to reconnect when it makes sense.</p>

      <p>If it's #2, no hard feelings — I'd actually appreciate knowing so I'm not bugging you.</p>

      <p><strong>Quick question:</strong> What's your biggest technology challenge right now?</p>

      <p>Just hit reply with one sentence. I promise to give you an honest answer about whether we can help or not.</p>

      <p>No sales pitch. No pressure. Just real talk.</p>

      <p>Mahalo,<br>
      Reno<br>
      📞 (808) 766-1164</p>

      <p style="font-size: 11px; color: #999; margin-top: 30px;">P.S. — If you're not interested, <a href="#">click here to opt out</a> and I won't bother you again. I respect your inbox.</p>
    `
  },

  meetingConfirmation: {
    name: 'Meeting Booked - Confirmation & Prep',
    subject: 'Your strategy call is confirmed — here\'s what to prep',
    htmlBody: `
      <p>Aloha {{contact.firstname}},</p>

      <p>🎉 Your strategy call is confirmed! Looking forward to connecting.</p>

      <p><strong>Meeting Details:</strong><br>
      📅 [Meeting Date/Time will be inserted by HubSpot]<br>
      ⏱️ 30 minutes<br>
      💻 Zoom link sent separately</p>

      <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
        <p style="margin: 0;"><strong>To make this super valuable for you, come prepared with:</strong></p>
        <ul style="margin: 10px 0 0 0;">
          <li>Your biggest technology frustration right now</li>
          <li>What success would look like 90 days from now</li>
          <li>Rough idea of your monthly tech budget</li>
          <li>Any systems/tools you're currently using</li>
        </ul>
      </div>

      <p><strong>What to expect on the call:</strong></p>
      <ul>
        <li>✅ Quick business overview (5 min)</li>
        <li>✅ Deep dive on your specific challenges (15 min)</li>
        <li>✅ Solutions roadmap & rough pricing (8 min)</li>
        <li>✅ Q&A and next steps (2 min)</li>
      </ul>

      <p><strong>I'll show up with:</strong></p>
      <ul>
        <li>Specific ideas based on your industry</li>
        <li>ROI calculations for your situation</li>
        <li>Examples from similar Hawaii businesses</li>
        <li>Honest assessment of what we can (and can't) do for you</li>
      </ul>

      <p><strong>One request:</strong> If something comes up and you need to reschedule, just <a href="[MEETING_LINK]">click here</a>. No explanation needed. I just appreciate the heads up.</p>

      <p>See you soon!</p>

      <p>E komo mai,<br>
      Reno Provine<br>
      📞 (808) 766-1164</p>

      <p style="font-size: 12px; color: #666; background: #fef3c7; padding: 12px; margin-top: 20px;">
      <strong>⚡ Quick Win:</strong> Before our call, <a href="https://www.lenilani.com">check out our website</a> to see recent client results and case studies. It'll give you ideas about what's possible for your business.
      </p>
    `
  }
};

console.log('📧 HubSpot Workflow Automation Builder');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function createWorkflows() {
  const results = {
    templatesCreated: [],
    workflowsCreated: [],
    errors: []
  };

  try {
    console.log('Step 1: Creating email templates...\n');

    // Note: HubSpot's Marketing Email API requires a Marketing Hub subscription
    // For now, we'll document the templates and provide instructions for manual creation

    console.log('📝 Email Templates Prepared:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    Object.entries(emailTemplates).forEach(([key, template]) => {
      console.log(`✅ ${template.name}`);
      console.log(`   Subject: ${template.subject}`);
      console.log('');
    });

    console.log('\n📋 WORKFLOW ARCHITECTURE:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const workflows = [
      {
        name: '🚀 Workflow 1: Immediate Welcome & Qualification',
        trigger: 'Contact created with source = "LeniLani AI Chatbot"',
        actions: [
          'Wait 2 minutes',
          'Send "Welcome Email" with personalized ROI data',
          'Wait 3 days',
          'If no meeting booked → Send service-specific nurture email',
          'Wait 4 days',
          'If still no engagement → Send re-engagement email'
        ]
      },
      {
        name: '⚡ Workflow 2: High Priority Fast Track',
        trigger: 'ai_lead_priority = "high"',
        actions: [
          'Send internal Slack notification to sales team',
          'Wait 30 minutes',
          'Send "High Priority Fast Track" email',
          'Create task for manual follow-up within 24 hours',
          'Wait 1 day',
          'If no response → Send personal video message',
          'Wait 2 days',
          'If still no response → Direct phone call task'
        ]
      },
      {
        name: '🤖 Workflow 3: AI Chatbot Nurture Sequence',
        trigger: 'ai_recommended_service = "ai_chatbot"',
        actions: [
          'Wait 2 days after initial contact',
          'Send "AI Chatbot Value Nurture" email',
          'Wait 5 days',
          'Send case study: Tourism Bot success story',
          'Wait 4 days',
          'Send ROI calculator tool',
          'Wait 7 days',
          'Send "Last chance to chat" re-engagement'
        ]
      },
      {
        name: '📊 Workflow 4: Business Intelligence Nurture',
        trigger: 'ai_recommended_service = "business_intelligence"',
        actions: [
          'Wait 2 days',
          'Send "BI Value Nurture" email',
          'Wait 5 days',
          'Send dashboard demo video',
          'Wait 4 days',
          'Send data audit offer',
          'Wait 7 days',
          'Send final value proposition'
        ]
      },
      {
        name: '🔗 Workflow 5: System Integration Nurture',
        trigger: 'ai_recommended_service = "system_integration"',
        actions: [
          'Wait 2 days',
          'Send "Integration Value Nurture" email',
          'Wait 5 days',
          'Send integration mapping guide',
          'Wait 4 days',
          'Send time-savings calculator',
          'Wait 7 days',
          'Send re-engagement offer'
        ]
      },
      {
        name: '👔 Workflow 6: Fractional CTO Nurture',
        trigger: 'ai_recommended_service = "fractional_cto"',
        actions: [
          'Wait 2 days',
          'Send "Fractional CTO Value" email',
          'Wait 5 days',
          'Send tech stack audit offer',
          'Wait 4 days',
          'Send cost savings calculator',
          'Wait 7 days',
          'Send competitive analysis: CTO vs. consultants'
        ]
      },
      {
        name: '💰 Workflow 7: High ROI Opportunity Alert',
        trigger: 'ai_annual_savings > 25000 OR ai_roi_percentage > 200',
        actions: [
          'Send immediate internal alert',
          'Create high-value opportunity deal',
          'Assign to senior sales rep',
          'Send personalized outreach within 2 hours',
          'Schedule follow-up tasks at 1 day, 3 days, 7 days'
        ]
      },
      {
        name: '📅 Workflow 8: Meeting Booked Follow-up',
        trigger: 'Meeting booked via HubSpot link',
        actions: [
          'Immediately send confirmation email with prep guide',
          'Wait until 1 day before meeting',
          'Send reminder email with Zoom link',
          'Wait until 1 hour before meeting',
          'Send SMS reminder (if phone number exists)',
          'After meeting: Wait 1 hour',
          'Send thank you email + proposal (if applicable)'
        ]
      },
      {
        name: '❄️ Workflow 9: Cold Lead Re-engagement',
        trigger: 'No activity for 14 days + never booked meeting',
        actions: [
          'Send "Did I lose you?" email',
          'Wait 5 days',
          'If opened but no reply → Send limited-time offer',
          'Wait 5 days',
          'If still no engagement → Send final "breakup" email',
          'If no response → Mark as "Not interested" and suppress from automation'
        ]
      },
      {
        name: '🎯 Workflow 10: Post-Meeting Conversion',
        trigger: 'Meeting completed + no deal created',
        actions: [
          'Wait 2 hours',
          'Send thank you + recap email',
          'Wait 1 day',
          'Send proposal/next steps',
          'Wait 3 days',
          'Send "Any questions?" check-in',
          'Wait 4 days',
          'Send social proof (testimonials)',
          'Wait 5 days',
          'Send final decision prompt'
        ]
      }
    ];

    workflows.forEach((workflow, index) => {
      console.log(`${workflow.name}`);
      console.log(`Trigger: ${workflow.trigger}`);
      console.log('Actions:');
      workflow.actions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });
      console.log('');
    });

    console.log('\n📊 WORKFLOW SUMMARY:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ ${Object.keys(emailTemplates).length} email templates prepared`);
    console.log(`✅ ${workflows.length} workflows mapped`);
    console.log('✅ Full nurture sequences for each service type');
    console.log('✅ High-priority lead fast-tracking');
    console.log('✅ ROI-based opportunity flagging');
    console.log('✅ Re-engagement sequences for cold leads');
    console.log('✅ Meeting preparation and follow-up automation');

    console.log('\n⚠️  IMPORTANT NOTES:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('HubSpot Workflows require Marketing Hub Professional or higher.');
    console.log('Email templates can be created manually in HubSpot using the content above.');
    console.log('\nTo implement these workflows:');
    console.log('1. Go to HubSpot → Automation → Workflows');
    console.log('2. Create each workflow using the triggers and actions listed');
    console.log('3. Create email templates in Marketing → Email → Templates');
    console.log('4. Link the email templates to the workflow actions');
    console.log('\nAll custom properties (ai_lead_score, ai_recommended_service, etc.)');
    console.log('are already created and can be used in workflow triggers and filters.');

    console.log('\n💾 SAVING EMAIL TEMPLATES TO FILE...\n');

    return {
      emailTemplates,
      workflows,
      summary: {
        totalTemplates: Object.keys(emailTemplates).length,
        totalWorkflows: workflows.length,
        requiredHubSpotTier: 'Marketing Hub Professional or higher'
      }
    };

  } catch (error) {
    console.error('❌ Error creating workflows:', error.message);
    results.errors.push(error.message);
    throw error;
  }
}

// Run the workflow builder
createWorkflows()
  .then((result) => {
    console.log('\n✅ Workflow automation blueprint created successfully!');
    console.log('\nNext steps:');
    console.log('1. Review the email template content above');
    console.log('2. Create email templates manually in HubSpot Marketing');
    console.log('3. Build workflows using the architecture provided');
    console.log('4. Test each workflow with a sample contact');

    // Save templates to file for easy reference
    const fs = require('fs');
    fs.writeFileSync(
      'hubspot-email-templates.json',
      JSON.stringify(result, null, 2)
    );
    console.log('\n📄 Email templates saved to: hubspot-email-templates.json');

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to create workflow blueprint:', error.message);
    process.exit(1);
  });
