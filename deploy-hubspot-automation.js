const { Client } = require('@hubspot/api-client');
require('dotenv').config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

console.log('🚀 LeniLani HubSpot Automation Deployment');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Email template configurations
const emailTemplates = [
  {
    id: 'welcome-email',
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
  {
    id: 'high-priority-alert',
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

      <p>With aloha,<br>
      Reno Provine<br>
      Founder & Chief Technology Officer<br>
      📞 (808) 766-1164</p>
    `
  }
];

// Workflow configurations using HubSpot API format
const workflows = [
  {
    name: '🚀 AI Chatbot - Immediate Welcome',
    enabled: true,
    type: 'CONTACT_BASED',
    description: 'Automatically welcome and qualify new AI chatbot leads',
    enrollmentCriteria: {
      filterBranches: [{
        filterBranchType: 'OR',
        filters: [{
          filterType: 'PROPERTY',
          property: 'hs_analytics_source',
          operation: {
            operator: 'IS_EQUAL_TO',
            value: 'LeniLani AI Chatbot'
          }
        }]
      }]
    },
    actions: [
      {
        type: 'DELAY',
        delayMillis: 120000 // 2 minutes
      },
      {
        type: 'SEND_EMAIL',
        emailTemplateId: 'welcome-email' // Will be replaced with actual ID
      },
      {
        type: 'DELAY',
        delayMillis: 259200000 // 3 days
      },
      {
        type: 'BRANCH',
        branches: [
          {
            condition: {
              filterType: 'PROPERTY',
              property: 'ai_recommended_service',
              operation: {
                operator: 'IS_EQUAL_TO',
                value: 'ai_chatbot'
              }
            },
            actions: [
              {
                type: 'SEND_EMAIL',
                emailTemplateId: 'ai-chatbot-nurture'
              }
            ]
          }
        ]
      }
    ]
  }
];

async function createEmailTemplate(template) {
  try {
    console.log(`📧 Creating email template: ${template.name}`);

    // Note: HubSpot's Marketing Email API requires specific format
    // This is a simplified version - actual implementation may need adjustment
    const emailData = {
      name: template.name,
      subject: template.subject,
      htmlBody: template.htmlBody,
      templateType: 'REGULAR_EMAIL'
    };

    // HubSpot API v3 for Marketing Emails
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: '/marketing/v3/emails',
      body: emailData
    });

    console.log(`   ✅ Created: ${template.name} (ID: ${response.id})`);
    return response.id;

  } catch (error) {
    if (error.statusCode === 403) {
      console.log(`   ⚠️  Marketing Hub required for email templates`);
      console.log(`   📝 Template documented for manual creation`);
      return null;
    }
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function createWorkflow(workflow) {
  try {
    console.log(`🔄 Creating workflow: ${workflow.name}`);

    // HubSpot Workflows API v4
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: '/automation/v4/workflows',
      body: workflow
    });

    console.log(`   ✅ Created: ${workflow.name} (ID: ${response.id})`);
    return response.id;

  } catch (error) {
    if (error.statusCode === 403) {
      console.log(`   ⚠️  Marketing Hub Professional required for workflows`);
      console.log(`   📝 Workflow documented for manual creation`);
      return null;
    }
    console.error(`   ❌ Error: ${error.message}`);
    throw error;
  }
}

async function deployAutomation() {
  const results = {
    emailTemplates: [],
    workflows: [],
    errors: []
  };

  console.log('Step 1: Verifying HubSpot API access...\n');

  try {
    // Verify API access
    const accountInfo = await hubspotClient.apiRequest({
      method: 'GET',
      path: '/account-info/v3/details'
    });

    console.log(`✅ Connected to HubSpot account: ${accountInfo.portalId}`);
    console.log(`   Hub tier: ${accountInfo.tier || 'Unknown'}\n`);

  } catch (error) {
    console.error('❌ Failed to connect to HubSpot API');
    console.error(`   Error: ${error.message}\n`);
    console.error('Please verify:');
    console.error('1. HUBSPOT_API_KEY is set in .env file');
    console.error('2. API key has proper scopes (contacts, automation, marketing)');
    console.error('3. API key is not expired\n');
    return results;
  }

  console.log('Step 2: Creating email templates...\n');

  for (const template of emailTemplates) {
    try {
      const templateId = await createEmailTemplate(template);
      if (templateId) {
        results.emailTemplates.push({ name: template.name, id: templateId });
      }
    } catch (error) {
      results.errors.push({ type: 'email', name: template.name, error: error.message });
    }
  }

  console.log('\nStep 3: Creating workflows...\n');

  for (const workflow of workflows) {
    try {
      const workflowId = await createWorkflow(workflow);
      if (workflowId) {
        results.workflows.push({ name: workflow.name, id: workflowId });
      }
    } catch (error) {
      results.errors.push({ type: 'workflow', name: workflow.name, error: error.message });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DEPLOYMENT SUMMARY\n');
  console.log(`✅ Email templates created: ${results.emailTemplates.length}`);
  console.log(`✅ Workflows created: ${results.workflows.length}`);
  console.log(`❌ Errors: ${results.errors.length}\n`);

  if (results.errors.length > 0) {
    console.log('⚠️  ERRORS ENCOUNTERED:\n');
    results.errors.forEach(err => {
      console.log(`   ${err.type}: ${err.name}`);
      console.log(`   → ${err.error}\n`);
    });
  }

  if (results.emailTemplates.length === 0 && results.workflows.length === 0) {
    console.log('⚠️  IMPORTANT NOTICE:\n');
    console.log('HubSpot Workflows and Marketing Emails require Marketing Hub Professional.');
    console.log('You have two options:\n');
    console.log('Option 1: Upgrade to Marketing Hub Professional');
    console.log('  - Full automation capabilities');
    console.log('  - Email templates');
    console.log('  - Advanced workflows\n');
    console.log('Option 2: Use Manual Setup (FREE)');
    console.log('  - Follow HUBSPOT-WORKFLOWS-GUIDE.md');
    console.log('  - Copy email templates from hubspot-email-templates.json');
    console.log('  - Create workflows manually in HubSpot UI\n');
    console.log('All content and architecture is ready - just needs manual setup in HubSpot.\n');
  }

  return results;
}

// Run deployment
deployAutomation()
  .then(results => {
    if (results.emailTemplates.length > 0 || results.workflows.length > 0) {
      console.log('🎉 SUCCESS! HubSpot automation deployed.\n');
      console.log('Next steps:');
      console.log('1. Test workflows with sample contacts');
      console.log('2. Monitor performance in HubSpot dashboard');
      console.log('3. Optimize based on open rates and conversions\n');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  });
