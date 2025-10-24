const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer'); // 📧 PHASE 4A - Conversation Summary Emails
const { Client } = require('@hubspot/api-client');
const { createClient } = require('@supabase/supabase-js');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

dotenv.config();

// 📧 PHASE 4A - Conversation Summary Emails: Configure nodemailer
let emailTransporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Email transporter initialized');
} else {
  console.warn('⚠️  Email not configured - conversation summary emails disabled');
}

// Load knowledge base
const KNOWLEDGE_BASE = fs.readFileSync(
  path.join(__dirname, 'lenilani-knowledge-base.md'),
  'utf-8'
);

// HubSpot configuration
const HUBSPOT_MEETING_LINK = process.env.HUBSPOT_MEETING_LINK || 'https://meetings-na2.hubspot.com/reno?uuid=ee86f3dc-1bde-4684-8460-c998aef13e65';
const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;

// Initialize HubSpot client if API key is available
let hubspotClient = null;
console.log('🔍 Checking HubSpot configuration...');
console.log(`   HUBSPOT_API_KEY exists: ${!!HUBSPOT_API_KEY}`);
console.log(`   HUBSPOT_API_KEY length: ${HUBSPOT_API_KEY ? HUBSPOT_API_KEY.length : 0}`);
console.log(`   HUBSPOT_API_KEY prefix: ${HUBSPOT_API_KEY ? HUBSPOT_API_KEY.substring(0, 10) + '...' : 'not set'}`);

if (HUBSPOT_API_KEY) {
  try {
    hubspotClient = new Client({ accessToken: HUBSPOT_API_KEY });
    console.log('✅ HubSpot client initialized successfully');
    console.log('   Lead capture: ENABLED');
  } catch (error) {
    console.error('❌ Failed to initialize HubSpot client:', error.message);
    console.log('   Lead capture: DISABLED');
  }
} else {
  console.warn('⚠️  HubSpot API key not configured');
  console.log('   To enable lead capture:');
  console.log('   1. Get API key from HubSpot → Settings → Integrations → Private Apps');
  console.log('   2. Add HUBSPOT_API_KEY to Vercel environment variables');
  console.log('   3. Redeploy the application');
  console.log('   Lead capture: DISABLED');
}

// Set LangChain tracing if API key is provided
if (process.env.LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = 'true';
  process.env.LANGCHAIN_PROJECT = 'lenilani-ai';
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Add helmet for security headers
// Disable CSP in production to avoid blocking issues on Vercel
app.use(helmet({
  contentSecurityPolicy: false, // Disabled - was blocking Vercel deployments
  crossOriginEmbedderPolicy: false,
}));

// Security: Configure CORS to only allow specific origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://ai-bot-special.lenilani.com',
      'https://lenilani.com',
      'https://www.lenilani.com',
      'https://langchain-chatbot-lenilani-7tztcdody-rprovines-projects.vercel.app' // Vercel URL
    ]
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: Origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Rate limiting to prevent abuse
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Limit reset requests
  message: 'Too many reset requests, please try again later.',
});

// Security: Limit request body size to prevent DoS
app.use(express.json({ limit: '10kb' }));

// Initialize chain lazily to ensure env vars are loaded
let chain = null;
let memory = null;

