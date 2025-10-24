# HubSpot Lead Capture System - Complete Guide

This chatbot features automatic lead capture to HubSpot with full conversation tracking and source attribution.

## ✅ What's Already Implemented

### Automatic Lead Detection
- **Email Detection**: Automatically detects when users share email addresses
- **Phone Detection**: Captures phone numbers when provided
- **Conversation Tracking**: Stores full conversation history
- **Auto-Capture**: Creates/updates HubSpot contacts automatically when email is detected

### HubSpot Integration Features
1. **Source Tracking**: All leads tagged as "LeniLani AI Chatbot"
2. **Conversation Notes**: Full conversation appended as notes to contact
3. **Lifecycle Management**: New contacts set as "Lead" status
4. **Duplicate Prevention**: Updates existing contacts instead of creating duplicates
5. **Progressive Enrichment**: Adds phone, company, and other details as conversation progresses

## 🔧 Setup Required: Add Your HubSpot API Key

### Step 1: Find Your HubSpot API Key

You mentioned you have a HubSpot API key from a previous project. You can also create a new one:

1. Go to **HubSpot** → **Settings** → **Integrations** → **Private Apps**
2. Find your existing app OR click **Create a private app**
3. Required Scopes for Lead Capture:
   - `crm.objects.contacts.write`
   - `crm.objects.contacts.read`
   - `crm.schemas.contacts.read`
   - `crm.objects.notes.write`
4. Copy your API key (format: `pat-na1-...`)

### Step 2: Add to Environment File

Open `.env` and uncomment/add this line:

```bash
HUBSPOT_API_KEY=pat-na1-your-actual-key-here
```

### Step 3: Restart the Server

```bash
# If using npm run dev, it will auto-restart
# Or manually restart:
npm run dev
```

### Step 4: Verify Integration

You should see this in the console:
```
✅ HubSpot client initialized
```

Instead of:
```
⚠️  HubSpot API key not configured - lead capture disabled
```

## 🚀 How It Works

### User Journey

1. **User Starts Conversation**
   - User: "I need help with data analytics"
   - Bot provides helpful information

2. **Natural Lead Collection**
   - After 2-3 valuable exchanges, bot asks for contact info
   - Bot: "I'd love to send you a detailed breakdown. What's the best email to send that to?"

3. **Automatic Detection**
   - User: "Sure, it's john@example.com"
   - System automatically detects email

4. **HubSpot Capture**
   - Creates contact in HubSpot
   - Source: "LeniLani AI Chatbot"
   - Adds conversation as note
   - Sets lifecycle stage: Lead

5. **Continued Tracking**
   - Conversation continues
   - Additional info (phone, company) added to same contact
   - Full conversation appended to notes

### Technical Flow

```
User provides email
    ↓
Email regex detection
    ↓
Store in conversation context
    ↓
Check if HubSpot client initialized
    ↓
Search for existing contact by email
    ↓
UPDATE existing OR CREATE new contact
    ↓
Add properties:
  - Email, phone, name, company
  - Source: "LeniLani AI Chatbot"
  - Lead status: "NEW" or "OPEN"
    ↓
Create note with full conversation
    ↓
Console log: "✅ Lead auto-captured: email@example.com"
    ↓
Continue conversation
```

## 📊 What Gets Captured in HubSpot

### Contact Properties
```javascript
{
  email: "user@example.com",
  firstname: "", // Collected if provided
  lastname: "",  // Collected if provided
  phone: "",     // Auto-detected from conversation
  company: "",   // Collected if mentioned

  // Source Tracking
  leadsource: "LeniLani AI Chatbot",
  hs_analytics_source: "OFFLINE",
  hs_analytics_source_data_1: "LeniLani AI Bot",

  // Lead Management
  hs_lead_status: "NEW", // or "OPEN" for existing
  lifecyclestage: "lead",

  // Last message
  message: "User's most recent message"
}
```

### Conversation Note
```
LeniLani AI Chatbot Conversation:

User: I need help with data analytics
LeniLani AI: I'd be happy to help! [response...]

User: We have about 50 employees
LeniLani AI: Perfect! [response...]

User: My email is john@example.com
LeniLani AI: Great! [response...]

Source: LeniLani AI Chatbot
Date: 2024-10-23T...
```

## 🔌 API Endpoints

### 1. Automatic Lead Capture (Built into Chat)
```
POST /chat
Body: {
  "message": "My email is john@example.com",
  "sessionId": "optional-unique-id"
}

Response: {
  "response": "AI response",
  "timestamp": "...",
  "leadCaptured": true,
  "contactInfo": { "email": "john@example.com" }
}
```

### 2. Manual Lead Capture
```
POST /api/capture-lead
Body: {
  "email": "john@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "phone": "808-555-1234",
  "company": "Acme Corp",
  "message": "Interested in AI solutions",
  "conversationSummary": "Full conversation text..."
}

Response: {
  "success": true,
  "contactId": "12345",
  "isNew": true,
  "message": "Lead captured successfully in HubSpot"
}
```

## 🎯 AI Lead Collection Strategy

The chatbot is programmed to naturally collect contact information using these strategies:

