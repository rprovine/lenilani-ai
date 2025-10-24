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
if (HUBSPOT_API_KEY) {
  hubspotClient = new Client({ accessToken: HUBSPOT_API_KEY });
  console.log('✅ HubSpot client initialized');
} else {
  console.warn('⚠️  HubSpot API key not configured - lead capture disabled');
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

**AFTER EMAIL CAPTURED** (move to scheduling):
Professionally introduce Reno based on their specific needs. For example:
"Excellent, mahalo! Reno has deep expertise in this area and would love to discuss your specific needs. Would you like to schedule a consultation with him this week?"

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

// 🤖 PHASE 3 - Hawaiian Pidgin Mode: Detect if user wants pidgin mode
function detectPidginRequest(message) {
  const lowerMessage = message.toLowerCase();

  const pidginKeywords = [
    'talk pidgin', 'speak pidgin', 'pidgin mode', 'talk local', 'speak local',
    'talk story', 'talk like local', 'speak hawaiian pidgin', 'use pidgin',
    'can talk pidgin'
  ];

  const hasPidginKeyword = pidginKeywords.some(keyword => lowerMessage.includes(keyword));

  // Check for exit pidgin mode
  if (lowerMessage.includes('exit pidgin') || lowerMessage.includes('stop pidgin') ||
      lowerMessage.includes('professional mode') || lowerMessage.includes('standard mode')) {
    return 'exit';
  }

  return hasPidginKeyword ? 'enter' : null;
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

  // 🤖 PHASE 3 - Hawaiian Pidgin Mode: Include pidgin toggle in suggestions
  const pidginToggle = context.pidginMode
    ? "Exit pidgin mode"
    : "Talk pidgin";

  // Check for escalation
  if (context.escalationRequested) {
    return [
      "Email: reno@lenilani.com",
      "Call: (808) 766-1164",
      "Continue with AI assistant",
      pidginToggle
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
        "Need 24/7 customer support"
      ];
    } else if (recommendedService === 'Business Intelligence' || allMessages.includes('data') || allMessages.includes('spreadsheet') || allMessages.includes('report')) {
      return [
        "We're drowning in spreadsheets",
        "Need real-time insights",
        "Want automated reporting",
        "Can't make sense of our data"
      ];
    } else if (recommendedService === 'System Integration' || allMessages.includes('multiple') || allMessages.includes('platform') || allMessages.includes('tools')) {
      return [
        "Too many disconnected tools",
        "Manual data entry is killing us",
        "Need systems to talk to each other",
        "Want to automate workflows"
      ];
    } else if (recommendedService === 'Fractional CTO' || allMessages.includes('strategy') || allMessages.includes('technology') || allMessages.includes('roadmap')) {
      return [
        "Need technology strategy",
        "Don't know what to build vs buy",
        "Want a tech roadmap",
        "Need help evaluating vendors"
      ];
    } else if (recommendedService === 'Marketing Automation' || allMessages.includes('marketing') || allMessages.includes('hubspot') || allMessages.includes('leads')) {
      return [
        "Lead generation is slow",
        "Manual marketing tasks",
        "Need better lead nurturing",
        "Want to automate campaigns"
      ];
    } else {
      // Generic business challenges
      return [
        "We're wasting too much time",
        "Processes are inefficient",
        "Need to scale operations",
        "Looking for technology solutions"
      ];
    }
  }

  // Second exchange - asking for more details
  if (messageCount === 2) {
    return [
      "Tell me more about solutions",
      "How does this work?",
      "What's the cost?",
      "Can you send me examples?"
    ];
  }

  // Third+ exchange - moving toward conversion
  if (messageCount >= 3) {
    return [
      "I'd like to learn more",
      "Send me some information",
      "Let's schedule a call",
      "What are the next steps?"
    ];
  }

  // Default suggestions
  return [
    "Tell me more",
    "How can you help?",
    "What's involved?",
    "I'm interested"
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

    // Calculate uptime
    const startTime = new Date(analyticsData.startTime);
    const uptime = Date.now() - startTime.getTime();
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
const analyticsData = {
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
    const { message, sessionId } = req.body;

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

    // Track conversation context
    const contextId = sessionId || 'default';
    const isNewConversation = !conversationContexts.has(contextId);

    if (isNewConversation) {
      conversationContexts.set(contextId, {
        messages: [],
        contactInfo: {},
        escalationRequested: false,
        lastActivity: Date.now(),
        roiData: null,
        recommendedService: null,
        leadScore: 0,
        demoMode: false, // 🤖 PHASE 3 - Demo Request Feature
        demoService: null, // 🤖 PHASE 3 - Demo Request Feature
        pidginMode: false // 🤖 PHASE 3 - Hawaiian Pidgin Mode
      });

      // 🤖 PHASE 3 - Analytics: Track new conversation
      analyticsData.totalConversations++;
      const today = new Date().toISOString().split('T')[0];
      analyticsData.conversationsByDay[today] = (analyticsData.conversationsByDay[today] || 0) + 1;
    }

    const context = conversationContexts.get(contextId);
    context.lastActivity = Date.now(); // Update activity timestamp
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
        }
      }
    }

    // 🤖 PHASE 3 - Hawaiian Pidgin Mode: Check for pidgin mode request
    const pidginRequest = detectPidginRequest(message);
    if (pidginRequest === 'enter') {
      context.pidginMode = true;
      console.log('🌺 Hawaiian Pidgin mode activated');

      // 🤖 PHASE 3 - Analytics: Track pidgin mode activation
      if (!context.pidginActivated) {
        analyticsData.pidginModeActivations++;
        context.pidginActivated = true;
      }
    } else if (pidginRequest === 'exit') {
      context.pidginMode = false;
      console.log('🌺 Exited Hawaiian Pidgin mode');
    }

    // Check for escalation request
    const escalationDetected = detectEscalation(message);
    if (escalationDetected && !context.escalationRequested) {
      context.escalationRequested = true;
      console.log('🚨 Escalation requested by user');

      // 🤖 PHASE 3 - Analytics: Track escalation request
      analyticsData.escalationsRequested++;

      // Create high-priority note in HubSpot if contact exists
      if (context.contactId && hubspotClient) {
        await createEscalationNote(context.contactId, context);
      }
    }

    // Detect contact information in the message
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
    const emailMatch = message.match(emailRegex);
    const phoneMatch = message.match(phoneRegex);

    if (emailMatch && !context.contactInfo.email) {
      context.contactInfo.email = emailMatch[0];
      console.log(`📧 Email detected: ${emailMatch[0]}`);

      // 🤖 PHASE 3 - Analytics: Track email capture
      analyticsData.emailsCaptured++;
    }
    if (phoneMatch && !context.contactInfo.phone) {
      context.contactInfo.phone = phoneMatch[0];
      console.log(`📞 Phone detected: ${phoneMatch[0]}`);

      // 🤖 PHASE 3 - Analytics: Track phone capture
      analyticsData.phonesCaptured++;
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

    // 🤖 PHASE 3 - Hawaiian Pidgin Mode: Inject pidgin instructions if active
    if (context.pidginMode) {
      const pidginInstructions = getPidginModeInstructions();
      enhancedMessage += `\n\n${pidginInstructions}`;
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

    // Auto-capture lead if email is provided and HubSpot is configured
    let leadCaptured = false;
    if (context.contactInfo.email && hubspotClient && !context.leadCaptured) {
      // Build conversation summary with proper formatting
      const conversationSummary = context.messages
        .map((msg, index) => {
          const speaker = msg.role === 'user' ? '👤 VISITOR' : '🤖 LENILANI AI';
          const separator = index < context.messages.length - 1 ? '\n' : '';
          return `${speaker}:\n${msg.content}${separator}`;
        })
        .join('\n\n');

      // 🤖 PHASE 3 - Automated Follow-Up: Include lead intelligence data
      const leadResult = await createOrUpdateContact({
        email: context.contactInfo.email,
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

        // If escalation was requested but note wasn't created yet (contactId didn't exist), create it now
        if (context.escalationRequested && hubspotClient) {
          await createEscalationNote(context.contactId, context);
        }
      }
    }

    res.json({
      response: response.response,
      suggestions: suggestions,
      escalationRequested: context.escalationRequested || false,
      timestamp: new Date().toISOString(),
      leadCaptured: leadCaptured,
      contactInfo: context.contactInfo.email ? { email: context.contactInfo.email } : null
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