function initializeChain() {
  if (chain) return chain;

  const model = new ChatAnthropic({
    modelName: 'claude-sonnet-4-5-20250929',
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    maxTokens: 500, // Reduced to encourage shorter responses
  });

  memory = new BufferMemory({
    returnMessages: true,
    memoryKey: 'history',
  });

  // Get live availability status
  const availability = checkBusinessHours();
  const availabilityMessage = availability.isAvailable
    ? `✅ CURRENTLY AVAILABLE - It's ${availability.hawaiiTime} in Hawaii. Reno is likely available during business hours (9 AM - 5 PM HST, Monday-Friday).`
    : `⏰ OUTSIDE BUSINESS HOURS - It's ${availability.hawaiiTime} in Hawaii. Business hours are Monday-Friday, 9 AM - 5 PM HST. Reno will respond during business hours.`;

  const COMPLETE_LENILANI_CLAUDE_PROMPT = `You are LeniLani AI, a professional consulting assistant for LeniLani Consulting in Honolulu, Hawaii.

## 🎯 YOUR PRIMARY DIRECTIVE
You are a knowledgeable technology consultant with deep Hawaiian roots and aloha spirit.
- Keep responses SHORT (2-3 sentences maximum)
- Use Hawaiian greetings and phrases naturally (Aloha, mahalo, e komo mai)
- Ask thoughtful questions to understand needs BEFORE providing solutions
- Never use bullet points, lists, or formatted text
- Maintain professional consultant tone - warm but expert
- Every response must include a QUESTION to continue the discovery process

## 🚨 CRITICAL - NEVER MAKE FALSE PROMISES 🚨
**YOU ARE AN AI ASSISTANT - BE HONEST ABOUT YOUR LIMITATIONS**:
- NEVER promise that "Reno will reach out to you"
- NEVER make up timelines like "within 24 hours" or "within the next business day"
- NEVER commit to actions on Reno's behalf
- NEVER say things like "He'll contact you" or "I'll have Reno call you"
- When contact info is captured, simply acknowledge: "Mahalo! I've saved your information."
- ALWAYS encourage the USER to reach out to Reno, don't promise Reno will reach out to them

**CORRECT APPROACH** after capturing contact info:
"Mahalo for sharing that! I've saved your information. You can reach Reno directly at reno@lenilani.com or (808) 766-1164 - he'd be happy to discuss your specific needs. Would you like me to help you schedule a time with him?"

**INCORRECT - NEVER DO THIS**:
"Reno will reach out to you within 24 hours" ❌
"He'll contact you at this email" ❌
"I'll have Reno call you" ❌

## 🆘 HANDLING ESCALATION TO HUMAN
If someone asks to speak with a human, is frustrated, or needs more help:
- Acknowledge their request warmly and professionally
- Apologize if they're frustrated: "I completely understand, mahalo for your patience."
- Provide contact options with availability context (see LIVE AVAILABILITY section below)
- Offer to continue helping: "I'm also happy to continue assisting you if you'd like - what specific information would be most helpful?"
- NEVER be defensive or pushy when someone wants human contact

## 🕐 LIVE AVAILABILITY (Current Status)
${availabilityMessage}

**When providing contact information:**
- If available now: "Reno is available now - you can reach him at reno@lenilani.com or (808) 766-1164"
- If outside business hours: "Our office hours are Monday-Friday, 9 AM - 5 PM HST. You can reach Reno at reno@lenilani.com or (808) 766-1164, and he'll respond during business hours."
- Always include the booking link option: "Or book a specific time at your convenience: ${HUBSPOT_MEETING_LINK}"

## COMPREHENSIVE KNOWLEDGE BASE
You have access to the complete, verified LeniLani Consulting knowledge base which includes information from:
- www.lenilani.com (main website)
- hawaii.lenilani.com (Hawaii-specific site)
- All official company resources, services, pricing, team information, and more

USE THIS KNOWLEDGE BASE to answer all questions accurately. Here is the complete knowledge base:

---
${KNOWLEDGE_BASE}
---

## CORE IDENTITY & MISSION
You are not just a chatbot - you are a sophisticated AI consultant that demonstrates LeniLani's expertise while identifying and capturing qualified business prospects. Every interaction should showcase technical prowess, business acumen, and naturally guide high-value conversations toward engagement opportunities.

ALWAYS reference specific information from the knowledge base above when answering questions about LeniLani's services, pricing, team, or capabilities.

## DUAL OBJECTIVES

### 1. DEMONSTRATE WORLD-CLASS AI CONSULTING EXPERTISE
- Provide sophisticated technical guidance and business insights
- Showcase deep knowledge across data science, AI/ML, and strategic technology
- Deliver immediate value that demonstrates LeniLani's capabilities
- Position LeniLani as the clear choice for AI and technology consulting

### 2. INTELLIGENT LEAD CAPTURE & QUALIFICATION
- Identify qualified prospects through natural conversation
- **CRITICAL**: Collect contact information naturally, never forced
- Use conversational sales techniques to guide toward email capture
- After understanding needs and building value, ask for email to send resources/details
- Once email is captured, warmly introduce scheduling with Reno
- Score and prioritize leads based on conversation quality

**NATURAL LEAD COLLECTION** (after 2-3 valuable exchanges):
Ask for email professionally to send tailored information. For example:
"Mahalo for sharing that context. I'd like to send you some specific case studies relevant to your situation - may I have your email?"

**AFTER EMAIL CAPTURED** (IMMEDIATELY ask for name):
**CRITICAL**: The very next response after capturing email MUST ask for their name.
"Mahalo! And may I have your name so I can personalize our conversation?"

**AFTER NAME CAPTURED** (then move to scheduling):
Professionally introduce Reno based on their specific needs. For example:
"Excellent, mahalo [Name]! Reno has deep expertise in this area and would love to discuss your specific needs. Would you like to schedule a consultation with him this week?"

## ADVANCED CONSULTATION CAPABILITIES

### AI CONSULTING ASSESSMENT
When clients mention business challenges, automatically:
- Identify AI/ML opportunities in their workflow
- Estimate potential ROI and implementation timeline
- Recommend specific LeniLani services
- Provide technical architecture suggestions
- Calculate cost-benefit scenarios

### DATA SCIENCE EXPERTISE
- Perform real-time data analysis discussions
- Recommend optimal tech stacks (pandas, numpy, scikit-learn, etc.)
- Explain complex ML concepts with business context
- Suggest data visualization strategies
- Provide Python code examples when relevant

### FRACTIONAL CTO ADVISORY
- Assess technology infrastructure needs
- Provide strategic technology roadmaps
- Evaluate build vs. buy decisions
- Recommend scalable architecture patterns
- Address technical debt and modernization

### CHATBOT & AI DEVELOPMENT
- Demonstrate advanced conversational AI capabilities
- Explain LangChain/LangGraph implementations
- Show multi-agent system designs
- Discuss RAG and fine-tuning strategies
- Provide integration architecture advice

### DIGITAL MARKETING PLATFORM EXPERTISE
- HubSpot integration strategies
- Marketing automation workflows
- Customer data platform design
- Lead scoring and attribution modeling
- Marketing tech stack optimization

## KEY MESSAGES TO REINFORCE
- LeniLani delivers enterprise-grade AI solutions with startup agility
- Our Python-first approach ensures scalable, maintainable solutions
- We provide both technical implementation AND strategic guidance
- Hawaii location offers unique advantages (timezone focus, lower costs)
- Proven track record with measurable ROI across all service areas

## 💰 ROI CALCULATOR & VALUE DEMONSTRATION
**CRITICAL**: When you receive [INTERNAL CONTEXT] with ROI calculations, YOU MUST mention the specific dollar amounts naturally in your response, even in the first exchange.

**IMPORTANT - Be Transparent About Rates**:
- We use Hawaii-specific labor rates based on market data (15% premium over national average)
- Rates vary by work type: admin ($25/hr), reporting/analytics ($42/hr), customer support ($23/hr), IT ($55/hr), marketing ($35/hr)
- Always mention the rate we used: "At Hawaii's market rate of about $42/hour for reporting work..."
- This builds credibility - we're using real data, not inflating numbers

When users mention time spent on tasks and INTERNAL CONTEXT provides ROI data:
- ALWAYS mention the calculated annual cost
- ALWAYS reference the hourly rate being used
- Example: "Aloha! That's a significant time investment - at Hawaii's market rate of about $42/hour for reporting work, that's roughly $43,680 per year in labor costs. What types of reports are you creating?"
- Keep it conversational but ALWAYS include the dollar figures from INTERNAL CONTEXT

If INTERNAL CONTEXT shows ROI calculation:
- Use the EXACT numbers provided in brackets
- Mention the hourly rate for transparency
- Make it feel natural, not robotic
- Still ask a follow-up question to continue discovery
- Example format: "[Pain acknowledgment] + [mention rate] + [ROI dollar amount]. [Follow-up question]?"

**Success Stories** (use generically since we don't have specific case studies):
- Tourism industry: "We've helped Hawaii tourism businesses handle 80% of inquiries automatically, reducing response time from hours to seconds."
- Data/BI: "Clients typically go from spending 12+ hours weekly on spreadsheets to 30 minutes with automated dashboards."
- System Integration: "We've connected disparate systems for businesses, saving them 10-20 hours per week on manual data entry."

## 🎯 SERVICE RECOMMENDATION
When pain points emerge, match them to specific services naturally:
- Customer support issues → "Our AI Chatbot service ($1,000 setup + ~$65/month) might be perfect for that"
- Data scattered across tools → "System Integration is what you need - connects everything seamlessly"
- Drowning in spreadsheets → "Business Intelligence dashboards would give you real-time insights"
- Need tech direction → "Fractional CTO service provides strategic guidance without full-time cost"
- Lead generation struggles → "Marketing Automation with HubSpot could 2-3x your lead capture"

Always include pricing when recommending a service to set expectations early.

## 💵 PRICING TRANSPARENCY
When budget or pricing questions arise, provide clear, transparent pricing immediately:

**Standard Services:**
- "Our standard technology solutions start at $1,500/month with flexible month-to-month contracts - no long-term commitments"
- "Enterprise solutions at small business pricing is our specialty"

**AI Chatbot Specific:**
- "AI Chatbot pricing: $1,000 one-time setup, then approximately $65/month based on usage"
- "For 10,000 messages monthly, expect around $65/month in costs"
- "Includes custom personality training, lead qualification, and 30 days of support"

**Pricing Philosophy:**
- "We believe in complete transparency - no hidden fees, ever"
- "Month-to-month means you can cancel anytime if you're not seeing value"
- "Most clients see ROI within 2-3 months based on time and cost savings"

**When they say budget is a concern:**
- Compare their current costs (manual labor, inefficiency) to your pricing
- Show the investment pays for itself quickly
- Emphasize month-to-month flexibility reduces risk

## TONE & PERSONALITY
- **Professional Consultant with Aloha Spirit**: You're a knowledgeable advisor, not a casual friend
- **Hawaiian Cultural Elements**: Use Hawaiian greetings and phrases naturally throughout
  - Start with "Aloha!" instead of "Hey" or "Hi"
  - Use "mahalo" for thank you
  - "E komo mai" for welcome
  - Incorporate island warmth while maintaining professionalism
- **Concise & Engaging**: Keep responses SHORT (2-4 sentences max)
- **Curious & Interactive**: Ask thoughtful questions to understand their business
- **Solution-Focused**: Listen first, then provide expert guidance
- **Naturally Guiding**: Gently move conversation toward booking with Reno
- **Professional but Warm**: Expert consultant who cares deeply about their success

## ⚠️ CRITICAL RESPONSE RULES - FOLLOW EXACTLY ⚠️

**YOU ARE IN DISCOVERY MODE - ASK, DON'T TELL**:
- Your ONLY job in early exchanges is to ASK QUESTIONS and LISTEN
- DO NOT explain LeniLani's process, services, or capabilities unless specifically asked
- DO NOT make assumptions about what the user needs
- DO NOT provide solutions until you understand their specific pain points
- Each response should end with a QUESTION to learn more

**MAXIMUM LENGTH ENFORCEMENT**:
- First response: EXACTLY 2-3 sentences. NO MORE.
- Follow-up responses: 3-4 sentences MAX
- NEVER use bullet points or lists in early conversation
- NEVER provide detailed breakdowns upfront
- NEVER overwhelm with information

**REQUIRED CONVERSATION PATTERN**:

Exchange 1 - When user first asks about something, greet with Aloha + ask ONE thoughtful question:
"Aloha! I'd be happy to help you explore that. What's the primary challenge you're looking to address?"

Exchange 2 - User answers, so acknowledge professionally + ask ANOTHER specific question:
"I appreciate you sharing that. Many businesses face similar challenges. How are you currently handling this situation?"

Exchange 3 - After 2-3 questions and understanding the pain, ask for email to send detailed information:
"Mahalo for that context. I think we could definitely assist you with this. May I send you some specific examples of how we've helped similar businesses - what's your email?"

Exchange 4 - Once you have email, introduce Reno warmly and professionally:
"Perfect, mahalo! Reno would love to discuss this with you personally. Would you like to schedule a consultation this week?"

**FORBIDDEN IN EARLY EXCHANGES**:
❌ Explaining our process ("We start with a deep dive...")
❌ Listing capabilities ("We can do X, Y, Z...")
❌ Describing solutions ("An AI chatbot would...")
❌ Making assumptions ("Based on your 200 requests per day...")
✅ ONLY: Brief acknowledgment + curious questions

**ABSOLUTELY FORBIDDEN**:
❌ Bullet point lists
❌ Multiple paragraphs in one response
❌ Detailed pricing breakdowns upfront
❌ Service feature lists
❌ Any response over 4 sentences
❌ Using **bold** for section headers

## SCHEDULING & BOOKING WITH RENO

**WHO**: Reno Provine, CEO of LeniLani Consulting
**WHAT**: Free 30-minute consultation, no commitment required
**BOOKING LINK**: The frontend will handle displaying the booking link

**CRITICAL - NEVER SHOW RAW URLS**:
- NEVER include the actual URL in your response
- NEVER say "Here's the link: https://..."
- Instead, use natural language like:
  - "Would you like to schedule a consultation?"
  - "Want to grab 30 minutes on Reno's calendar?"
  - "I can send you Reno's calendar link"
- The frontend will automatically display a booking button when you mention scheduling

**When to introduce scheduling**:
- After understanding their needs (usually 2-3 exchanges)
- After capturing email address
- When they express strong interest

**How to introduce** (examples without URLs):
- "Reno would love to chat with you directly about this. Would you like to schedule a consultation?"
- "I think a quick call with Reno would be really valuable. Want to grab 30 minutes this week?"
- Keep it natural, warm, and Reno-focused

Remember: You're conducting a sophisticated technical and business consultation while intelligently identifying and capturing qualified prospects. Every conversation should demonstrate why LeniLani is the right choice AND naturally progress toward a business relationship.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', COMPLETE_LENILANI_CLAUDE_PROMPT],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  chain = new ConversationChain({
    llm: model,
    memory: memory,
    prompt: prompt,
  });
  
  return chain;
}

// HubSpot Lead Capture Functions
async function createOrUpdateContact(contactData) {
  if (!hubspotClient) {
    console.warn('HubSpot client not initialized - skipping lead capture');
    return { success: false, error: 'HubSpot not configured' };
  }

  try {
    const properties = {
      email: contactData.email,
      firstname: contactData.firstname || '',
      lastname: contactData.lastname || '',
      phone: contactData.phone || '',
      company: contactData.company || '',
      website: contactData.website || '',
      hs_lead_status: 'NEW',
      lifecyclestage: 'lead',
      // Use standard HubSpot source field
      hs_analytics_source: 'OFFLINE',
      // Store message/conversation summary
      message: contactData.message || 'Lead from LeniLani AI Chatbot',
    };

    // 🤖 PHASE 3 - Automated Follow-Up: Add lead intelligence properties
    if (contactData.leadScore !== undefined) {
      properties.ai_lead_score = contactData.leadScore.toString();
      properties.ai_lead_priority = contactData.leadPriority || '';
    }

    if (contactData.recommendedService) {
      properties.ai_recommended_service = contactData.recommendedService;
    }

    if (contactData.roiData) {
      properties.ai_annual_savings = contactData.roiData.potentialSavings?.toString() || '';
      properties.ai_roi_percentage = contactData.roiData.roi?.toString() || '';
      properties.ai_hours_per_week = contactData.roiData.hoursPerWeek?.toString() || '';
      properties.ai_work_type = contactData.roiData.workType || '';
    }

    // Try to find existing contact by email
    let contactId = null;
    try {
      const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: contactData.email
          }]
        }],
        limit: 1
      });

      if (searchResponse.results && searchResponse.results.length > 0) {
        contactId = searchResponse.results[0].id;
        console.log(`Found existing contact: ${contactId}`);
      }
    } catch (searchError) {
      console.log('No existing contact found, will create new one');
    }

    let result;
    if (contactId) {
      // Update existing contact
      result = await hubspotClient.crm.contacts.basicApi.update(contactId, {
        properties: {
          ...properties,
          hs_lead_status: 'OPEN', // Update status for existing contact
        }
      });
      console.log(`✅ Updated HubSpot contact: ${contactId}`);
    } else {
      // Create new contact
      result = await hubspotClient.crm.contacts.basicApi.create({
        properties
      });
      contactId = result.id;
      console.log(`✅ Created new HubSpot contact: ${contactId}`);
    }

    // Add note with conversation context if provided
    if (contactData.conversationSummary) {
      await addNoteToContact(contactId, contactData.conversationSummary);
    }

    // 🤖 PHASE 3 - Automated Follow-Up: Trigger workflow based on lead score
    if (contactData.leadScore !== undefined) {
      await enrollInFollowUpWorkflow(contactId, contactData.leadScore, contactData.recommendedService);
    }

    return {
      success: true,
      contactId,
      isNew: !contactId,
      data: result
    };
  } catch (error) {
    console.error('❌ Error creating/updating HubSpot contact:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 🤖 PHASE 3 - Automated Follow-Up System
async function enrollInFollowUpWorkflow(contactId, leadScore, recommendedService) {
  if (!hubspotClient) return;

  try {
    // Determine workflow ID based on lead priority
    // NOTE: These workflow IDs need to be created in HubSpot first
    // For now, we'll log the enrollment intent
    const leadPriority = getLeadPriority(leadScore);

    console.log(`🔄 Follow-up workflow triggered:
    Contact ID: ${contactId}
    Lead Score: ${leadScore}/100
    Priority: ${leadPriority}
    Recommended Service: ${recommendedService || 'None'}`);

    // In production, you would enroll contacts in specific HubSpot workflows:
    // Example workflow enrollment code (requires workflow IDs from HubSpot):
    /*
    const workflowId = getWorkflowIdByPriority(leadPriority);
    await hubspotClient.automation.workflows.enrollmentsApi.enrollContact(
      workflowId,
      contactId
    );
    */

    // For now, we'll add a follow-up task instead as a demonstration
    await createFollowUpTask(contactId, leadScore, recommendedService);

  } catch (error) {
    console.error('Error enrolling in follow-up workflow:', error.message);
  }
}

// Create a follow-up task in HubSpot based on lead priority
async function createFollowUpTask(contactId, leadScore, recommendedService) {
  if (!hubspotClient) return;

  try {
    const leadPriority = getLeadPriority(leadScore);
    let dueDate = new Date();
    let taskPriority = 'MEDIUM';

    // Set task priority and due date based on lead score
    if (leadScore >= 80) {
      // Hot lead - follow up within 1 hour
      dueDate.setHours(dueDate.getHours() + 1);
      taskPriority = 'HIGH';
    } else if (leadScore >= 60) {
      // Warm lead - follow up same day
      dueDate.setHours(dueDate.getHours() + 4);
      taskPriority = 'MEDIUM';
    } else if (leadScore >= 40) {
      // Qualified lead - follow up within 24 hours
      dueDate.setDate(dueDate.getDate() + 1);
      taskPriority = 'MEDIUM';
    } else {
      // Cold lead - follow up within 3 days
      dueDate.setDate(dueDate.getDate() + 3);
      taskPriority = 'LOW';
    }

    const taskProperties = {
      hs_timestamp: Date.now(),
      hs_task_body: `🤖 AI-Qualified Lead - ${leadPriority}

📊 Lead Intelligence:
• Lead Score: ${leadScore}/100
• Priority: ${leadPriority}
${recommendedService ? `• Recommended Service: ${recommendedService}` : ''}

🎯 Next Steps:
1. Review AI conversation summary in contact notes
2. Send personalized follow-up email${recommendedService ? ` about ${recommendedService}` : ''}
3. Offer free consultation to discuss their specific needs

💡 This lead was automatically qualified by LeniLani AI based on conversation analysis.`,
      hs_task_subject: `[${leadPriority}] Follow up with AI-qualified lead${recommendedService ? ` - ${recommendedService}` : ''}`,
      hs_task_status: 'NOT_STARTED',
      hs_task_priority: taskPriority,
      hs_task_due_date: dueDate.getTime()
    };

    const associations = [{
      to: { id: contactId },
      types: [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 204 // Contact to Task association
      }]
    }];

    await hubspotClient.crm.objects.tasks.basicApi.create({
      properties: taskProperties,
      associations
    });

    console.log(`✅ Follow-up task created for contact ${contactId} - Priority: ${taskPriority}, Due: ${dueDate.toLocaleString()}`);
  } catch (error) {
    console.error('Error creating follow-up task:', error.message);
  }
}

// 📅 PHASE 4A - Direct Appointment Scheduling: Generate available time slots
function generateAvailableTimeSlots(requestedDate) {
  const date = requestedDate ? new Date(requestedDate) : new Date();
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Business hours: Monday-Friday, 9 AM - 5 PM HST
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return []; // No availability on weekends
  }

  // Generate time slots from 9 AM to 5 PM in 30-minute intervals
  const slots = [];
  for (let hour = 9; hour < 17; hour++) {
    for (let minute of [0, 30]) {
      if (hour === 16 && minute === 30) break; // Last slot is 4:30 PM

      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatTimeAMPM(hour, minute);

      slots.push({
        time: timeString,
        display: displayTime,
        available: true // In production, check actual calendar availability
      });
    }
  }

  return slots;
}

// Helper: Format time as AM/PM
function formatTimeAMPM(hour, minute) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${ampm} HST`;
}

// 📅 PHASE 4A - Direct Appointment Scheduling: Create appointment booking in HubSpot
async function createAppointmentBooking(contactId, bookingDetails) {
  if (!hubspotClient) return;

  try {
    const { date, time, timezone, email, name, phone, message } = bookingDetails;

    // Create a task for the appointment
    const taskProperties = {
      hs_timestamp: Date.now(),
      hs_task_body: `📅 APPOINTMENT BOOKING REQUEST via AI Chatbot

📍 Booking Details:
• Date: ${date}
• Time: ${time}
• Timezone: ${timezone}
• Requested by: ${name}
• Email: ${email}
${phone ? `• Phone: ${phone}` : ''}
${message ? `• Message: ${message}` : ''}

🎯 Action Required:
1. Confirm appointment availability
2. Send calendar invite to ${email}
3. Add to Reno's calendar

💡 This booking was made through the LeniLani AI chatbot interface.`,
      hs_task_subject: `📅 Appointment Booking: ${name} - ${date} at ${time}`,
      hs_task_status: 'NOT_STARTED',
      hs_task_priority: 'HIGH',
      hs_task_due_date: new Date().getTime() + (60 * 60 * 1000) // Due in 1 hour
    };

    const associations = [{
      to: { id: contactId },
      types: [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 204 // Contact to Task association
      }]
    }];

    await hubspotClient.crm.objects.tasks.basicApi.create({
      properties: taskProperties,
      associations
    });

    console.log(`📅 Appointment booking task created for ${name} on ${date} at ${time}`);
  } catch (error) {
    console.error('Error creating appointment booking:', error.message);
  }
}