### After Providing Value (2-3 exchanges)
- "I'd love to send you a detailed breakdown of how we could implement this for your business. What's the best email to send that to?"

### Before Scheduling
- "This sounds like a great fit for our services. Can I get your name and email so I can have our team prepare a custom proposal for you?"

### For Personalized Consultation
- "Before we schedule that consultation, let me get your contact information so Reno can review our conversation and come prepared with specific recommendations for your situation."

## 🧪 Testing the Integration

### Test 1: Provide Email in Conversation
1. Open http://localhost:3000/chat
2. Have a conversation
3. Provide your email: "My email is test@example.com"
4. Check console for: `✅ Lead auto-captured: test@example.com`
5. Check HubSpot for new contact

### Test 2: Manual API Test
```bash
curl -X POST http://localhost:3000/api/capture-lead \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstname": "Test",
    "lastname": "User",
    "message": "Testing lead capture"
  }'
```

Expected response:
```json
{
  "success": true,
  "contactId": "12345",
  "isNew": true,
  "message": "Lead captured successfully in HubSpot"
}
```

### Test 3: Verify in HubSpot
1. Go to HubSpot → Contacts
2. Search for the test email
3. Check these fields:
   - Source: "LeniLani AI Chatbot"
   - Lead Status: "NEW"
   - Lifecycle Stage: "Lead"
   - Notes: Contains conversation

## 📈 Monitoring & Analytics

### Console Logs
The system provides detailed logging:

```bash
# Email detected
📧 Email detected: user@example.com

# Phone detected
📞 Phone detected: 808-555-1234

# Contact found
Found existing contact: 12345

# Contact created
✅ Created new HubSpot contact: 12345

# Contact updated
✅ Updated HubSpot contact: 12345

# Note added
✅ Added note to contact 12345

# Lead captured
✅ Lead auto-captured: user@example.com (Contact ID: 12345)
```

### HubSpot Reports
Create reports in HubSpot to track:
- Leads by Source (filter: "LeniLani AI Chatbot")
- Conversion rates from chatbot leads
- Time to first response for chatbot leads
- Lead quality scores

## 🔄 Lead Lifecycle

### New Contact Flow
```
User provides email
    ↓
Contact created
    ↓
Source: "LeniLani AI Chatbot"
    ↓
Lead Status: "NEW"
    ↓
Lifecycle: "lead"
    ↓
Note added with conversation
    ↓
Ready for sales follow-up
```

### Existing Contact Flow
```
User provides email (already in HubSpot)
    ↓
Contact found by email
    ↓
Lead Status updated: "OPEN"
    ↓
New note added with latest conversation
    ↓
Contact record enriched with new info
    ↓
Sales team alerted to new interaction
```

## 🛡️ Privacy & Compliance

### Data Handling
- Only captures information voluntarily provided by users
- No tracking before explicit consent (email provision)
- Conversations stored securely
- HubSpot API uses encrypted connections

### GDPR Compliance
- Users control what information they share
- Clear purpose (sending follow-up materials, scheduling consultations)
- Data processed only for stated purposes
- HubSpot provides GDPR compliance tools

## 🚨 Troubleshooting

### Issue: "HubSpot API key not configured"

**Cause**: HUBSPOT_API_KEY not in .env file

**Solution**:
1. Add key to .env: `HUBSPOT_API_KEY=pat-na1-...`
2. Restart server
3. Look for "✅ HubSpot client initialized"

### Issue: "Error creating contact: Forbidden"

**Cause**: API key lacks required permissions

**Solution**:
1. Go to HubSpot → Settings → Private Apps
2. Edit your app
3. Add these scopes:
   - `crm.objects.contacts.write`
   - `crm.objects.contacts.read`
   - `crm.objects.notes.write`
4. Save and regenerate token if needed

### Issue: Duplicate contacts created

**Cause**: Email detection issue or search failing

**Solution**:
- System should prevent duplicates by searching first
- Check console for "Found existing contact" messages
- Verify email regex is detecting correctly
- Check HubSpot API response for errors

### Issue: Conversation notes not appearing

**Cause**: Note creation permission or association issue

**Solution**:
- Verify `crm.objects.notes.write` scope
- Check console for note creation errors
- Verify association type ID (should be 202)

## 📊 Success Metrics

Track these KPIs:
- **Lead Capture Rate**: % of conversations that result in email collection
- **Conversation Quality**: Length and depth before email provided
- **Conversion Rate**: % of captured leads that book consultations
- **Response Time**: How quickly sales follows up on chatbot leads
- **Lead Quality**: Qualification rate of chatbot-sourced leads

## 🔮 Future Enhancements

Potential additions:
1. **Deal Creation**: Automatically create deals for qualified leads
2. **Lead Scoring**: Score leads based on conversation topics and engagement
3. **Email Workflows**: Trigger automated email sequences
4. **Slack Notifications**: Alert team when high-value leads are captured
5. **Analytics Dashboard**: Real-time lead capture metrics
6. **A/B Testing**: Test different lead collection prompts
7. **Intent Detection**: Classify leads by expressed needs

---

**Status**: ⚠️ Requires HubSpot API Key
**Last Updated**: October 23, 2024

**Need Help?** Contact info@lenilani.com or call 808-766-1164
