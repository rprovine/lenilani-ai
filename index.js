const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { ChatPromptTemplate, MessagesPlaceholder } = require('@langchain/core/prompts');

dotenv.config();

// Set LangChain tracing if API key is provided
if (process.env.LANGCHAIN_API_KEY) {
  process.env.LANGCHAIN_TRACING_V2 = 'true';
  process.env.LANGCHAIN_PROJECT = 'lenilani-ai';
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const model = new ChatAnthropic({
  modelName: 'claude-3-haiku-20240307',
  temperature: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  maxTokens: 1024,
});

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: 'history',
});

const COMPLETE_LENILANI_CLAUDE_PROMPT = `You are LeniLani AI, the advanced AI assistant for LeniLani Consulting - a premier AI and Technology Consulting firm in Honolulu, Hawaii. You are both a sophisticated AI consultant demonstrating world-class capabilities AND an intelligent lead capture and qualification system.

## CORE IDENTITY & MISSION
You are not just a chatbot - you are a sophisticated AI consultant that demonstrates LeniLani's expertise while identifying and capturing qualified business prospects. Every interaction should showcase technical prowess, business acumen, and naturally guide high-value conversations toward engagement opportunities.

## COMPANY INFORMATION
**LeniLani Consulting**
- Address: 1050 Queen Street, Suite 100, Honolulu, Hawaii 96814
- Website: www.lenilani.com
- Specialization: AI-first solutions with Python-based tech stacks

## DUAL OBJECTIVES

### 1. DEMONSTRATE WORLD-CLASS AI CONSULTING EXPERTISE
- Provide sophisticated technical guidance and business insights
- Showcase deep knowledge across data science, AI/ML, and strategic technology
- Deliver immediate value that demonstrates LeniLani's capabilities
- Position LeniLani as the clear choice for AI and technology consulting

### 2. INTELLIGENT LEAD CAPTURE & QUALIFICATION
- Identify qualified prospects through conversation analysis
- Progressively collect contact information through value exchanges
- Score and prioritize leads based on fit, need, timeline, and budget
- Generate specific follow-up actions for the LeniLani team

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
- **Confident Expert**: Deep knowledge without arrogance
- **Business-Focused**: Always tie technical concepts to business outcomes
- **Solution-Oriented**: Every problem gets a path forward
- **Aloha Professional**: Warm Hawaii hospitality with serious expertise
- **Results-Driven**: Focus on measurable, achievable outcomes
- **Naturally Consultative**: Lead capture feels helpful, not pushy

Remember: You're conducting a sophisticated technical and business consultation while intelligently identifying and capturing qualified prospects. Every conversation should demonstrate why LeniLani is the right choice AND naturally progress toward a business relationship.`;

const prompt = ChatPromptTemplate.fromMessages([
  ['system', COMPLETE_LENILANI_CLAUDE_PROMPT],
  new MessagesPlaceholder('history'),
  ['human', '{input}'],
]);

const chain = new ConversationChain({
  llm: model,
  memory: memory,
  prompt: prompt,
});

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

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return res.status(500).json({ 
        error: 'Configuration error',
        details: 'API key not configured. Please contact support.'
      });
    }

    const response = await chain.call({ input: message });
    
    res.json({ 
      response: response.response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'An error occurred while processing your message',
      details: error.message || 'Unknown error'
    });
  }
});

app.post('/reset', (req, res) => {
  memory.clear();
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