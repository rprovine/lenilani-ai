# HubSpot Meeting Integration Guide

This guide explains how the HubSpot meeting integration works and how to enable advanced features.

## Current Features

### ✅ Already Implemented

1. **Direct Booking Link**
   - Your HubSpot meeting link is integrated: https://meetings-na2.hubspot.com/reno?uuid=ee86f3dc-1bde-4684-8460-c998aef13e65
   - Users can click to view real-time availability
   - Instant booking with no additional setup required

2. **Smart Button Display**
   - When the chatbot mentions scheduling/booking/consultation/appointment, a beautiful booking button automatically appears
   - Button opens your HubSpot meeting link in a new tab
   - Works immediately without any API key required

3. **API Endpoint**
   - `/api/meeting-info` endpoint provides the booking link to the chatbot
   - Ready for advanced features when you add your HubSpot API key

## How It Works

### User Experience

1. User asks about scheduling ("Can I schedule a consultation?")
2. LeniLani AI responds with scheduling information
3. A prominent "📅 Book Your Free Consultation Now" button appears automatically
4. User clicks the button → Opens HubSpot meeting scheduler
5. User sees real-time availability and books instantly

### Technical Flow

```
User Message
    ↓
Chatbot Response (mentions "schedule" or "booking")
    ↓
Frontend detects scheduling keywords
    ↓
Calls /api/meeting-info endpoint
    ↓
Returns HubSpot booking link
    ↓
Displays beautiful booking button
    ↓
User clicks → HubSpot meeting page
```

## Optional: Enable Advanced Features with HubSpot API

If you want to fetch and display available time slots directly in the chat (advanced feature), follow these steps:

### Step 1: Create a HubSpot Private App

1. Go to your HubSpot account
2. Navigate to **Settings** → **Integrations** → **Private Apps**
3. Click **Create a private app**
4. Give it a name (e.g., "LeniLani AI Bot")
5. Under **Scopes**, enable:
   - `crm.objects.meetings.read`
   - `meetings` (if available)
6. Click **Create app**
7. Copy the access token (starts with `pat-na1-...`)

### Step 2: Add API Key to Environment

1. Open your `.env` file
2. Uncomment and add your API key:

```bash
HUBSPOT_API_KEY=pat-na1-your-actual-token-here
```

3. Save the file
4. Restart the server: `npm run dev`

### Step 3: Verify Integration

Test the endpoint:
```bash
curl http://localhost:3000/api/meeting-info
```

You should see:
```json
{
  "bookingLink": "https://meetings-na2.hubspot.com/reno?uuid=...",
  "message": "Click the link to view real-time availability...",
  "availabilityStatus": "fetched",
  "data": { ... }
}
```

## Current Status

**Without HubSpot API Key** (Current Setup):
- ✅ Direct booking link works perfectly
- ✅ Users can see real-time availability on HubSpot page
- ✅ Automatic booking button appears
- ✅ No additional setup required
- ℹ️ Full availability data not fetched in chat (optional feature)

**With HubSpot API Key** (Optional Enhancement):
- ✅ All features above
- ✅ Fetch meeting link metadata from HubSpot
- ✅ Ready for future enhancements (display slots in chat)
- ⚠️ Requires HubSpot API configuration

## Updating the Meeting Link

If you need to change the HubSpot meeting link:

### Method 1: Environment Variable (Recommended)

1. Edit `.env`:
```bash
HUBSPOT_MEETING_LINK=https://meetings-na2.hubspot.com/new-link-here
```

2. Restart the server

### Method 2: Update Knowledge Base

1. Edit `lenilani-knowledge-base.md`
2. Find the "Booking & Scheduling" section
3. Update the booking link
4. Restart the server

## Testing the Integration

### Test 1: API Endpoint
```bash
curl http://localhost:3000/api/meeting-info
```

Expected: Returns booking link and status

### Test 2: Chatbot Integration
1. Open http://localhost:3000/chat
2. Ask: "How can I schedule a consultation?"
3. Expected: Bot responds with scheduling info + booking button appears
4. Click the button → HubSpot meeting page opens

### Test 3: Button Appearance
The booking button should appear when the bot's response includes any of these words:
- schedule
- booking
- consultation
- appointment
- meeting
- calendly
- hubspot

## Customization

### Change Button Text

Edit `public/index.html`, line ~464:
```javascript
📅 Book Your Free Consultation Now
```

Change to your preferred text.

### Change Button Style

Edit `public/index.html`, lines ~453-461:
```javascript
style="display: inline-block;
       padding: 12px 24px;
       background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
       color: white;
       text-decoration: none;
       border-radius: 25px;
       font-weight: 600;
       box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
       transition: transform 0.2s;"
```

### Add More Trigger Keywords

Edit `public/index.html`, line ~437:
```javascript
const schedulingKeywords = ['schedule', 'booking', 'consultation', 'appointment', 'meeting', 'calendly', 'hubspot'];
```

Add more keywords as needed.

## Troubleshooting

### Button Not Appearing

**Issue**: Booking button doesn't show when discussing scheduling

**Solutions**:
1. Check browser console for errors (F12 → Console)
2. Verify the bot's response includes scheduling keywords
3. Ensure `/api/meeting-info` endpoint is accessible:
   ```bash
   curl http://localhost:3000/api/meeting-info
   ```

### Wrong Meeting Link

**Issue**: Button links to wrong URL

**Solutions**:
1. Check `.env` file for `HUBSPOT_MEETING_LINK`
2. Verify `lenilani-knowledge-base.md` has correct link
3. Restart the server after changes

### API Key Issues

**Issue**: HubSpot API errors in logs

**Solutions**:
1. Verify API key in `.env` starts with `pat-na1-`
2. Check HubSpot private app has correct scopes
3. Ensure API key hasn't been revoked
4. Note: API key is optional - bot works without it

## Security Notes

### API Key Safety
- ✅ API key stored in `.env` (not committed to git)
- ✅ `.gitignore` excludes `.env` file
- ✅ Only use on your server, never expose to frontend
- ⚠️ Don't share your API key in screenshots or demos

### Meeting Link
- ✅ Safe to share publicly (it's your booking page)
- ✅ Already visible on your website
- ✅ Users need it to book consultations

## Future Enhancements

Potential additions with HubSpot API:

1. **Show Available Slots in Chat**
   - Display next 3-5 available times directly in the conversation
   - User clicks a time → Pre-fills the HubSpot form

2. **Meeting Confirmation in Chat**
   - After booking, send confirmation in the chat
   - Provide meeting details and calendar invite

3. **Automatic Follow-up**
   - Send reminder messages before the meeting
   - Collect additional info for better preparation

4. **Analytics Integration**
   - Track which chatbot conversations lead to bookings
   - Optimize conversation flow based on conversion data

## Support

For questions about HubSpot integration:
- HubSpot API Docs: https://developers.hubspot.com/docs/api/overview
- LeniLani Support: info@lenilani.com
- Phone: 808-766-1164

---

**Last Updated**: October 23, 2024
**Integration Status**: ✅ Active and Working
**API Key Required**: ❌ No (optional for advanced features)