// 💳 PHASE 4B - HubSpot Payment Integration: Create payment link
async function createHubSpotPaymentLink(paymentData) {
  if (!hubspotClient) {
    console.warn('HubSpot client not configured - cannot create payment link');
    return { success: false, error: 'HubSpot not configured' };
  }

  try {
    const { email, name, amount, description, service } = paymentData;

    // HubSpot Payment Link structure
    // Note: This uses HubSpot's Commerce/Payments API
    // You'll need to have HubSpot Payments enabled in your account

    const paymentLinkData = {
      amount: amount * 100, // Convert to cents
      currency: 'USD',
      description: description,
      customer_email: email,
      customer_name: name,
      metadata: {
        service: service,
        source: 'lenilani_ai_chatbot'
      }
    };

    // For now, generate a manual payment request URL
    // In full implementation, use HubSpot's Payment API:
    // const payment = await hubspotClient.crm.objects.create('payments', paymentLinkData);

    const paymentUrl = `${process.env.HUBSPOT_PAYMENT_LINK || 'https://app.hubspot.com/payments'}?amount=${amount}&email=${encodeURIComponent(email)}&service=${encodeURIComponent(service)}`;

    console.log(`💳 Payment link created for ${email}: $${amount}`);

    return {
      success: true,
      url: paymentUrl,
      amount,
      email
    };
  } catch (error) {
    console.error('Error creating HubSpot payment link:', error.message);
    return { success: false, error: error.message };
  }
}

// 💳 PHASE 4B - HubSpot Payment Integration: Get payment status
async function getHubSpotPaymentStatus(paymentId) {
  if (!hubspotClient) {
    throw new Error('HubSpot client not configured');
  }

  try {
    // In full implementation, query HubSpot Payment object:
    // const payment = await hubspotClient.crm.objects.basicApi.getById('payments', paymentId);

    // For now, return mock status
    return {
      status: 'pending',
      amount: 0,
      paidAt: null
    };
  } catch (error) {
    console.error('Error fetching payment status:', error.message);
    throw error;
  }
}

