# LeniLani AI - Intelligent Business Consultation Chatbot

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ai--bot--special.lenilani.com-blue)](https://ai-bot-special.lenilani.com)
[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20AI-orange)](https://www.anthropic.com)
[![Built with LangChain](https://img.shields.io/badge/Built%20with-LangChain-green)](https://www.langchain.com)

An advanced AI-powered chatbot and lead qualification system built for LeniLani Consulting. Features intelligent conversation management, lead scoring, and business consultation capabilities powered by Anthropic's Claude AI.

**Live Demo**: [https://ai-bot-special.lenilani.com](https://ai-bot-special.lenilani.com)

## 🌟 Features

- **Advanced AI Conversations** - Powered by Anthropic Claude with LangChain framework
- **Comprehensive Knowledge Base** - Automatically loads verified company information from all LeniLani domains (www.lenilani.com, hawaii.lenilani.com, and all subdomains)
- **HubSpot Meeting Integration** - Smart booking buttons appear automatically when users ask about scheduling, with direct link to real-time availability
- **Automatic Lead Capture to HubSpot** - Detects email addresses and automatically creates/updates HubSpot contacts with full conversation tracking and source attribution ("LeniLani AI Chatbot")
- **Intelligent Lead Qualification** - Progressive contact information collection through natural conversation
- **Business Consultation Mode** - Demonstrates deep domain expertise in AI/ML, data science, and technology strategy
- **Paragraph-Formatted Responses** - Clean, readable responses with proper paragraph breaks
- **Conversation Context Tracking** - Full conversation history stored and attached to HubSpot contacts
- **Professional Landing Page** - Showcases technology stack and expertise
- **Conversation Memory** - Maintains context throughout user sessions

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Anthropic API key
- LangChain API key (optional, for tracing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/rprovine/lenilani-ai.git
cd langchain-chatbot-lenilani
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Add your API keys to `.env`:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
LANGCHAIN_API_KEY=your_langchain_api_key (optional)
PORT=3000
```

5. Add the hero background image:
- Save your hero image as `public/hero-bg.png`

6. Start the application:
```bash
npm start
```

Visit `http://localhost:3000` to see the landing page.

## 📁 Project Structure

```
langchain-chatbot-lenilani/
├── index.js                        # Main server file with Express and LangChain setup
├── lenilani-knowledge-base.md     # Comprehensive company knowledge base
├── KNOWLEDGE-BASE-UPDATE-GUIDE.md # Guide for updating the knowledge base
├── HUBSPOT-INTEGRATION-GUIDE.md   # HubSpot meeting integration guide
├── public/
│   ├── landing.html                # Marketing landing page
│   ├── index.html                  # Chatbot interface (with HubSpot booking)
│   ├── hero-bg.png                 # Hero section background image
│   └── favicon.svg                 # Site favicon
├── package.json                    # Project dependencies
├── vercel.json                    # Vercel deployment configuration
├── .env                            # Environment variables (not tracked)
├── .env.example                    # Environment template
├── .gitignore                     # Git ignore rules
├── linkedin-posts.md              # LinkedIn marketing content
├── linkedin-post-personal.txt
├── linkedin-post-company.txt
├── README.md                      # This file
└── DEPLOYMENT.md                  # Deployment instructions
```

## 🛠️ Technology Stack

- **AI Model**: Anthropic Claude (Haiku)
- **Framework**: LangChain for conversation management
- **Backend**: Node.js with Express
- **Memory**: BufferMemory for conversation persistence
- **Frontend**: Vanilla HTML/CSS/JavaScript with responsive design
- **Styling**: CSS variables for theme management

## 💰 Pricing Model

- **One-time Setup**: varies for complete implementation
- **Monthly API Costs**: Based on usage with 30% service markup
  - Default estimate: ~$65/month for 10,000 messages
  - Transparent calculator included on landing page

## 📚 Knowledge Base

The chatbot uses a comprehensive knowledge base (`lenilani-knowledge-base.md`) that contains verified information from:

- **www.lenilani.com** - Main website
- **hawaii.lenilani.com** - Hawaii-specific site
- **All LeniLani subdomains** - Including blog and service pages

### Updating Company Information

When company information changes (services, pricing, team, etc.):

1. Edit `lenilani-knowledge-base.md` with the new information
2. Save the file
3. Restart the server (auto-restarts with `npm run dev`)
4. Test the chatbot to verify accuracy

For detailed instructions, see `KNOWLEDGE-BASE-UPDATE-GUIDE.md`

### Knowledge Base Features

- **Automatic Loading**: Loads on server start
- **Comprehensive Coverage**: All services, pricing, team info, and more
- **Easy Updates**: Simple markdown file format
- **Version Controlled**: Tracked in git for change history
- **Source Attribution**: Documents where information came from

## 📅 HubSpot Meeting Integration

The chatbot features smart integration with HubSpot Meetings for seamless appointment scheduling.

### How It Works

1. **Automatic Detection**: When users ask about scheduling, booking, or consultations, the chatbot detects the intent
2. **Smart Response**: AI provides helpful scheduling information with the meeting link
3. **Booking Button**: A beautiful "📅 Book Your Free Consultation Now" button automatically appears
4. **Direct Booking**: Users click → HubSpot meeting page opens → See real-time availability → Book instantly

### Features

- ✅ **No Setup Required**: Works immediately with your HubSpot meeting link
- ✅ **Automatic Button Display**: Appears when scheduling is mentioned
- ✅ **Real-Time Availability**: Users see current open slots on HubSpot
- ✅ **Beautiful UI**: Gradient button with hover effects
- ✅ **API Ready**: Built-in endpoint for future enhancements

### Configuration

Your HubSpot meeting link is configured in:
- `.env` file: `HUBSPOT_MEETING_LINK=https://meetings-na2.hubspot.com/reno?uuid=...`
- Knowledge base: `lenilani-knowledge-base.md`

### Advanced Features (Optional)

For advanced availability fetching, add your HubSpot API key to `.env`:
```bash
HUBSPOT_API_KEY=pat-na1-your-token-here
```

See `HUBSPOT-INTEGRATION-GUIDE.md` for detailed setup instructions.

### API Endpoints

- `GET /api/meeting-info` - Returns booking link and availability status

## 🎨 Customization

### Updating the AI Personality

Edit the system prompt in `index.js`:

```javascript
const COMPLETE_LENILANI_CLAUDE_PROMPT = `Your custom prompt here...`;
```

Note: The knowledge base is automatically injected into the prompt, so focus on personality and behavior instructions.

### Changing Brand Colors

Modify CSS variables in `public/landing.html`:

```css
:root {
  --accent-primary: #0ea5e9;
  --accent-secondary: #06b6d4;
  /* Add your colors */
}
```

### Dark Mode Colors

Adjust dark theme in the `[data-theme="dark"]` section.

## 🔧 API Endpoints

- `GET /` - Landing page
- `GET /chat` - Chatbot interface
- `GET /api/test` - Health check endpoint
- `GET /api/meeting-info` - Get HubSpot meeting booking link and availability
  - Response: `{ "bookingLink": "...", "message": "...", "availabilityStatus": "..." }`
- `POST /chat` - Send message to AI (includes automatic lead detection)
  - Body: `{ "message": "user message", "sessionId": "optional-id" }`
  - Response: `{ "response": "...", "timestamp": "...", "leadCaptured": boolean, "contactInfo": {...} }`
- `POST /api/capture-lead` - Manually capture lead to HubSpot
  - Body: `{ "email": "required", "firstname": "", "lastname": "", "phone": "", "company": "", "message": "", "conversationSummary": "" }`
  - Response: `{ "success": true, "contactId": "...", "isNew": boolean }`
- `POST /reset` - Clear conversation memory

## 📊 Features for Clients

When deploying for clients, you provide:

1. ✅ Full AI chatbot deployment
2. ✅ Custom personality & training
3. ✅ Lead qualification system
4. ✅ Website integration (iframe or widget)
5. ✅ 30 days of support
6. ✅ Usage analytics dashboard (via LangSmith)

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

### Other Platforms

The app runs on any Node.js hosting platform:
- Railway
- Heroku
- AWS EC2
- Google Cloud Run
- Azure App Service

## 📝 Environment Variables

Required:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `PORT` - Server port (default: 3000)

Optional:
- `LANGCHAIN_API_KEY` - For LangSmith tracing and analytics
- `LANGCHAIN_TRACING_V2` - Set to 'true' to enable tracing

## 🤝 Support

For support and customization:
- Phone: (815) 641-6689
- Website: www.lenilani.com
- Location: 1050 Queen Street, Suite 100, Honolulu, HI 96814

## 📄 License

© 2025 LeniLani Consulting. All rights reserved.

---

Built with ❤️ in Hawaii by LeniLani Consulting
