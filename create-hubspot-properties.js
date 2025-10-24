const { Client } = require('@hubspot/api-client');
require('dotenv').config();

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

async function createCustomProperties() {
  console.log('🔧 Creating custom properties in HubSpot...\n');

  const properties = [
    {
      name: 'ai_lead_score',
      label: 'AI Lead Score',
      type: 'number',
      fieldType: 'number',
      groupName: 'contactinformation',
      description: 'AI-calculated lead score based on conversation quality and engagement',
      options: []
    },
    {
      name: 'ai_lead_priority',
      label: 'AI Lead Priority',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'contactinformation',
      description: 'AI-determined priority level for this lead',
      options: [
        { label: 'High', value: 'high', displayOrder: 0, hidden: false },
        { label: 'Medium', value: 'medium', displayOrder: 1, hidden: false },
        { label: 'Low', value: 'low', displayOrder: 2, hidden: false }
      ]
    },
    {
      name: 'ai_recommended_service',
      label: 'AI Recommended Service',
      type: 'enumeration',
      fieldType: 'select',
      groupName: 'contactinformation',
      description: 'Service recommended by AI based on conversation analysis',
      options: [
        { label: 'AI Chatbot Development', value: 'ai_chatbot', displayOrder: 0, hidden: false },
        { label: 'Business Intelligence & Analytics', value: 'business_intelligence', displayOrder: 1, hidden: false },
        { label: 'System Integration & Automation', value: 'system_integration', displayOrder: 2, hidden: false },
        { label: 'Fractional CTO Services', value: 'fractional_cto', displayOrder: 3, hidden: false },
        { label: 'Marketing Automation', value: 'marketing_automation', displayOrder: 4, hidden: false },
        { label: 'Custom Software Development', value: 'custom_software', displayOrder: 5, hidden: false }
      ]
    },
    {
      name: 'ai_annual_savings',
      label: 'AI Estimated Annual Savings',
      type: 'number',
      fieldType: 'number',
      groupName: 'contactinformation',
      description: 'AI-calculated potential annual savings in dollars',
      options: []
    },
    {
      name: 'ai_roi_percentage',
      label: 'AI ROI Percentage',
      type: 'number',
      fieldType: 'number',
      groupName: 'contactinformation',
      description: 'AI-calculated ROI percentage based on conversation data',
      options: []
    },
    {
      name: 'ai_hours_per_week',
      label: 'AI Hours Per Week (Manual Work)',
      type: 'number',
      fieldType: 'number',
      groupName: 'contactinformation',
      description: 'Hours per week spent on manual work that could be automated',
      options: []
    },
    {
      name: 'ai_work_type',
      label: 'AI Work Type',
      type: 'string',
      fieldType: 'text',
      groupName: 'contactinformation',
      description: 'Type of work the prospect is doing that could be automated',
      options: []
    }
  ];

  const results = {
    created: [],
    alreadyExists: [],
    errors: []
  };

  for (const property of properties) {
    try {
      console.log(`Creating property: ${property.name} (${property.label})...`);

      const response = await hubspotClient.crm.properties.coreApi.create(
        'contacts',
        property
      );

      results.created.push(property.name);
      console.log(`  ✅ Created: ${property.label}`);

    } catch (error) {
      if (error.statusCode === 409) {
        // Property already exists
        results.alreadyExists.push(property.name);
        console.log(`  ℹ️  Already exists: ${property.label}`);
      } else {
        results.errors.push({ property: property.name, error: error.message });
        console.error(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary:');
  console.log(`  ✅ Created: ${results.created.length}`);
  console.log(`  ℹ️  Already existed: ${results.alreadyExists.length}`);
  console.log(`  ❌ Errors: ${results.errors.length}`);

  if (results.created.length > 0) {
    console.log('\n🎉 Success! Custom properties created in HubSpot.');
    console.log('   You can now uncomment the custom property code in index.js');
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Some properties failed to create:');
    results.errors.forEach(e => console.log(`   - ${e.property}: ${e.error}`));
  }

  return results;
}

// Run the script
createCustomProperties()
  .then(results => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