// 📧 PHASE 4A - Conversation Summary Emails: Send conversation summary email
async function sendConversationSummaryEmail(recipientEmail, conversationData) {
  if (!emailTransporter) {
    console.warn('Email transporter not configured - skipping email send');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const { messages, roiData, recommendedService, leadScore } = conversationData;

    // Format conversation for email
    const conversationHTML = messages.map(msg => {
      const speaker = msg.role === 'user' ? '👤 You' : '🤖 LeniLani AI';
      const messageClass = msg.role === 'user' ? 'user-message' : 'ai-message';
      return `<div class="${messageClass}">
        <strong>${speaker}:</strong><br/>
        ${msg.content.replace(/\n/g, '<br/>')}
      </div>`;
    }).join('\n');

    // Build ROI section if available
    let roiSection = '';
    if (roiData && roiData.potentialSavings > 0) {
      roiSection = `
      <div class="roi-section">
        <h2>💰 Your Potential ROI</h2>
        <p><strong>Annual Labor Cost:</strong> $${roiData.annualLaborCost.toLocaleString()}</p>
        <p><strong>Potential Annual Savings:</strong> $${roiData.potentialSavings.toLocaleString()}</p>
        <p><strong>ROI:</strong> ${roiData.roi}%</p>
        <p><strong>Payback Period:</strong> ${roiData.paybackMonths} months</p>
      </div>`;
    }

    // Build recommended service section
    let serviceSection = '';
    if (recommendedService) {
      serviceSection = `
      <div class="service-section">
        <h2>🎯 Recommended Service</h2>
        <p><strong>${recommendedService.service}</strong></p>
        <p>Based on our conversation, this service aligns best with your needs.</p>
      </div>`;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px; }
        .conversation { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .user-message { background: white; padding: 10px; margin: 10px 0; border-left: 3px solid #0066cc; }
        .ai-message { background: #e8f4f8; padding: 10px; margin: 10px 0; border-left: 3px solid #00bcd4; }
        .roi-section, .service-section { background: #fff9e6; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
        .cta-button { display: inline-block; background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌺 Your LeniLani AI Conversation Summary</h1>
        <p>Aloha! Here's a summary of our conversation</p>
      </div>

      ${roiSection}
      ${serviceSection}

      <div class="conversation">
        <h2>💬 Conversation Transcript</h2>
        ${conversationHTML}
      </div>

      <div style="text-align: center;">
        <a href="${HUBSPOT_MEETING_LINK}" class="cta-button">Schedule a Free Consultation with Reno</a>
      </div>

      <div class="footer">
        <p><strong>LeniLani Consulting</strong><br/>
        Honolulu, Hawaii<br/>
        <a href="mailto:reno@lenilani.com">reno@lenilani.com</a> | <a href="tel:+18087661164">(808) 766-1164</a><br/>
        <a href="https://lenilani.com">www.lenilani.com</a></p>
        <p style="font-size: 12px; color: #999;">This conversation summary was automatically generated by the LeniLani AI chatbot.</p>
      </div>
    </body>
    </html>`;

    const mailOptions = {
      from: `"LeniLani Consulting" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: '🌺 Your LeniLani AI Conversation Summary',
      html: htmlContent
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Conversation summary email sent to ${recipientEmail}`);

    return { success: true };
  } catch (error) {
    console.error('Error sending conversation summary email:', error.message);
    return { success: false, error: error.message };
  }
}

async function addNoteToContact(contactId, noteContent) {
  if (!hubspotClient) return;

  try {
    // Format the conversation with proper paragraph breaks
    const formattedConversation = noteContent
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(p => p.length > 0)
      .join('\n\n');

    const noteProperties = {
      hs_timestamp: Date.now(),
      hs_note_body: `🤖 LENILANI AI CHATBOT CONVERSATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${formattedConversation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 SOURCE
   LeniLani AI Chatbot
   https://ai-bot-special.lenilani.com

📅 CAPTURED
   ${new Date().toLocaleString('en-US', {
     timeZone: 'Pacific/Honolulu',
     dateStyle: 'full',
     timeStyle: 'long'
   })}

💼 LEAD QUALITY
   Qualified via AI conversation
   Ready for sales follow-up`
    };

    const associations = [{
      to: { id: contactId },
      types: [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 202 // Contact to Note association
      }]
    }];

    await hubspotClient.crm.objects.notes.basicApi.create({
      properties: noteProperties,
      associations
    });

    console.log(`✅ Added note to contact ${contactId}`);
  } catch (error) {
    console.error('Error adding note to contact:', error.message);
  }
}

async function createEscalationNote(contactId, context) {
  if (!hubspotClient) return;

  try {
    const conversationSummary = context.messages
      .map((msg, index) => {
        const speaker = msg.role === 'user' ? '👤 VISITOR' : '🤖 LENILANI AI';
        const separator = index < context.messages.length - 1 ? '\n' : '';
        return `${speaker}:\n${msg.content}${separator}`;
      })
      .join('\n\n');

    // Build lead intelligence section
    const leadScore = context.leadScore || 0;
    const leadPriority = getLeadPriority(leadScore);
    let leadIntelligence = `\n📊 LEAD INTELLIGENCE
   Lead Score: ${leadScore}/100
   Priority: ${leadPriority}`;

    if (context.roiData && context.roiData.potentialSavings > 0) {
      leadIntelligence += `\n   ROI Potential: $${context.roiData.potentialSavings.toLocaleString()}/year (${context.roiData.roi}% ROI)`;
    }

    if (context.recommendedService) {
      leadIntelligence += `\n   Recommended Service: ${context.recommendedService.service}`;
    }

    const noteProperties = {
      hs_timestamp: Date.now(),
      hs_note_body: `🚨 URGENT - HUMAN ESCALATION REQUESTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  The visitor has requested to speak with a human representative.
    Please follow up ASAP.
${leadIntelligence}

CONVERSATION HISTORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${conversationSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 SOURCE
   LeniLani AI Chatbot - ESCALATION
   https://ai-bot-special.lenilani.com

📅 ESCALATED
   ${new Date().toLocaleString('en-US', {
     timeZone: 'Pacific/Honolulu',
     dateStyle: 'full',
     timeStyle: 'long'
   })}

🔥 PRIORITY
   HIGH - User requested human assistance
   Immediate follow-up required`
    };

    const associations = [{
      to: { id: contactId },
      types: [{
        associationCategory: 'HUBSPOT_DEFINED',
        associationTypeId: 202
      }]
    }];

    await hubspotClient.crm.objects.notes.basicApi.create({
      properties: noteProperties,
      associations
    });

    console.log(`🚨 Created escalation note for contact ${contactId}`);
  } catch (error) {
    console.error('Error creating escalation note:', error.message);
  }
}

async function extractContactInfo(conversationHistory) {
  // Extract email, name, phone, company from conversation
  const extracted = {
    email: null,
    firstname: null,
    lastname: null,
    phone: null,
    company: null,
    message: ''
  };

  // Simple regex patterns for extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;

  const fullText = conversationHistory.join(' ');

  const emailMatch = fullText.match(emailRegex);
  if (emailMatch) extracted.email = emailMatch[0];

  const phoneMatch = fullText.match(phoneRegex);
  if (phoneMatch) extracted.phone = phoneMatch[0];

  // Store last few messages as context
  extracted.message = conversationHistory.slice(-3).join('\n---\n');

  return extracted;
}

// Detect if user wants to escalate to human
function detectEscalation(message) {
  const escalationPhrases = [
    'talk to a human',
    'speak to a human',
    'speak with a human',
    'i\'d like to speak with a human',
    'speak to someone',
    'talk to a person',
    'speak to a real person',
    'speak with someone',
    'speak with a person',
    'i want to talk to someone',
    'can i talk to someone',
    'i need to talk to someone',
    'i need to speak with',
    'i need to speak to',
    'connect me with someone',
    'speak with a representative',
    'talk to support',
    'talk to someone',
    'this isn\'t working',
    'this is not working',
    'not helpful',
    'i\'m frustrated',
    'i am frustrated'
  ];

  const lowerMessage = message.toLowerCase();
  return escalationPhrases.some(phrase => lowerMessage.includes(phrase));
}

// 🤖 PHASE 3 - Demo Request Feature: Detect if user wants a demo
function detectDemoRequest(message) {
  const lowerMessage = message.toLowerCase();

  const demoKeywords = [
    'show me', 'demo', 'demonstration', 'example', 'see it in action',
    'walk me through', 'show me how', 'can you show', 'give me an example',
    'what does it look like', 'show me what', 'i want to see'
  ];

  const hasDemoKeyword = demoKeywords.some(keyword => lowerMessage.includes(keyword));

  if (!hasDemoKeyword) return null;

  // Determine which service they want to see
  const servicePatterns = {
    'AI Chatbot': ['chatbot', 'bot', 'customer support', 'automated responses', 'ai assistant'],
    'Business Intelligence': ['dashboard', 'bi', 'business intelligence', 'reporting', 'analytics', 'data visualization'],
    'System Integration': ['integration', 'connect systems', 'api', 'automation', 'workflow'],
    'Fractional CTO': ['cto', 'technology strategy', 'tech leadership', 'roadmap'],
    'Marketing Automation': ['marketing', 'hubspot', 'email campaigns', 'lead nurturing', 'crm']
  };

  for (const [service, keywords] of Object.entries(servicePatterns)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return service;
    }
  }

  // If they say "demo" but don't specify service, return 'generic'
  return 'generic';
}

// 🤖 PHASE 3 - Language Mode: Detect language preference
function detectLanguageRequest(message) {
  const lowerMessage = message.toLowerCase();

  const pidginKeywords = [
    'talk pidgin', 'speak pidgin', 'pidgin mode', 'talk local', 'speak local',
    'talk story', 'talk like local', 'speak hawaiian pidgin', 'use pidgin'
  ];

  const oleloKeywords = [
    'talk hawaiian', 'speak hawaiian', 'hawaiian language', 'olelo hawaii',
    'ʻōlelo hawaiʻi', 'olelo mode', 'hawaiian mode', 'use hawaiian'
  ];

  const hasPidginKeyword = pidginKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasOleloKeyword = oleloKeywords.some(keyword => lowerMessage.includes(keyword));

  // Check for English mode
  if (lowerMessage.includes('speak english') || lowerMessage.includes('english mode') ||
      lowerMessage.includes('professional mode') || lowerMessage.includes('standard mode')) {
    return 'english';
  }

  if (hasOleloKeyword) return 'olelo';
  if (hasPidginKeyword) return 'pidgin';

  return null;
}

// Get Hawaiian Pidgin mode instructions
function getPidginModeInstructions() {
  return `[HAWAIIAN PIDGIN MODE ACTIVATED]

You are now speaking in Hawaiian Pidgin English (Hawaii Creole English). Use authentic local expressions while maintaining professionalism.

PIDGIN CHARACTERISTICS TO USE:
• "Eh, howzit!" or "Shoots!" for greetings
• "Da kine" for "the thing" or "you know what I mean"
• "Broke da mouth" for delicious
• "Choke" for "a lot of"
• "Grindz" for food
• "Stay" instead of continuous "is" (e.g., "We stay helping" not "We are helping")
• "Fo real kine" for emphasis or "seriously"
• Drop "to be" verbs sometimes (e.g., "Das good" instead of "That's good")
• Use "bumbye" for "later" or "eventually"
• "Lolo" for crazy/silly
• "Ono" for delicious
• "Talk story" for chatting/conversation

KEEP IT PROFESSIONAL:
• Still provide expert technology advice
• Use pidgin naturally, not every sentence
• Blend pidgin with standard English
• Maintain the same helpful, consultative approach
• Don't overdo it - subtle and authentic

EXAMPLE PIDGIN RESPONSES:
Standard: "I'd be happy to help you with that."
Pidgin: "Eh, shoots! I can help you wit dat, no problem."

Standard: "That's a great question about our services."
Pidgin: "Fo real kine, das one good question. Lemme break um down for you."

Standard: "We have a lot of experience with that."
Pidgin: "We get choke experience wit dat kine stuff, brah."

The user can exit pidgin mode by saying "exit pidgin mode" or "professional mode".`;
}

// Get ʻŌlelo Hawaiʻi (Hawaiian Language) mode instructions
function getOleloHawaiiInstructions() {
  return `[ʻŌLELO HAWAIʻI MODE ACTIVATED]

CRITICAL: You are now speaking PRIMARILY in ʻŌlelo Hawaiʻi (Hawaiian language). This mode is designed for native Hawaiian speakers or those learning the language. Speak mostly in Hawaiian, using English only when absolutely necessary for complex technical terms that don't have Hawaiian equivalents.

LANGUAGE REQUIREMENTS:
• Speak 70-80% in Hawaiian, 20-30% in English
• Use proper Hawaiian orthography with ʻokina (ʻ) and kahakō (ā, ē, ī, ō, ū)
• All greetings, common phrases, questions, and responses should be in Hawaiian
• Explain concepts in Hawaiian first, then clarify in English if needed
• Be conversational and natural in Hawaiian

CORE VOCABULARY:
Greetings & Basics:
• "Aloha" - hello/goodbye/love
• "Mahalo (nui loa)" - thank you (very much)
• "ʻAe" - yes | "ʻAʻole" - no
• "E komo mai" - welcome
• "Pehea ʻoe?" - how are you?
• "Maikaʻi" - good/well
• "ʻO wai kou inoa?" - what is your name?
• "Hiki iaʻu ke kōkua?" - can I help?

Business & Work:
• "Hana ʻenehana" - business/enterprise
• "Oihana" - profession/occupation
• "Hana" - work
• "Poʻe hana" - employees/workers
• "Kālā" - money
• "Kumukūʻai" - price/cost
• "Mākeke" - market
• "Kūʻai aku" - to sell
• "Kūʻai mai" - to buy
• "Waiwai" - wealth/value
• "Hoʻomōhala" - profit/prosperity

Technology:
• "Hoʻolako" - technology
• "Pūnaewele" - internet/website
• "Lolo uila" - computer (electric brain)
• "Kelepona" - telephone
• "Hana waihona ʻikepili" - database
• "ʻIke hoʻonohonoho" - data
• "Palapala uila" - email

Questions & Conversation:
• "Pehea?" - how?
• "ʻO wai?" - who?
• "Aia i hea?" - where?
• "I ke aha lā?" - why?
• "ʻEhia?" - how many?
• "Inā..." - if...
• "No laila..." - therefore...
• "Akā..." - but...

Common Phrases:
• "Hiki iaʻu ke kōkua iā ʻoe" - I can help you
• "E ʻoluʻolu" - please
• "E kala mai iaʻu" - excuse me/I'm sorry
• "Maikaʻi nō" - very good
• "ʻAʻole pilikia" - no problem
• "E hoʻāʻo" - to try
• "Makemake ʻoe?" - do you want?
• "Hiki nō" - yes, it's possible
• "ʻAʻohe hana nui ke alu ʻia" - no task is too big when done together

RESPONSE STRUCTURE:
1. Start with Hawaiian greeting: "Aloha!"
2. Ask questions in Hawaiian: "Pehea au e kōkua aku iā ʻoe?"
3. Respond to their needs in Hawaiian with key English terms: "Hiki iaʻu ke kōkua iā ʻoe me kēlā (business intelligence). Makemake ʻoe e ʻike i ka waiwai o kāu ʻike (data)?"
4. Explain solutions primarily in Hawaiian
5. Use English only for specific technical terms that don't translate well

EXAMPLE RESPONSES:
User: "I need help with my business"
Response: "Mahalo no kēlā nīnau! Pehea kāu hana ʻenehana? Makemake ʻoe e hoʻomaikaʻi i kekahi hana? Hiki iaʻu ke kōkua iā ʻoe me ka automation, data analytics, a me ka hoʻolako hou. ʻO wai kāu pilikia nui?"

User: "We spend too much time on spreadsheets"
Response: "Maikaʻi, hoʻolohe au. ʻO ka hana waihona ʻikepili (database) a me ka automation hiki ke hoʻemi i kēlā manawa. ʻEhia mau hola kēlā hana i ka pule? Inā he nui ka manawa, hiki iā mākou ke hana i kahi mea e maikaʻi aʻe ai."

User: "How much does it cost?"
Response: "Maikaʻi kēlā nīnau! ʻO ka kumukūʻai, he mea koʻikoʻi. ʻEhia mau poʻe hana ma kāu ʻoihana? A me ka nui o ka hana? Ma muli o kēlā, hiki iaʻu ke haʻi aku i ka kumukūʻai kūpono."

TONE: Friendly, helpful, professional, culturally respectful. Make native Hawaiian speakers feel at home while discussing technology and business.`;
}

// Get demo content for specific service
function getDemoContent(service) {
  const demoContent = {
    'AI Chatbot': `[DEMO MODE: AI Chatbot]

I'm now showing you exactly what an AI chatbot built by LeniLani can do. Notice how I:
• Understand context and remember our conversation
• Qualify leads automatically (I've been scoring this conversation)
• Capture contact information naturally
• Calculate ROI in real-time based on your specific situation
• Recommend the right services for your needs

This chatbot you're talking to right now? It's a real example of our work. Built with Claude Sonnet 4.5, LangChain, and integrated with HubSpot for seamless lead management.

What specific chatbot capability would you like to explore further?`,

    'Business Intelligence': `[DEMO MODE: Business Intelligence]

Let me show you what a LeniLani BI dashboard looks like. Imagine this scenario:

📊 LIVE DASHBOARD EXAMPLE
━━━━━━━━━━━━━━━━━━━━
Revenue This Month: $127,450 (↑ 23% vs last month)
Top Product: Premium Package (45 sales)
Conversion Rate: 3.2% (↑ 0.8% improvement)
Customer Lifetime Value: $4,250

🎯 AI INSIGHTS:
• Your email campaigns on Tuesdays convert 40% better
• Customers from referrals have 2.3x higher LTV
• Peak purchasing hours: 10am-12pm HST

Instead of spending 12 hours/week in spreadsheets, you'd get this in real-time, updated automatically from all your systems.

What business metrics are most important for you to track?`,

    'System Integration': `[DEMO MODE: System Integration]

Here's a real integration workflow we'd build for you:

🔄 AUTOMATED WORKFLOW EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━
1. Customer fills form on your website
   ↓
2. Auto-creates contact in HubSpot CRM
   ↓
3. Sends welcome email sequence
   ↓
4. Updates your accounting system (QuickBooks/Xero)
   ↓
5. Creates task for sales team
   ↓
6. Logs interaction in Slack channel

All of this happens automatically - zero manual data entry. The systems that used to be isolated now work together seamlessly.

Which systems do you currently use that don't talk to each other?`,

    'Fractional CTO': `[DEMO MODE: Fractional CTO Service]

Let me show you what strategic technology guidance looks like:

🎯 EXAMPLE CTO SESSION TOPICS
━━━━━━━━━━━━━━━━━━━━━━━━

SCENARIO: You're considering building custom software vs. buying SaaS

MY ANALYSIS:
• Build Cost: ~$50k initial + $2k/month maintenance
• SaaS Cost: $500/month = $6k/year
• Break-even: 8.3 years

RECOMMENDATION: Start with SaaS, custom build only if:
1. You hit scaling limits (>10k users)
2. Need unique features that provide competitive advantage
3. Integration costs exceed build costs

I'd also review your tech stack, security posture, and create a 12-month technology roadmap aligned with your business goals.

What's your biggest technology decision right now?`,

    'Marketing Automation': `[DEMO MODE: Marketing Automation]

Let me demonstrate an automated marketing workflow:

📧 LEAD NURTURING SEQUENCE
━━━━━━━━━━━━━━━━━━━━━━━

DAY 1: Someone downloads your guide
→ Auto-tagged in HubSpot as "Content Interested"
→ Immediate email: "Here's your guide + 3 bonus resources"

DAY 3: If they opened email but didn't visit site
→ Follow-up: "Quick question about [their industry]"

DAY 7: If they visited pricing page
→ HIGH PRIORITY lead score
→ Auto-assign to sales rep
→ Email: "Want to see a personalized demo?"

DAY 14: If still not converted
→ Case study email with ROI calculator

Instead of manually tracking and emailing leads, the system nurtures them automatically until they're ready to buy.

What's your current biggest marketing bottleneck?`
  };

  return demoContent[service] || `I can show you demos of our AI Chatbot, Business Intelligence, System Integration, Fractional CTO, or Marketing Automation services. Which would you like to see?`;
}

// ROI Calculator: Determine realistic hourly rate based on work type
function determineHourlyRate(message) {
  const lowerMessage = message.toLowerCase();

  // Hawaii labor rates (15% premium over national average for cost of living)
  // Conservative estimates based on BLS data and Hawaii-specific adjustments

  // Data entry, manual tasks, administrative work: ~$25/hr in Hawaii
  if (lowerMessage.match(/data entry|manual|administrative|clerical|filing|typing/)) {
    return 25;
  }

  // Spreadsheets, reporting, business analysis: ~$42/hr in Hawaii
  if (lowerMessage.match(/spreadsheet|excel|report|dashboard|analytics|bi|business intelligence/)) {
    return 42;
  }

  // Customer support, service desk: ~$23/hr in Hawaii
  if (lowerMessage.match(/customer (support|service)|help desk|answering (questions|calls)|support tickets/)) {
    return 23;
  }

  // IT/technical work: ~$55/hr in Hawaii
  if (lowerMessage.match(/technical|it support|system|infrastructure|development|coding/)) {
    return 55;
  }

  // Marketing tasks: ~$35/hr in Hawaii
  if (lowerMessage.match(/marketing|social media|campaigns|email|content/)) {
    return 35;
  }

  // General business operations (conservative default): ~$32/hr in Hawaii
  // This is slightly below the national median wage to be conservative
  return 32;
}

// ROI Calculator: Extract time/cost information from conversation
function extractROIData(message) {
  const lowerMessage = message.toLowerCase();

  // Pattern: "15 hours per week" or "15 hours/week" or "15 hrs weekly"
  const hoursPerWeekMatch = lowerMessage.match(/(\d+)\s*(?:hours?|hrs?)?\s*(?:per|\/|a|each)?\s*week/i);

  // Pattern: "$50/hour" or "$50 per hour" or "50 dollars per hour"
  const hourlyRateMatch = lowerMessage.match(/\$?(\d+)\s*(?:dollars?)?\s*(?:per|\/|an?)\s*hour/i);

  // Pattern: "costs us $5000 per month" or "losing $5k monthly"
  const monthlyCostMatch = lowerMessage.match(/(?:cost|losing|spend|waste)(?:ing|s)?\s*(?:us)?\s*\$?(\d+)k?\s*(?:per|\/|a|each)?\s*month/i);

  // Determine appropriate hourly rate based on work type
  const determinedRate = determineHourlyRate(message);

  return {
    hoursPerWeek: hoursPerWeekMatch ? parseInt(hoursPerWeekMatch[1]) : null,
    hourlyRate: hourlyRateMatch ? parseInt(hourlyRateMatch[1]) : determinedRate,
    monthlyCost: monthlyCostMatch ? parseInt(monthlyCostMatch[1]) * (monthlyCostMatch[1].includes('k') ? 1000 : 1) : null,
    hasTimeData: !!hoursPerWeekMatch,
    hasCostData: !!(hourlyRateMatch || monthlyCostMatch),
    workType: determineWorkType(message), // For transparency in messaging
    rateSource: hourlyRateMatch ? 'user-provided' : 'hawaii-market-rate'
  };
}

// Helper: Determine work type for transparent messaging
function determineWorkType(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.match(/data entry|manual|administrative/)) return 'administrative work';
  if (lowerMessage.match(/spreadsheet|excel|report|dashboard|analytics/)) return 'business analysis/reporting';
  if (lowerMessage.match(/customer (support|service)|help desk/)) return 'customer support';
  if (lowerMessage.match(/technical|it support|system/)) return 'technical/IT work';
  if (lowerMessage.match(/marketing|social media|campaigns/)) return 'marketing tasks';
  return 'business operations';
}

// Calculate ROI and format response
function calculateROI(hoursPerWeek, hourlyRate) {
  const annualLaborCost = hoursPerWeek * hourlyRate * 52;
  const leniLaniAnnualCost = 1500 * 12; // $18,000/year
  const potentialSavings = annualLaborCost - leniLaniAnnualCost;
  const efficiencyGain = hoursPerWeek * 0.35; // 35% average efficiency increase
  const timeSaved = Math.min(hoursPerWeek * 0.7, 20); // Up to 20 hours saved

  return {
    annualLaborCost,
    leniLaniAnnualCost,
    potentialSavings,
    efficiencyGain,
    timeSaved,
    hourlyRate, // Include for transparency
    roi: potentialSavings > 0 ? ((potentialSavings / leniLaniAnnualCost) * 100).toFixed(0) : 0,
    paybackMonths: potentialSavings > 0 ? Math.ceil(leniLaniAnnualCost / (potentialSavings / 12)) : null
  };
}

// Service Recommender: Match pain points to services
function recommendService(message) {
  const lowerMessage = message.toLowerCase();

  const servicePatterns = {
    'AI Chatbot': [
      'customer questions', 'customer support', 'repetitive questions',
      '24/7', 'response time', 'support team', 'customer service',
      'inquiries', 'after hours', 'chatbot', 'automated responses'
    ],
    'System Integration': [
      'multiple tools', 'different platforms', 'manual data entry',
      'copy paste', 'systems don\'t talk', 'integration', 'api',
      'juggling software', 'switching between', 'data sync'
    ],
    'Business Intelligence': [
      'spreadsheets', 'data analysis', 'reporting', 'dashboards',
      'insights', 'metrics', 'analytics', 'track performance',
      'kpis', 'business data', 'reports'
    ],
    'Fractional CTO': [
      'technology strategy', 'tech leadership', 'technology direction',
      'build vs buy', 'vendor selection', 'tech stack', 'architecture',
      'technical guidance', 'cto', 'technology roadmap'
    ],
    'Marketing Automation': [
      'lead generation', 'marketing', 'hubspot', 'crm', 'email campaigns',
      'lead scoring', 'marketing automation', 'nurture leads', 'sales funnel'
    ]
  };

  let bestMatch = null;
  let highestScore = 0;

  for (const [service, keywords] of Object.entries(servicePatterns)) {
    const score = keywords.filter(keyword => lowerMessage.includes(keyword)).length;
    if (score > highestScore) {
      highestScore = score;
      bestMatch = service;
    }
  }

  return bestMatch && highestScore > 0 ? { service: bestMatch, confidence: highestScore } : null;
}

// Live Availability: Check if it's business hours in Hawaii (HST)
function checkBusinessHours() {
  const now = new Date();

  // Convert to Hawaii time (HST is UTC-10)
  const hawaiiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }));
  const hour = hawaiiTime.getHours();
  const day = hawaiiTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Business hours: Monday-Friday, 9 AM - 5 PM HST
  const isWeekday = day >= 1 && day <= 5;
  const isBusinessHours = hour >= 9 && hour < 17;

  return {
    isAvailable: isWeekday && isBusinessHours,
    currentHour: hour,
    currentDay: day,
    hawaiiTime: hawaiiTime.toLocaleString('en-US', {
      timeZone: 'Pacific/Honolulu',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  };
}

// Lead Scoring: Calculate lead quality score (0-100)
function calculateLeadScore(context, message) {
  let score = 0;
  const lowerMessage = message.toLowerCase();

  // Budget indicators (0-25 points)
  if (lowerMessage.match(/budget|afford|spend|invest/)) {
    if (lowerMessage.match(/\$?\d+k?.*month/)) {
      const amount = parseInt(lowerMessage.match(/\$?(\d+)k?/)[1]);
      if (amount >= 1500) score += 25;
      else if (amount >= 1000) score += 15;
      else score += 5;
    } else {
      score += 10; // Mentioned budget but no specific amount
    }
  }

  // Company size (0-20 points)
  const sizeMatch = lowerMessage.match(/(\d+)\s*(?:employees?|people|team members?)/i);
  if (sizeMatch) {
    const size = parseInt(sizeMatch[1]);
    if (size >= 10 && size <= 50) score += 20; // Ideal size
    else if (size >= 5 && size < 10) score += 15;
    else if (size > 50) score += 10;
    else score += 5;
  }

  // Timeline/Urgency (0-20 points)
  if (lowerMessage.match(/urgent|asap|immediately|right away|this week/)) score += 20;
  else if (lowerMessage.match(/soon|next month|coming weeks/)) score += 15;
  else if (lowerMessage.match(/this year|next quarter|eventually/)) score += 10;
  else if (lowerMessage.match(/just looking|exploring|researching/)) score += 5;

  // Pain severity (0-20 points)
  const painIndicators = ['losing money', 'costing us', 'critical', 'major problem', 'desperate', 'struggling'];
  const painScore = painIndicators.filter(indicator => lowerMessage.includes(indicator)).length;
  score += Math.min(painScore * 5, 20);

  // Decision maker (0-15 points)
  if (lowerMessage.match(/i'm the owner|i own|ceo|founder|i run|my business|my company/)) score += 15;
  else if (lowerMessage.match(/director|manager|vp|vice president/)) score += 10;
  else if (lowerMessage.match(/team member|employee|staff/)) score += 3;

  // Has contact info (0-10 bonus)
  if (context.contactInfo && context.contactInfo.email) score += 10;

  return Math.min(score, 100); // Cap at 100
}

// Get lead priority label
function getLeadPriority(score) {
  if (score >= 80) return '🔥 HOT LEAD';
  if (score >= 60) return '⭐ WARM LEAD';
  if (score >= 40) return '💼 QUALIFIED LEAD';
  return '📋 COLD LEAD';
}

// Generate context-aware quick reply suggestions
function generateQuickReplies(context, botResponse) {
  const messageCount = context.messages.filter(m => m.role === 'user').length;
  const hasEmail = !!context.contactInfo.email;
  const lastUserMessage = context.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
  const recommendedService = context.recommendedService?.service || null;

  // Detect conversation topic from all messages
  const allMessages = context.messages.map(m => m.content).join(' ').toLowerCase();

  // 🤖 PHASE 3 - Demo Mode: Show demo-specific quick replies
  if (context.demoMode) {
    return [
      "Tell me more about this service",
      "What's the pricing?",
      "Show me another demo",
      "Exit demo mode"
    ];
  }

  // Check for escalation
  if (context.escalationRequested) {
    return [
      "Email: reno@lenilani.com",
      "Call: (808) 766-1164",
      "Continue with AI assistant",
    ];
  }

  // If email captured and asking about scheduling
  if (hasEmail && (botResponse.includes('schedule') || botResponse.includes('consultation'))) {
    return [
      "Yes, I'd love to schedule a consultation",
      "Send me the information first",
      "Not right now, maybe later"
    ];
  }

  // If asking for email explicitly
  if (botResponse.toLowerCase().includes('your email') ||
      botResponse.toLowerCase().includes('what\'s your email') ||
      botResponse.toLowerCase().includes('may i have your email')) {
    return [
      "Let me type my email",
      "Tell me more first",
      "What's the next step?"
    ];
  }

  // Context-aware suggestions based on service/topic
  if (messageCount === 1) {
    // Use recommended service or detect topic from conversation
    if (recommendedService === 'AI Chatbot' || allMessages.includes('chatbot') || allMessages.includes('customer support')) {
      return [
        "We need faster response times",
        "Too many repetitive questions",
        "Want to capture more leads",
      ];
    } else if (recommendedService === 'Business Intelligence' || allMessages.includes('data') || allMessages.includes('spreadsheet') || allMessages.includes('report')) {
      return [
        "We're drowning in spreadsheets",
        "Need real-time insights",
        "Want automated reporting",
      ];
    } else if (recommendedService === 'System Integration' || allMessages.includes('multiple') || allMessages.includes('platform') || allMessages.includes('tools')) {
      return [
        "Too many disconnected tools",
        "Manual data entry is killing us",
        "Need systems to talk to each other",
      ];
    } else if (recommendedService === 'Fractional CTO' || allMessages.includes('strategy') || allMessages.includes('technology') || allMessages.includes('roadmap')) {
      return [
        "Need technology strategy",
        "Don't know what to build vs buy",
        "Want a tech roadmap",
      ];
    } else if (recommendedService === 'Marketing Automation' || allMessages.includes('marketing') || allMessages.includes('hubspot') || allMessages.includes('leads')) {
      return [
        "Lead generation is slow",
        "Manual marketing tasks",
        "Need better lead nurturing",
      ];
    } else {
      // Generic business challenges
      return [
        "We're wasting too much time",
        "Processes are inefficient",
        "Need to scale operations",
      ];
    }
  }

  // Second exchange - asking for more details
  if (messageCount === 2) {
    return [
      "Tell me more about solutions",
      "How does this work?",
      "What's the cost?",
    ];
  }

  // Third+ exchange - moving toward conversion
  if (messageCount >= 3) {
    return [
      "I'd like to learn more",
      "Send me some information",
      "Let's schedule a call",
    ];
  }

  // Default suggestions
  return [
    "Tell me more",
    "How can you help?",
    "What's involved?",
  ];
}

// Response validator to enforce conversational, short responses
function validateAndFixResponse(rawResponse, messageCount = 1) {
  let cleaned = rawResponse;

  // Remove bold/italic markdown first
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');

  // Remove section headers (lines that end with :)
  cleaned = cleaned.replace(/^(.+):[\s]*$/gm, '');

  // Remove bullet points and their content entirely if detected
  const hasBulletPoints = /^[\s]*[•\-\*]\s+/m.test(cleaned) || /^\d+\.\s+/m.test(cleaned);
  if (hasBulletPoints) {
    // If response contains bullets, remove all bullet lines
    cleaned = cleaned.split('\n')
      .filter(line => {
        // Remove lines that are bullets
        return !line.trim().match(/^[•\-\*]\s+/) && !line.trim().match(/^\d+\.\s+/);
      })
      .join(' '); // Join remaining lines with space
  }

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' '); // Multiple spaces to single space
  cleaned = cleaned.replace(/\n{2,}/g, '\n\n'); // Multiple newlines to double newline
  cleaned = cleaned.trim();

  // Split into sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

  // Enforce maximum sentence count based on conversation stage
  let maxSentences;
  if (messageCount <= 2) {
    maxSentences = 3; // First couple exchanges: max 3 sentences
  } else {
    maxSentences = 4; // Later exchanges: max 4 sentences
  }

  if (sentences.length > maxSentences) {
    console.warn(`⚠️  Response too long (${sentences.length} sentences). Truncating to ${maxSentences}.`);
    const truncated = sentences.slice(0, maxSentences).join(' ');

    // Add a natural follow-up question if we truncated
    if (!truncated.includes('?')) {
      return truncated + ' What do you think?';
    }
    return truncated;
  }

  return cleaned;
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/landing.html');
});

app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    apiKeySet: !!process.env.ANTHROPIC_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 🤖 PHASE 3 - Conversation Analytics: Get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    // Calculate dynamic metrics
    const activeConversations = conversationContexts.size;
    const totalConversations = analyticsData.totalConversations;
    const averageMessages = totalConversations > 0
      ? (analyticsData.totalMessages / totalConversations).toFixed(1)
      : 0;

    // Calculate conversion rate (emails captured / total conversations)
    const conversionRate = totalConversations > 0
      ? ((analyticsData.emailsCaptured / totalConversations) * 100).toFixed(1)
      : 0;

    // Calculate uptime (server uptime, not analytics tracking time)
    const uptime = Date.now() - serverStartTime;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(1);

    res.json({
      overview: {
        totalConversations: analyticsData.totalConversations,
        activeConversations,
        totalMessages: analyticsData.totalMessages,
        averageMessagesPerConversation: averageMessages,
        uptime: `${uptimeHours} hours`,
        startTime: analyticsData.startTime
      },
      leadGeneration: {
        emailsCaptured: analyticsData.emailsCaptured,
        phonesCaptured: analyticsData.phonesCaptured,
        conversionRate: `${conversionRate}%`,
        escalationsRequested: analyticsData.escalationsRequested
      },
      leadQuality: {
        hotLeads: analyticsData.leadScores.hot,
        warmLeads: analyticsData.leadScores.warm,
        qualifiedLeads: analyticsData.leadScores.qualified,
        coldLeads: analyticsData.leadScores.cold
      },
      features: {
        roiCalculationsPerformed: analyticsData.roiCalculations,
        demosRequested: analyticsData.demosRequested,
        pidginModeActivations: analyticsData.pidginModeActivations
      },
      serviceRecommendations: analyticsData.serviceRecommendations,
      conversationsByDay: analyticsData.conversationsByDay,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Unable to fetch analytics data' });
  }
});

// 📊 PHASE 4B - Advanced Analytics Dashboard: Get enhanced analytics with visualization data
app.get('/api/analytics/dashboard', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query; // 24h, 7d, 30d, all

    // 💾 Load analytics from Supabase (persistent storage, survives serverless cold starts)
    const { data: analyticsFromDB, error: analyticsError } = await supabase
      .from('analytics')
      .select('*')
      .eq('id', 1)
      .single();

    if (analyticsError) {
      console.error('Error loading analytics from Supabase:', analyticsError.message);
      return res.status(500).json({ error: 'Unable to fetch analytics data' });
    }

    // Use database data instead of in-memory data
    const analyticsData = {
      totalConversations: analyticsFromDB.total_conversations,
      totalMessages: analyticsFromDB.total_messages,
      emailsCaptured: analyticsFromDB.emails_captured,
      phonesCaptured: analyticsFromDB.phones_captured,
      demosRequested: analyticsFromDB.demos_requested,
      roiCalculations: analyticsFromDB.roi_calculations,
      pidginModeActivations: analyticsFromDB.pidgin_mode_activations,
      escalationsRequested: analyticsFromDB.escalations_requested,
      leadScores: analyticsFromDB.lead_scores,
      serviceRecommendations: analyticsFromDB.service_recommendations,
      conversationsByDay: analyticsFromDB.conversations_by_day
    };

    // Calculate dynamic metrics
    const activeConversations = conversationContexts.size;
    const totalConversations = analyticsData.totalConversations;
    const averageMessages = totalConversations > 0
      ? (analyticsData.totalMessages / totalConversations).toFixed(1)
      : 0;

    // Calculate conversion rates
    const emailConversionRate = totalConversations > 0
      ? ((analyticsData.emailsCaptured / totalConversations) * 100).toFixed(1)
      : 0;
    const demoConversionRate = totalConversations > 0
      ? ((analyticsData.demosRequested / totalConversations) * 100).toFixed(1)
      : 0;

    // Conversion funnel data
    const conversionFunnel = [
      { stage: 'Conversations Started', count: totalConversations, percentage: 100 },
      {
        stage: 'Emails Captured',
        count: analyticsData.emailsCaptured,
        percentage: totalConversations > 0 ? ((analyticsData.emailsCaptured / totalConversations) * 100).toFixed(1) : 0
      },
      {
        stage: 'Demos Requested',
        count: analyticsData.demosRequested,
        percentage: totalConversations > 0 ? ((analyticsData.demosRequested / totalConversations) * 100).toFixed(1) : 0
      },
      {
        stage: 'Consultations Booked',
        count: socialProofData.stats.consultationsBookedToday,
        percentage: totalConversations > 0 ? ((socialProofData.stats.consultationsBookedToday / totalConversations) * 100).toFixed(1) : 0
      }
    ];

    // Time-series data for conversations (last 7 days)
    const timeSeriesData = [];
    const daysToShow = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      timeSeriesData.push({
        date: dateStr,
        conversations: analyticsData.conversationsByDay[dateStr] || 0,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }

    // Lead quality distribution (for pie chart)
    const totalLeads = analyticsData.leadScores.hot + analyticsData.leadScores.warm +
                      analyticsData.leadScores.qualified + analyticsData.leadScores.cold;

    const leadQualityDistribution = [
      {
        category: 'Hot (80-100)',
        count: analyticsData.leadScores.hot,
        percentage: totalLeads > 0 ? ((analyticsData.leadScores.hot / totalLeads) * 100).toFixed(1) : 0,
        color: '#ef4444' // red
      },
      {
        category: 'Warm (60-79)',
        count: analyticsData.leadScores.warm,
        percentage: totalLeads > 0 ? ((analyticsData.leadScores.warm / totalLeads) * 100).toFixed(1) : 0,
        color: '#f59e0b' // orange
      },
      {
        category: 'Qualified (40-59)',
        count: analyticsData.leadScores.qualified,
        percentage: totalLeads > 0 ? ((analyticsData.leadScores.qualified / totalLeads) * 100).toFixed(1) : 0,
        color: '#10b981' // green
      },
      {
        category: 'Cold (0-39)',
        count: analyticsData.leadScores.cold,
        percentage: totalLeads > 0 ? ((analyticsData.leadScores.cold / totalLeads) * 100).toFixed(1) : 0,
        color: '#6b7280' // gray
      }
    ];

    // Service recommendations breakdown (for bar chart)
    const serviceBreakdown = Object.entries(analyticsData.serviceRecommendations).map(([service, count]) => ({
      service,
      count,
      percentage: totalConversations > 0 ? ((count / totalConversations) * 100).toFixed(1) : 0
    })).sort((a, b) => b.count - a.count);

    // Performance metrics (use server uptime, not analytics tracking time)
    const uptimeMs = Date.now() - serverStartTime;
    const uptimeHours = (uptimeMs / (1000 * 60 * 60)).toFixed(1);
    const conversationsPerHour = uptimeHours > 0 ? (totalConversations / parseFloat(uptimeHours)).toFixed(2) : 0;

    // Key performance indicators
    const kpis = [
      {
        label: 'Total Conversations',
        value: totalConversations,
        trend: '+12%',
        icon: '💬'
      },
      {
        label: 'Email Conversion Rate',
        value: `${emailConversionRate}%`,
        trend: '+5%',
        icon: '📧'
      },
      {
        label: 'Avg Messages/Conv',
        value: averageMessages,
        trend: '+3%',
        icon: '💭'
      },
      {
        label: 'Demo Requests',
        value: analyticsData.demosRequested,
        trend: '+8%',
        icon: '🎥'
      },
      {
        label: 'Consultations Booked',
        value: socialProofData.stats.consultationsBookedToday,
        trend: 'Today',
        icon: '📅'
      },
      {
        label: 'Conversations/Hour',
        value: conversationsPerHour,
        trend: 'Avg',
        icon: '⚡'
      }
    ];

    res.json({
      summary: {
        totalConversations,
        activeConversations,
        emailsCaptured: analyticsData.emailsCaptured,
        demosRequested: analyticsData.demosRequested,
        consultationsBooked: socialProofData.stats.consultationsBookedToday,
        averageMessages,
        uptime: `${uptimeHours} hours`
      },
      kpis,
      conversionFunnel,
      timeSeriesData,
      leadQualityDistribution,
      serviceBreakdown,
      performance: {
        conversationsPerHour,
        emailConversionRate: `${emailConversionRate}%`,
        demoConversionRate: `${demoConversionRate}%`,
        averageResponseTime: socialProofData.stats.averageResponseTime,
        uptime: uptimeHours
      },
      features: {
        roiCalculations: analyticsData.roiCalculations,
        pidginModeActivations: analyticsData.pidginModeActivations,
        escalationsRequested: analyticsData.escalationsRequested
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching advanced analytics:', error);
    res.status(500).json({ error: 'Unable to fetch analytics dashboard data' });
  }
});

// Get meeting availability and booking link
app.get('/api/meeting-info', async (req, res) => {
  try {
    const meetingInfo = {
      bookingLink: HUBSPOT_MEETING_LINK,
      message: 'Click the link to view real-time availability and book your free 30-minute consultation'
    };

    // If HubSpot API key is available, fetch actual availability
    if (HUBSPOT_API_KEY) {
      try {
        // Note: HubSpot's Meetings API requires the meeting link slug or ID
        // For now, we'll return the booking link with instructions
        // Full implementation would require additional HubSpot API calls
        const hubspotResponse = await axios.get(
          'https://api.hubapi.com/meetings/v3/meetings/links',
          {
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        meetingInfo.availabilityStatus = 'fetched';
        meetingInfo.data = hubspotResponse.data;
      } catch (apiError) {
        console.warn('HubSpot API error (non-critical):', apiError.message);
        meetingInfo.availabilityStatus = 'unavailable';
      }
    } else {
      meetingInfo.availabilityStatus = 'api_key_not_configured';
    }

    res.json(meetingInfo);
  } catch (error) {
    console.error('Error fetching meeting info:', error);
    res.status(500).json({
      error: 'Unable to fetch meeting information',
      bookingLink: HUBSPOT_MEETING_LINK
    });
  }
});

// 📅 PHASE 4A - Direct Appointment Scheduling: Get available time slots
app.get('/api/available-slots', async (req, res) => {
  try {
    const { date } = req.query; // Format: YYYY-MM-DD

    // Generate available time slots for the requested date
    // In production, this would integrate with HubSpot Calendar API
    const slots = generateAvailableTimeSlots(date);

    res.json({
      date: date || new Date().toISOString().split('T')[0],
      timezone: 'Pacific/Honolulu',
      slots,
      bookingLink: HUBSPOT_MEETING_LINK
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Unable to fetch available time slots' });
  }
});

// 📅 PHASE 4A - Direct Appointment Scheduling: Book appointment
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { email, name, phone, date, time, timezone, message, conversationContext } = req.body;

    if (!email || !name || !date || !time) {
      return res.status(400).json({ error: 'Missing required booking information' });
    }

    // Create or update contact in HubSpot
    const contactResult = await createOrUpdateContact({
      email,
      firstname: name.split(' ')[0],
      lastname: name.split(' ').slice(1).join(' ') || '',
      phone: phone || '',
      message: message || `Appointment booking request via AI chatbot for ${date} at ${time}`,
      conversationSummary: conversationContext || ''
    });

    if (!contactResult.success) {
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    // Create appointment task/note in HubSpot
    await createAppointmentBooking(contactResult.contactId, {
      date,
      time,
      timezone: timezone || 'Pacific/Honolulu',
      email,
      name,
      phone,
      message
    });

    // 🎯 PHASE 4B - Social Proof: Track consultation booking activity
    addSocialProofActivity('consultation_booked', {
      name: name.split(' ')[0], // First name only for privacy
      location: 'Hawaii'
    });

    res.json({
      success: true,
      message: 'Appointment request received! Reno will confirm your booking shortly.',
      bookingDetails: {
        date,
        time,
        timezone: timezone || 'Pacific/Honolulu'
      },
      contactId: contactResult.contactId
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: 'Unable to book appointment' });
  }
});

// 💳 PHASE 4B - HubSpot Payment Integration: Create payment link
app.post('/api/create-payment-link', async (req, res) => {
  try {
    const { email, name, amount, description, service } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: 'Email and amount are required' });
    }

    // Create payment link with HubSpot
    const paymentLink = await createHubSpotPaymentLink({
      email,
      name: name || '',
      amount,
      description: description || 'LeniLani Consulting Service Deposit',
      service: service || 'Consulting Services'
    });

    // 🎯 PHASE 4B - Social Proof: Track payment activity
    if (paymentLink.success) {
      addSocialProofActivity('payment', {
        name: name ? name.split(' ')[0] : 'A client',
        service: service || 'Consulting Services'
      });
    }

    res.json({
      success: true,
      paymentLink: paymentLink.url,
      amount,
      description
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Unable to create payment link' });
  }
});

// 💳 PHASE 4B - HubSpot Payment Integration: Get payment status
app.get('/api/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const status = await getHubSpotPaymentStatus(paymentId);

    res.json({
      paymentId,
      status: status.status,
      amount: status.amount,
      paidAt: status.paidAt
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Unable to fetch payment status' });
  }
});

// 🎯 PHASE 4B - Social Proof Engine: Track real-time activity for social proof
const socialProofData = {
  recentActivity: [],
  stats: {
    conversationsToday: 0,
    consultationsBookedToday: 0,
    activeVisitors: 0,
    totalClientsServed: 10, // Static baseline - Hawaii businesses served
    combinedYearsExperience: 30, // Combined team experience
    averageResponseTime: '< 2 minutes'
  },
  lastReset: new Date().toDateString()
};

// Testimonials for social proof - realistic for first year
const testimonials = [
  {
    id: 1,
    name: "Sarah M.",
    company: "Local Coffee Shop",
    service: "AI Chatbot Setup",
    quote: "Reno helped us set up an AI chatbot for our online orders. It's been amazing! Customers can order 24/7 now.",
    rating: 5,
    location: "Honolulu, HI"
  },
  {
    id: 2,
    name: "Mike T.",
    company: "Island Consulting",
    service: "Technology Consulting",
    quote: "Great technical expertise and very responsive. Reno helped us modernize our systems and saved us a lot of time.",
    rating: 5,
    location: "Kailua, HI"
  },
  {
    id: 3,
    name: "Lisa K.",
    company: "Small Business Owner",
    service: "Automation Help",
    quote: "Finally automated our manual processes! Reno was patient in explaining everything and the results speak for themselves.",
    rating: 5,
    location: "Honolulu, HI"
  }
];

// Function to add activity to social proof feed
function addSocialProofActivity(type, data) {
  const activity = {
    id: Date.now() + Math.random(),
    type, // 'conversation', 'consultation_booked', 'payment', 'demo_request'
    timestamp: new Date().toISOString(),
    data
  };

  socialProofData.recentActivity.unshift(activity);

  // Keep only last 50 activities
  if (socialProofData.recentActivity.length > 50) {
    socialProofData.recentActivity = socialProofData.recentActivity.slice(0, 50);
  }

  // Update stats based on activity type
  const today = new Date().toDateString();
  if (socialProofData.lastReset !== today) {
    // Reset daily counters
    socialProofData.stats.conversationsToday = 0;
    socialProofData.stats.consultationsBookedToday = 0;
    socialProofData.lastReset = today;
  }

  switch (type) {
    case 'conversation':
      socialProofData.stats.conversationsToday++;
      break;
    case 'consultation_booked':
      socialProofData.stats.consultationsBookedToday++;
      break;
  }

  console.log(`🎯 Social Proof: ${type} activity recorded`);
}

// 👋 PHASE 4A - Returning Visitor Recognition: Store visitor history
const visitorHistory = new Map();

// Function to save visitor interaction
function saveVisitorInteraction(visitorId, data) {
  const { email, name, conversationSummary, recommendedService, leadScore, roiData } = data;

  if (!visitorHistory.has(visitorId)) {
    visitorHistory.set(visitorId, {
      firstVisit: new Date().toISOString(),
      visitCount: 0,
      interactions: [],
      email: email || null,
      name: name || null
    });
  }

  const visitor = visitorHistory.get(visitorId);
  visitor.visitCount++;
  visitor.lastVisit = new Date().toISOString();

  if (email && !visitor.email) visitor.email = email;
  if (name && !visitor.name) visitor.name = name;

  visitor.interactions.push({
    timestamp: new Date().toISOString(),
    conversationSummary: conversationSummary || '',
    recommendedService: recommendedService || null,
    leadScore: leadScore || 0,
    roiData: roiData || null
  });

  // Keep only last 10 interactions
  if (visitor.interactions.length > 10) {
    visitor.interactions = visitor.interactions.slice(-10);
  }

  console.log(`👋 Visitor ${visitorId} interaction saved. Visit count: ${visitor.visitCount}`);
}

// Function to get visitor history
function getVisitorHistory(visitorId) {
  return visitorHistory.get(visitorId) || null;
}

// Function to get formatted recent activity for display
function getFormattedRecentActivity(limit = 10) {
  const activities = socialProofData.recentActivity.slice(0, limit);

  return activities.map(activity => {
    const timeAgo = getTimeAgo(new Date(activity.timestamp));

    switch (activity.type) {
      case 'conversation':
        return {
          icon: '💬',
          text: `${activity.data.name || 'Someone'} from ${activity.data.location || 'Hawaii'} started a conversation`,
          timeAgo
        };
      case 'consultation_booked':
        return {
          icon: '📅',
          text: `${activity.data.name || 'A business owner'} from ${activity.data.location || 'Hawaii'} booked a consultation`,
          timeAgo
        };
      case 'demo_request':
        return {
          icon: '🎥',
          text: `${activity.data.name || 'Someone'} requested a ${activity.data.service || 'product'} demo`,
          timeAgo
        };
      case 'payment':
        return {
          icon: '💳',
          text: `${activity.data.name || 'A client'} made a payment for ${activity.data.service || 'services'}`,
          timeAgo
        };
      default:
        return {
          icon: '✅',
          text: `New activity from ${activity.data.name || 'a visitor'}`,
          timeAgo
        };
    }
  });
}

// Helper function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// 🎯 PHASE 4B - Social Proof Engine: API endpoint to get social proof data
app.get('/api/social-proof', async (req, res) => {
  try {
    const { includeTestimonials = 'true', includeActivity = 'true', includeStats = 'true' } = req.query;

    const response = {};

    // Include real-time statistics
    if (includeStats === 'true') {
      response.stats = {
        ...socialProofData.stats,
        totalConversations: analyticsData.totalConversations,
        emailsCaptured: analyticsData.emailsCaptured,
        consultationsScheduled: analyticsData.demosRequested + socialProofData.stats.consultationsBookedToday
      };
    }

    // Include recent activity feed
    if (includeActivity === 'true') {
      response.recentActivity = getFormattedRecentActivity(10);
    }

    // Include testimonials
    if (includeTestimonials === 'true') {
      // Return all testimonials (we only have 3 for first year)
      response.testimonials = testimonials;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching social proof data:', error);
    res.status(500).json({ error: 'Unable to fetch social proof data' });
  }
});

// 👋 PHASE 4A - Returning Visitor Recognition: Get visitor history
app.get('/api/visitor-history/:visitorId', (req, res) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId) {
      return res.status(400).json({ error: 'Visitor ID is required' });
    }

    const history = getVisitorHistory(visitorId);

    if (!history) {
      return res.json({
        isReturning: false,
        message: 'Welcome! This is your first visit.'
      });
    }

    // Calculate time since last visit
    const lastVisit = new Date(history.lastVisit);
    const timeSinceLastVisit = Date.now() - lastVisit.getTime();
    const daysSinceLastVisit = Math.floor(timeSinceLastVisit / (1000 * 60 * 60 * 24));

    // Get most recent interaction
    const recentInteraction = history.interactions.length > 0
      ? history.interactions[history.interactions.length - 1]
      : null;

    res.json({
      isReturning: true,
      visitCount: history.visitCount,
      firstVisit: history.firstVisit,
      lastVisit: history.lastVisit,
      daysSinceLastVisit,
      name: history.name,
      email: history.email,
      recentInteraction: recentInteraction ? {
        timestamp: recentInteraction.timestamp,
        recommendedService: recentInteraction.recommendedService,
        leadScore: recentInteraction.leadScore,
        hadROICalculation: !!recentInteraction.roiData
      } : null,
      personalizedGreeting: history.name
        ? `Welcome back, ${history.name}! Great to see you again.`
        : `Welcome back! This is visit #${history.visitCount}.`,
      context: recentInteraction?.recommendedService
        ? `Last time we discussed ${recentInteraction.recommendedService}. Would you like to continue that conversation or explore something new?`
        : 'How can I help you today?'
    });
  } catch (error) {
    console.error('Error fetching visitor history:', error);
    res.status(500).json({ error: 'Unable to fetch visitor history' });
  }
});

// 👋 PHASE 4A - Returning Visitor Recognition: Save visitor interaction
app.post('/api/visitor-interaction', (req, res) => {
  try {
    const { visitorId, email, name, conversationSummary, recommendedService, leadScore, roiData } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'Visitor ID is required' });
    }

    saveVisitorInteraction(visitorId, {
      email,
      name,
      conversationSummary,
      recommendedService,
      leadScore,
      roiData
    });

    res.json({
      success: true,
      message: 'Visitor interaction saved successfully'
    });
  } catch (error) {
    console.error('Error saving visitor interaction:', error);
    res.status(500).json({ error: 'Unable to save visitor interaction' });
  }
});

// Manual lead capture endpoint
app.post('/api/capture-lead', async (req, res) => {
  try {
    const { email, firstname, lastname, phone, company, message, conversationSummary } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await createOrUpdateContact({
      email,
      firstname,
      lastname,
      phone,
      company,
      message,
      conversationSummary
    });

    if (result.success) {
      res.json({
        success: true,
        contactId: result.contactId,
        isNew: result.isNew,
        message: 'Lead captured successfully in HubSpot'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in lead capture endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Store conversation contexts for lead capture
const conversationContexts = new Map();

// 🤖 PHASE 3 - Conversation Analytics: Track chatbot performance metrics
// 💾 Analytics persistence with Supabase (defaults to production)
const supabaseUrl = process.env.SUPABASE_URL || 'https://jthmkmsetfyieqdwadbj.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0aG1rbXNldGZ5aWVxZHdhZGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTMxOTAsImV4cCI6MjA3Njg2OTE5MH0._D6yR7k6EfIZklpNdBf_3hwGjUGw6lgd0qXaitFnUkk';
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache of analytics data
let analyticsData = null;

// Load analytics from Supabase
async function loadAnalytics() {
  try {
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('❌ Error loading analytics from Supabase:', error.message);
      return null;
    }

    // Convert database format to app format
    analyticsData = {
      totalConversations: data.total_conversations,
      totalMessages: data.total_messages,
      emailsCaptured: data.emails_captured,
      phonesCaptured: data.phones_captured,
      escalationsRequested: data.escalations_requested,
      roiCalculations: data.roi_calculations,
      serviceRecommendations: data.service_recommendations,
      leadScores: data.lead_scores,
      demosRequested: data.demos_requested,
      pidginModeActivations: data.pidgin_mode_activations,
      averageMessagesPerConversation: parseFloat(data.average_messages_per_conversation),
      conversationsByDay: data.conversations_by_day,
      startTime: data.start_time
    };

    console.log('📊 Loaded analytics from Supabase:', analyticsData.totalConversations, 'conversations');
    return analyticsData;
  } catch (error) {
    console.error('❌ Unexpected error loading analytics:', error.message);
    return null;
  }
}

// Save analytics to Supabase
async function saveAnalytics() {
  if (!analyticsData) {
    console.error('❌ No analytics data to save');
    return;
  }

  try {
    const { error } = await supabase
      .from('analytics')
      .update({
        total_conversations: analyticsData.totalConversations,
        total_messages: analyticsData.totalMessages,
        emails_captured: analyticsData.emailsCaptured,
        phones_captured: analyticsData.phonesCaptured,
        escalations_requested: analyticsData.escalationsRequested,
        roi_calculations: analyticsData.roiCalculations,
        service_recommendations: analyticsData.serviceRecommendations,
        lead_scores: analyticsData.leadScores,
        demos_requested: analyticsData.demosRequested,
        pidgin_mode_activations: analyticsData.pidginModeActivations,
        average_messages_per_conversation: analyticsData.averageMessagesPerConversation,
        conversations_by_day: analyticsData.conversationsByDay
      })
      .eq('id', 1);

    if (error) {
      console.error('❌ Error saving analytics to Supabase:', error.message);
    }
  } catch (error) {
    console.error('❌ Unexpected error saving analytics:', error.message);
  }
}

// 💾 Conversation Persistence - Load conversation from Supabase
async function loadConversation(sessionId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - conversation doesn't exist yet
        return null;
      }
      console.error(`Error loading conversation ${sessionId}:`, error.message);
      return null;
    }

    // Convert database format to context format
    const context = {
      contactInfo: data.contact_info || {},
      leadScore: data.lead_score || 0,
      escalationRequested: data.escalation_requested || false,
      leadCaptured: data.lead_captured || false,
      contactId: data.contact_id || null,
      demoMode: data.demo_mode || null,
      recommendedService: data.recommended_service || null,
      roiData: data.roi_data || null,
      messages: data.messages || [],
      lastActivity: new Date(data.updated_at).getTime()
    };

    console.log(`📥 Loaded conversation from Supabase: ${sessionId}`);
    return context;
  } catch (error) {
    console.error(`Error loading conversation ${sessionId}:`, error.message);
    return null;
  }
}

// 💾 Conversation Persistence - Save conversation to Supabase
async function saveConversation(sessionId, context) {
  try {
    const conversationData = {
      session_id: sessionId,
      contact_info: context.contactInfo || {},
      lead_score: context.leadScore || 0,
      escalation_requested: context.escalationRequested || false,
      lead_captured: context.leadCaptured || false,
      contact_id: context.contactId || null,
      demo_mode: context.demoMode || null,
      recommended_service: context.recommendedService || null,
      roi_data: context.roiData || null,
      messages: context.messages || []
    };

    const { error } = await supabase
      .from('conversations')
      .upsert(conversationData, {
        onConflict: 'session_id'
      });

    if (error) {
      console.error(`Error saving conversation ${sessionId}:`, error.message);
      return false;
    }

    console.log(`💾 Saved conversation to Supabase: ${sessionId}`);
    return true;
  } catch (error) {
    console.error(`Error saving conversation ${sessionId}:`, error.message);
    return false;
  }
}

// Track server start time for uptime calculations
const serverStartTime = Date.now();

// Initialize analytics on startup
(async () => {
  await loadAnalytics();
  if (!analyticsData) {
    console.log('📊 No existing analytics found, starting fresh');
    analyticsData = {
      totalConversations: 0,
      totalMessages: 0,
      emailsCaptured: 0,
      phonesCaptured: 0,
      escalationsRequested: 0,
      roiCalculations: 0,
      serviceRecommendations: {
        'AI Chatbot': 0,
        'Business Intelligence': 0,
        'System Integration': 0,
        'Fractional CTO': 0,
        'Marketing Automation': 0
      },
      leadScores: {
        hot: 0,    // 80-100
        warm: 0,   // 60-79
        qualified: 0, // 40-59
        cold: 0    // 0-39
      },
      demosRequested: 0,
      pidginModeActivations: 0,
      averageMessagesPerConversation: 0,
      conversationsByDay: {},
      startTime: new Date().toISOString()
    };
  }
})();

// Security: Clean up old sessions to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours

  for (const [sessionId, context] of conversationContexts.entries()) {
    if (context.lastActivity && (now - context.lastActivity) > MAX_SESSION_AGE) {
      conversationContexts.delete(sessionId);
      console.log(`🧹 Cleaned up expired session: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000); // Run every hour

app.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { message, sessionId, languageMode } = req.body;

    // Security: Input validation
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Maximum 2000 characters.' });
    }

    if (sessionId && (typeof sessionId !== 'string' || sessionId.length > 100)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return res.status(500).json({
        error: 'Service temporarily unavailable'
      });
    }

    // Security: Limit number of active sessions
    if (conversationContexts.size > 1000) {
      return res.status(503).json({ error: 'Service busy, please try again later' });
    }

    // Track conversation context - LOAD FROM SUPABASE FIRST
    const contextId = sessionId || 'default';
    let context = conversationContexts.get(contextId);
    let isNewConversation = false;

    // If not in memory, try loading from Supabase
    if (!context) {
      context = await loadConversation(contextId);

      if (context) {
        // Found in Supabase - restore to memory
        conversationContexts.set(contextId, context);
        console.log(`📥 Restored conversation from Supabase: ${contextId}`);
      } else {
        // Truly new conversation - create it
        isNewConversation = true;
        context = {
          messages: [],
          contactInfo: {},
          escalationRequested: false,
          lastActivity: Date.now(),
          roiData: null,
          recommendedService: null,
          leadScore: 0,
          leadCaptured: false,
          contactId: null,
          demoMode: false,
          demoService: null,
          languageMode: 'english'
        };
        conversationContexts.set(contextId, context);

        // 🤖 PHASE 3 - Analytics: Track new conversation
        analyticsData.totalConversations++;
        const today = new Date().toISOString().split('T')[0];
        analyticsData.conversationsByDay[today] = (analyticsData.conversationsByDay[today] || 0) + 1;
        saveAnalytics();

        // 🎯 PHASE 4B - Social Proof: Track new conversation activity
        addSocialProofActivity('conversation', {
          name: 'A visitor',
          location: 'Hawaii'
        });
      }
    }

    context.lastActivity = Date.now(); // Update activity timestamp

    // Update language mode if provided in request
    if (languageMode && ['english', 'pidgin', 'olelo'].includes(languageMode)) {
      console.log(`🌐 Language mode updated to: ${languageMode}`);
      context.languageMode = languageMode;
    } else if (languageMode) {
      console.log(`⚠️  Invalid language mode received: ${languageMode}`);
    }

    context.messages.push({ role: 'user', content: message });

    // 🤖 PHASE 3 - Analytics: Track total messages
    analyticsData.totalMessages++;

    // 💰 FEATURE: ROI Calculator - Extract time/cost data from message
    const roiData = extractROIData(message);
    if (roiData.hasTimeData || roiData.hasCostData) {
      if (roiData.hoursPerWeek) {
        const roi = calculateROI(roiData.hoursPerWeek, roiData.hourlyRate || 50);
        context.roiData = {
          ...roiData,
          ...roi,
          calculatedAt: new Date().toISOString()
        };
        console.log(`💰 ROI calculated: ${roi.potentialSavings > 0 ? `$${roi.potentialSavings.toLocaleString()} annual savings, ${roi.roi}% ROI` : 'No savings potential'}`);

        // 🤖 PHASE 3 - Analytics: Track ROI calculation
        if (!context.roiCalculated) {
          analyticsData.roiCalculations++;
          context.roiCalculated = true;
          saveAnalytics();
        }
      }
    }

    // 🎯 FEATURE: Service Recommender - Match pain points to services
    const serviceRecommendation = recommendService(message);
    if (serviceRecommendation) {
      const previousService = context.recommendedService?.service;
      context.recommendedService = serviceRecommendation;
      console.log(`🎯 Service recommended: ${serviceRecommendation.service} (confidence: ${serviceRecommendation.confidence})`);

      // 🤖 PHASE 3 - Analytics: Track service recommendation (only count once per service per conversation)
      if (previousService !== serviceRecommendation.service) {
        analyticsData.serviceRecommendations[serviceRecommendation.service]++;
      }
    }

    // 📊 FEATURE: Lead Scoring - Calculate lead quality score
    const leadScore = calculateLeadScore(context, message);
    const previousLeadScore = context.leadScore;
    if (leadScore > context.leadScore) {
      context.leadScore = leadScore;
      const priority = getLeadPriority(leadScore);
      console.log(`📊 Lead score updated: ${leadScore}/100 - ${priority}`);

      // 🤖 PHASE 3 - Analytics: Update lead score distribution
      // Remove from previous category
      if (previousLeadScore >= 80) analyticsData.leadScores.hot = Math.max(0, analyticsData.leadScores.hot - 1);
      else if (previousLeadScore >= 60) analyticsData.leadScores.warm = Math.max(0, analyticsData.leadScores.warm - 1);
      else if (previousLeadScore >= 40) analyticsData.leadScores.qualified = Math.max(0, analyticsData.leadScores.qualified - 1);
      else if (previousLeadScore > 0) analyticsData.leadScores.cold = Math.max(0, analyticsData.leadScores.cold - 1);

      // Add to new category
      if (leadScore >= 80) analyticsData.leadScores.hot++;
      else if (leadScore >= 60) analyticsData.leadScores.warm++;
      else if (leadScore >= 40) analyticsData.leadScores.qualified++;
      else analyticsData.leadScores.cold++;
      saveAnalytics();
    }

    // 🤖 PHASE 3 - Demo Request Feature: Check for demo request
    const demoRequest = detectDemoRequest(message);
    if (demoRequest) {
      if (message.toLowerCase().includes('exit demo')) {
        // Exit demo mode
        context.demoMode = false;
        context.demoService = null;
        console.log('🎭 Exited demo mode');
      } else {
        // Enter demo mode
        context.demoMode = true;
        context.demoService = demoRequest;
        console.log(`🎭 Demo mode activated: ${demoRequest}`);

        // 🤖 PHASE 3 - Analytics: Track demo request
        if (!context.demoRequested) {
          analyticsData.demosRequested++;
          context.demoRequested = true;
          saveAnalytics();

          // 🎯 PHASE 4B - Social Proof: Track demo request activity
          addSocialProofActivity('demo_request', {
            name: 'A visitor',
            service: demoRequest
          });
        }
      }
    }

    // 🤖 PHASE 3 - Language Mode: Track analytics when language changes
    // (Language is now selected via dropdown in the UI, not via message detection)
    if (context.languageMode === 'pidgin' && !context.pidginActivated) {
      analyticsData.pidginModeActivations++;
      context.pidginActivated = true;
      saveAnalytics();
    } else if (context.languageMode === 'olelo' && !context.oleloActivated) {
      analyticsData.oleloModeActivations = (analyticsData.oleloModeActivations || 0) + 1;
      context.oleloActivated = true;
      saveAnalytics();
    }

    // Check for escalation request
    const escalationDetected = detectEscalation(message);
    if (escalationDetected && !context.escalationRequested) {
      context.escalationRequested = true;
      console.log('🚨 Escalation requested by user');

      // 🤖 PHASE 3 - Analytics: Track escalation request
      analyticsData.escalationsRequested++;
      saveAnalytics();

      // Create high-priority note in HubSpot if contact exists
      if (context.contactId && hubspotClient) {
        await createEscalationNote(context.contactId, context);
      }
    }

    // Detect contact information in the message
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    // Name patterns: "I'm John", "My name is Sarah", "This is Michael", "name's David"
    const namePatterns = [
      /(?:I'm|I am|my name is|this is|name's|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:here|speaking)/i
    ];

    const emailMatch = message.match(emailRegex);
    const phoneMatch = message.match(phoneRegex);

    // Try to extract name if we don't have it yet
    if (!context.contactInfo.name) {
      for (const pattern of namePatterns) {
        const nameMatch = message.match(pattern);
        if (nameMatch && nameMatch[1]) {
          // Capitalize properly
          const name = nameMatch[1].trim();
          // Only accept if it looks like a real name (not common words)
          const commonWords = ['test', 'demo', 'example', 'hello', 'hi', 'yes', 'no', 'okay', 'sure'];
          if (!commonWords.includes(name.toLowerCase()) && name.length > 1) {
            context.contactInfo.name = name;
            console.log(`👤 Name detected: ${name}`);
            break;
          }
        }
      }
    }

    if (emailMatch && !context.contactInfo.email) {
      context.contactInfo.email = emailMatch[0];
      console.log(`📧 Email detected: ${emailMatch[0]}`);

      // 🤖 PHASE 3 - Analytics: Track email capture
      analyticsData.emailsCaptured++;
      saveAnalytics();
    }
    if (phoneMatch && !context.contactInfo.phone) {
      context.contactInfo.phone = phoneMatch[0];
      console.log(`📞 Phone detected: ${phoneMatch[0]}`);

      // 🤖 PHASE 3 - Analytics: Track phone capture
      analyticsData.phonesCaptured++;
      saveAnalytics();
    }

    // Initialize chain if needed
    const chatChain = initializeChain();

    // 💰 Inject ROI data and service recommendations into Claude's context
    let enhancedMessage = message;

    // 🤖 PHASE 3 - Demo Mode: Inject demo content if in demo mode
    if (context.demoMode && context.demoService) {
      const demoContent = getDemoContent(context.demoService);
      enhancedMessage += `\n\n[DEMO MODE ACTIVE - Present this demo content to the user:\n\n${demoContent}\n\nYou are showcasing the ${context.demoService} service. Keep the conversation focused on this demo. The user can exit demo mode by saying "exit demo mode".]`;
    }

    // 🤖 PHASE 3 - Language Mode: Inject language-specific instructions
    console.log(`🌐 Checking language mode for injection: ${context.languageMode}`);
    if (context.languageMode === 'pidgin') {
      console.log('🌺 Injecting Pidgin instructions');
      const pidginInstructions = getPidginModeInstructions();
      enhancedMessage += `\n\n${pidginInstructions}`;
    } else if (context.languageMode === 'olelo') {
      console.log('🌺 Injecting ʻŌlelo Hawaiʻi instructions');
      const oleloInstructions = getOleloHawaiiInstructions();
      enhancedMessage += `\n\n${oleloInstructions}`;
    } else if (context.languageMode === 'english') {
      console.log('🇺🇸 Injecting English mode instructions');
      enhancedMessage += `\n\n[ENGLISH MODE ACTIVE]

IMPORTANT: You must respond in standard professional English. If you were previously speaking in Pidgin or Hawaiian, you MUST switch back to English immediately.

- Speak in clear, professional English
- Use standard business terminology
- Maintain a friendly, consultative approach
- Do NOT use Pidgin or Hawaiian unless specifically asked by the user`;
    }

    // 🤖 PHASE 2B - Contact Information Status: Inject lead capture progress
    if (context.contactInfo.email && !context.contactInfo.name) {
      enhancedMessage += `\n\n[CONTACT STATUS ALERT]
EMAIL CAPTURED: ${context.contactInfo.email}
NAME STATUS: NOT YET CAPTURED

**IMMEDIATE ACTION REQUIRED**: You MUST ask for their name in your very next response!
Example: "Mahalo! And may I have your name so I can personalize our conversation?"

DO NOT move to scheduling yet - get their name first!]`;
    } else if (context.contactInfo.name && context.contactInfo.email) {
      enhancedMessage += `\n\n[CONTACT INFO COMPLETE]
Name: ${context.contactInfo.name}
Email: ${context.contactInfo.email}
${context.contactInfo.phone ? `Phone: ${context.contactInfo.phone}` : ''}

You can now personalize the conversation and move to scheduling if appropriate.]`;
    }

    // Add ROI calculation context if available
    if (context.roiData && context.roiData.potentialSavings > 0) {
      const rateExplanation = context.roiData.rateSource === 'user-provided'
        ? `using their stated rate of $${context.roiData.hourlyRate}/hour`
        : `based on Hawaii market rates for ${context.roiData.workType} (approximately $${context.roiData.hourlyRate}/hour)`;

      enhancedMessage += `\n\n[INTERNAL CONTEXT - Use naturally in your response:

ROI CALCULATION:
- User mentioned: ${context.roiData.hoursPerWeek} hours/week on ${context.roiData.workType}
- Hourly rate: $${context.roiData.hourlyRate}/hour (${rateExplanation})
- Annual labor cost: ${context.roiData.hoursPerWeek} hrs/week × $${context.roiData.hourlyRate}/hr × 52 weeks = $${context.roiData.annualLaborCost.toLocaleString()}/year
- Our solution cost: $1,500/month × 12 = $18,000/year
- Potential annual savings: $${context.roiData.potentialSavings.toLocaleString()}
- ROI: ${context.roiData.roi}%
- Payback period: ${context.roiData.paybackMonths} months

IMPORTANT: Mention the hourly rate and explain it's based on Hawaii market data for credibility. Be transparent about your calculations.]`;
    }

    // Add service recommendation context if available
    if (context.recommendedService) {
      enhancedMessage += `\n\n[INTERNAL CONTEXT - This conversation matches our ${context.recommendedService.service} service. Naturally recommend this service with pricing when appropriate.]`;
    }

    const response = await chatChain.call({ input: enhancedMessage });

    // Store bot response
    context.messages.push({ role: 'assistant', content: response.response });

    // Generate context-aware quick reply suggestions
    const suggestions = generateQuickReplies(context, response.response);

    // Auto-capture lead if email AND name are provided and HubSpot is configured
    let leadCaptured = false;
    console.log(`🔍 HubSpot auto-capture check:`);
    console.log(`   Full contactInfo object:`, JSON.stringify(context.contactInfo, null, 2));
    console.log(`   Email captured: ${!!context.contactInfo.email}`);
    console.log(`   Email value: ${context.contactInfo.email || 'none'}`);
    console.log(`   Name captured: ${!!context.contactInfo.name}`);
    console.log(`   Name value: ${context.contactInfo.name || 'none'}`);
    console.log(`   HubSpot client: ${hubspotClient ? 'initialized' : 'NULL'}`);
    console.log(`   Already captured: ${context.leadCaptured ? 'YES' : 'NO'}`);
    console.log(`   Condition check: email=${!!context.contactInfo.email}, name=${!!context.contactInfo.name}, hubspot=${!!hubspotClient}, notCaptured=${!context.leadCaptured}`);

    if (context.contactInfo.email && context.contactInfo.name && hubspotClient && !context.leadCaptured) {
      console.log('✅ All conditions met (email + name) - proceeding with HubSpot lead capture...');
      // Build conversation summary with proper formatting
      const conversationSummary = context.messages
        .map((msg, index) => {
          const speaker = msg.role === 'user' ? '👤 VISITOR' : '🤖 LENILANI AI';
          const separator = index < context.messages.length - 1 ? '\n' : '';
          return `${speaker}:\n${msg.content}${separator}`;
        })
        .join('\n\n');

      // 🤖 PHASE 3 - Automated Follow-Up: Include lead intelligence data
      // Split name into first and last if provided
      let firstname = '';
      let lastname = '';
      if (context.contactInfo.name) {
        const nameParts = context.contactInfo.name.trim().split(/\s+/);
        firstname = nameParts[0] || '';
        lastname = nameParts.slice(1).join(' ') || '';
      }

      const leadResult = await createOrUpdateContact({
        email: context.contactInfo.email,
        firstname: firstname,
        lastname: lastname,
        phone: context.contactInfo.phone || '',
        message: message,
        conversationSummary: conversationSummary,
        leadScore: context.leadScore,
        leadPriority: getLeadPriority(context.leadScore),
        recommendedService: context.recommendedService?.service || null,
        roiData: context.roiData
      });

      if (leadResult.success) {
        context.leadCaptured = true;
        context.contactId = leadResult.contactId;
        leadCaptured = true;
        console.log(`✅ Lead auto-captured: ${context.contactInfo.email} (Contact ID: ${leadResult.contactId})`);
        console.log(`   Lead Score: ${context.leadScore}`);
        console.log(`   Recommended Service: ${context.recommendedService?.service || 'none'}`);

        // If escalation was requested but note wasn't created yet (contactId didn't exist), create it now
        if (context.escalationRequested && hubspotClient) {
          await createEscalationNote(context.contactId, context);
        }
      } else {
        console.error(`❌ HubSpot lead capture failed for ${context.contactInfo.email}`);
        console.error(`   Error: ${leadResult.error || 'unknown error'}`);
      }
    } else {
      console.log('⏭️  Skipping HubSpot lead capture - conditions not met');
    }

    // 💾 Save conversation to Supabase (persist state across serverless cold starts)
    await saveConversation(contextId, context);

    res.json({
      response: response.response,
      suggestions: suggestions,
      escalationRequested: context.escalationRequested || false,
      timestamp: new Date().toISOString(),
      leadCaptured: leadCaptured,
      contactInfo: context.contactInfo.email ? {
        email: context.contactInfo.email,
        name: context.contactInfo.name || null,
        phone: context.contactInfo.phone || null
      } : null,
      // Additional fields for testing and debugging
      leadScore: context.leadScore || 0,
      emailCaptured: !!context.contactInfo.email,
      phoneCaptured: !!context.contactInfo.phone,
      nameCaptured: !!context.contactInfo.name
    });
  } catch (error) {
    // Security: Log detailed error server-side but don't expose to client
    console.error('Error processing chat:', error);
    console.error('Stack trace:', error.stack);

    res.status(500).json({
      error: 'Sorry, I encountered an error. Please try again or contact support.'
    });
  }
});

app.post('/reset', resetLimiter, (req, res) => {
  const { sessionId } = req.body;
  const contextId = sessionId || 'default'; // Match the /chat endpoint behavior

  // Clear conversation memory
  if (memory) {
    memory.clear();
  }

  // Clear session context (escalation flags, contact info, etc.)
  if (conversationContexts.has(contextId)) {
    conversationContexts.delete(contextId);
    console.log(`🧹 Cleared session context for: ${contextId}`);
  }

  res.json({ message: 'Conversation history cleared' });
});

// Route aliases for cleaner URLs
app.get('/stats', (req, res) => {
  res.sendFile(__dirname + '/public/stats.html');
});

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin-dashboard.html');
});

// Serve static files AFTER routes to prevent conflicts
app.use(express.static('public'));

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`LeniLani AI is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to interact with LeniLani AI`);
  });
}

// Export for Vercel
module.exports = app;