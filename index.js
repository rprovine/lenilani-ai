const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client } = require('@hubspot/api-client');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

dotenv.config();

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
}));

// Security: Configure CORS to only allow specific origins in production
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://ai-bot-special.lenilani.com', 'https://lenilani.com', 'https://www.lenilani.com']
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
- Provide contact options: "You can reach Reno directly at reno@lenilani.com or call (808) 766-1164"
- Offer to continue helping: "I'm also happy to continue assisting you if you'd like - what specific information would be most helpful?"
- NEVER be defensive or pushy when someone wants human contact

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

async function createEscalationNote(contactId, messages) {
  if (!hubspotClient) return;

  try {
    const conversationSummary = messages
      .map((msg, index) => {
        const speaker = msg.role === 'user' ? '👤 VISITOR' : '🤖 LENILANI AI';
        const separator = index < messages.length - 1 ? '\n' : '';
        return `${speaker}:\n${msg.content}${separator}`;
      })
      .join('\n\n');

    const noteProperties = {
      hs_timestamp: Date.now(),
      hs_note_body: `🚨 URGENT - HUMAN ESCALATION REQUESTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  The visitor has requested to speak with a human representative.
    Please follow up ASAP.

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

// Generate context-aware quick reply suggestions
function generateQuickReplies(context, botResponse) {
  const messageCount = context.messages.filter(m => m.role === 'user').length;
  const hasEmail = !!context.contactInfo.email;
  const lastUserMessage = context.messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  // Check for escalation
  if (context.escalationRequested) {
    return [
      "Email: reno@lenilani.com",
      "Call: (808) 766-1164",
      "Continue with AI assistant"
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

  // First exchange - asking about challenges
  if (messageCount === 1) {
    return [
      "We need faster response times",
      "Too many repetitive questions",
      "Want to capture more leads",
      "Need 24/7 customer support"
    ];
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
    if (!conversationContexts.has(contextId)) {
      conversationContexts.set(contextId, {
        messages: [],
        contactInfo: {},
        escalationRequested: false,
        lastActivity: Date.now()
      });
    }
    const context = conversationContexts.get(contextId);
    context.lastActivity = Date.now(); // Update activity timestamp
    context.messages.push({ role: 'user', content: message });

    // Check for escalation request
    const escalationDetected = detectEscalation(message);
    if (escalationDetected && !context.escalationRequested) {
      context.escalationRequested = true;
      console.log('🚨 Escalation requested by user');

      // Create high-priority note in HubSpot if contact exists
      if (context.contactId && hubspotClient) {
        await createEscalationNote(context.contactId, context.messages);
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
    }
    if (phoneMatch && !context.contactInfo.phone) {
      context.contactInfo.phone = phoneMatch[0];
      console.log(`📞 Phone detected: ${phoneMatch[0]}`);
    }

    // Initialize chain if needed
    const chatChain = initializeChain();
    const response = await chatChain.call({ input: message });

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

      const leadResult = await createOrUpdateContact({
        email: context.contactInfo.email,
        phone: context.contactInfo.phone || '',
        message: message,
        conversationSummary: conversationSummary
      });

      if (leadResult.success) {
        context.leadCaptured = true;
        context.contactId = leadResult.contactId;
        leadCaptured = true;
        console.log(`✅ Lead auto-captured: ${context.contactInfo.email} (Contact ID: ${leadResult.contactId})`);
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