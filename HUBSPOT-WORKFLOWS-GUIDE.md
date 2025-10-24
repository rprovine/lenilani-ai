# HubSpot Workflow Automation Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing a complete lead nurture and conversion system in HubSpot for AI Chatbot leads from LeniLani AI.

**Requirements:**
- HubSpot Marketing Hub Professional or higher
- HubSpot CRM (free tier works for basic workflows)
- Custom properties already created (completed ✅)

**What You Get:**
- 8 professionally crafted email templates
- 10 automated workflows
- Complete lead nurture system from first touch to closed deal
- Service-specific nurture sequences
- High-priority lead fast-tracking
- Re-engagement automation

---

## Part 1: Create Email Templates

### Step 1: Access Email Template Editor

1. Go to **Marketing** → **Email** → **Email Templates**
2. Click **Create template** → **Drag and drop editor**
3. Choose **Blank template**

### Step 2: Create Each Email Template

Use the content from `hubspot-email-templates.json`. For each template:

#### Template 1: Immediate Welcome Email

**Name:** `AI Chatbot Lead - Immediate Welcome`
**Subject:** `{{contact.firstname}}, let's turn those hours into revenue 🚀`

```html
<!-- Copy HTML from emailTemplates.welcomeEmail.htmlBody in the JSON file -->
```

**HubSpot Personalization Tokens to Use:**
- `{{contact.firstname}}`
- `{{contact.ai_work_type}}`
- `{{contact.ai_hours_per_week}}`
- `{{contact.ai_annual_savings}}`
- `{{contact.ai_roi_percentage}}`
- `{{company.name}}`

**Design Tips:**
- Use HubSpot's drag-and-drop editor
- Add a header with LeniLani logo
- Use call-to-action button module for meeting link
- Mobile-responsive layout
- Brand colors: Primary #0ea5e9, Accent #06b6d4

#### Template 2: High Priority Lead Fast Track

**Name:** `AI Chatbot - High Priority Lead Fast Track`
**Subject:** `{{contact.firstname}}, I'm clearing my calendar for you`

Follow the same process using content from `emailTemplates.highPriorityAlert.htmlBody`

#### Template 3-8: Service-Specific Nurture Emails

Create the remaining templates following the same pattern:
- AI Chatbot Service - Value Nurture
- Business Intelligence - Value Nurture
- System Integration - Value Nurture
- Fractional CTO - Value Nurture
- AI Chatbot Lead - Re-engagement
- Meeting Booked - Confirmation & Prep

---

## Part 2: Build Workflows

### Workflow 1: 🚀 Immediate Welcome & Qualification

**Purpose:** First touch after AI chatbot interaction - establish value, build rapport, drive meeting booking.

#### Setup Instructions:

1. **Create Workflow:**
   - Go to **Automation** → **Workflows**
   - Click **Create workflow**
   - Choose **Contact-based** workflow
   - Choose **Blank workflow**

2. **Set Enrollment Trigger:**
   ```
   Contact Property: hs_analytics_source equals "LeniLani AI Chatbot"
   ```

   *OR if you're using a form:*
   ```
   Contact Property: message contains "LeniLani AI Chatbot"
   ```

3. **Re-enrollment Settings:**
   - ✅ Allow contacts to re-enroll: NO
   - ✅ Suppress for lists: Add "Unsubscribed" and "Bounced" lists

4. **Build Workflow Actions:**

   **Action 1: Delay**
   - Type: Delay
   - Duration: 2 minutes
   - Why: Give the lead time to finish browsing your site

   **Action 2: Send Email**
   - Email: "AI Chatbot Lead - Immediate Welcome"
   - Send from: Reno Provine <reno@lenilani.com>
   - Subject: Auto-filled from template

   **Action 3: Delay**
   - Type: Delay
   - Duration: 3 days

   **Action 4: If/Then Branch**
   - Condition: Meeting booked = No
   - True branch: Continue
   - False branch: End workflow (they booked!)

   **Action 5: Branch by Service Type**
   - Create multiple branches based on `ai_recommended_service`
   - Branch 1: ai_recommended_service = "ai_chatbot" → Send AI Chatbot nurture email
   - Branch 2: ai_recommended_service = "business_intelligence" → Send BI nurture email
   - Branch 3: ai_recommended_service = "system_integration" → Send integration email
   - Branch 4: ai_recommended_service = "fractional_cto" → Send CTO email
   - Default: Send generic nurture email

   **Action 6: Delay**
   - Duration: 4 days

   **Action 7: If/Then Branch (Check Engagement)**
   - Condition: Email opened OR Clicked link in email OR Visited website
   - False branch → Send re-engagement email

5. **Activate Workflow**

---

### Workflow 2: ⚡ High Priority Lead Fast Track

**Purpose:** Immediately flag and fast-track high-value leads for personal outreach.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact Property: ai_lead_priority equals "high"
   ```

3. **Build Actions:**

   **Action 1: Internal Notification**
   - Type: Send internal email notification
   - To: sales@lenilani.com (or your email)
   - Subject: "🚨 HIGH PRIORITY LEAD: {{contact.firstname}} {{contact.lastname}}"
   - Body template:
     ```
     New high-priority lead from AI chatbot!

     Contact: {{contact.firstname}} {{contact.lastname}}
     Email: {{contact.email}}
     Company: {{contact.company}}

     AI Intelligence:
     - Lead Score: {{contact.ai_lead_score}}
     - Recommended Service: {{contact.ai_recommended_service}}
     - Annual Savings Opportunity: ${{contact.ai_annual_savings}}
     - ROI: {{contact.ai_roi_percentage}}%

     ACTION REQUIRED: Personal outreach within 24 hours

     View in HubSpot: [CONTACT_LINK]
     ```

   **Action 2: Create Task**
   - Task type: Call
   - Assign to: Owner (or specific sales rep)
   - Due: Tomorrow
   - Priority: High
   - Subject: "High-priority lead follow-up: {{contact.firstname}}"
   - Notes: Reference AI insights

   **Action 3: Delay**
   - Duration: 30 minutes

   **Action 4: Send Email**
   - Email: "AI Chatbot - High Priority Lead Fast Track"

   **Action 5: Delay**
   - Duration: 1 day

   **Action 6: If/Then Branch**
   - Condition: Meeting booked = No AND Email not opened
   - True: Create high-priority call task
   - False: End workflow

4. **Activate Workflow**

---

### Workflow 3: 🤖 AI Chatbot Nurture Sequence

**Purpose:** Service-specific nurture for leads interested in AI chatbot solutions.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact Property: ai_recommended_service equals "ai_chatbot"
   AND
   Contact Property: Meeting booked = No
   ```

3. **Build Actions:**

   **Action 1: Delay**
   - Duration: 2 days

   **Action 2: Send Email**
   - Email: "AI Chatbot Service - Value Nurture"

   **Action 3: Delay**
   - Duration: 5 days

   **Action 4: If/Then Branch**
   - Condition: Email opened = Yes
   - True: Send case study email/PDF
   - False: Skip

   **Action 5: Delay**
   - Duration: 4 days

   **Action 6: Send Email with ROI Calculator**
   - Create a simple email with link to: https://www.lenilani.com
   - Subject: "Calculate your chatbot ROI"

   **Action 7: Delay**
   - Duration: 7 days

   **Action 8: Final Check & Re-engagement**
   - If no meeting booked → Send "Last chance" email

4. **Activate Workflow**

---

### Workflow 4-6: Service-Specific Nurture Sequences

Follow the same pattern as Workflow 3 for:
- **Business Intelligence Nurture** (ai_recommended_service = "business_intelligence")
- **System Integration Nurture** (ai_recommended_service = "system_integration")
- **Fractional CTO Nurture** (ai_recommended_service = "fractional_cto")

Each should have:
- 2-day initial delay
- Service-specific value email
- 5-day delay
- Resource/case study
- 4-day delay
- Calculator/audit offer
- 7-day delay
- Final value proposition

---

### Workflow 7: 💰 High ROI Opportunity Alert

**Purpose:** Flag leads with significant cost savings or ROI potential for immediate attention.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact Property: ai_annual_savings is greater than 25000
   OR
   Contact Property: ai_roi_percentage is greater than 200
   ```

3. **Build Actions:**

   **Action 1: Internal Alert**
   - Send Slack notification (if integrated) OR email alert
   - Subject: "💰 HIGH ROI OPPORTUNITY: {{contact.firstname}}"

   **Action 2: Create Deal**
   - Deal name: "{{contact.company}} - AI Chatbot Lead"
   - Deal stage: "Qualified Lead"
   - Amount: Calculate from ai_annual_savings (use 20% as deal value estimate)
   - Close date: +30 days

   **Action 3: Assign to Sales Rep**
   - Rotate or assign to specific rep

   **Action 4: Create Multiple Follow-up Tasks**
   - Task 1: Initial outreach (Due: Today)
   - Task 2: Follow-up check (Due: +3 days)
   - Task 3: Decision check-in (Due: +7 days)

4. **Activate Workflow**

---

### Workflow 8: 📅 Meeting Booked Follow-up

**Purpose:** Prepare attendees for meetings and maximize show-up rate.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact has filled out form: Meeting Booking Form
   OR
   Contact Property: Meeting booked = Yes
   ```

3. **Build Actions:**

   **Action 1: Immediate Confirmation**
   - Send email: "Meeting Booked - Confirmation & Prep"
   - Delay: None (immediate)

   **Action 2: Delay Until 1 Day Before**
   - Use "Delay until event" with meeting date

   **Action 3: Send Reminder**
   - Email with Zoom link and prep materials

   **Action 4: Delay Until 1 Hour Before**
   - Use "Delay until event" with meeting date - 1 hour

   **Action 5: If/Then Branch (Has Phone)**
   - If phone number exists → Send SMS reminder
   - If not → Skip

   **Action 6: Post-Meeting Delay**
   - Wait 1 hour after scheduled meeting time

   **Action 7: Send Thank You Email**
   - Include recap and next steps

4. **Activate Workflow**

---

### Workflow 9: ❄️ Cold Lead Re-engagement

**Purpose:** Win back leads that went cold before booking a meeting.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact Property: Last activity date is more than 14 days ago
   AND
   Contact Property: Meeting booked = No
   AND
   Contact Property: Lifecycle stage equals "Lead"
   ```

3. **Re-enrollment:** Allow (check every 7 days)

4. **Build Actions:**

   **Action 1: Send Re-engagement Email**
   - Email: "AI Chatbot Lead - Re-engagement"

   **Action 2: Delay**
   - Duration: 5 days

   **Action 3: If/Then Branch**
   - Condition: Email opened
   - True: Send limited-time offer email
   - False: Continue

   **Action 4: Delay**
   - Duration: 5 days

   **Action 5: Final Branch**
   - If still no engagement → Send "breakup" email
   - If no response → Set lifecycle stage to "Not interested"
   - Remove from all nurture workflows

5. **Activate Workflow**

---

### Workflow 10: 🎯 Post-Meeting Conversion

**Purpose:** Convert meeting attendees into paying customers.

#### Setup Instructions:

1. **Create Workflow** (Contact-based)

2. **Set Enrollment Trigger:**
   ```
   Contact Property: Meeting status = "Completed"
   AND
   Deal stage is not "Closed Won"
   ```

3. **Build Actions:**

   **Action 1: Delay**
   - Duration: 2 hours

   **Action 2: Send Thank You Email**
   - Include meeting recap and key points discussed

   **Action 3: Delay**
   - Duration: 1 day

   **Action 4: Send Proposal**
   - Email with proposal link or PDF attachment

   **Action 5: Delay**
   - Duration: 3 days

   **Action 6: Check-in Email**
   - "Any questions?" follow-up

   **Action 7: Delay**
   - Duration: 4 days

   **Action 8: Social Proof Email**
   - Send testimonials and case studies

   **Action 9: Delay**
   - Duration: 5 days

   **Action 10: Decision Prompt**
   - Final email asking for decision

   **Action 11: If/Then Branch**
   - If deal not closed → Create task for sales rep to call

4. **Activate Workflow**

---

## Part 3: Testing & Quality Assurance

### Test Each Workflow

1. **Create Test Contacts:**
   - Use your own email with +test tags (e.g., reno+test1@lenilani.com)
   - Create different scenarios for each workflow

2. **Test Scenarios:**
   - High priority lead
   - Each service type (AI Chatbot, BI, Integration, CTO)
   - High ROI opportunity ($50k+ savings)
   - Meeting booking and no-show
   - Cold lead re-engagement

3. **Verification Checklist:**
   - ✅ Emails send at correct times
   - ✅ Personalization tokens populate correctly
   - ✅ Branches work as expected
   - ✅ Tasks created properly
   - ✅ Internal notifications fire correctly
   - ✅ Mobile email rendering looks good

### Monitor & Optimize

1. **Key Metrics to Track:**
   - Email open rates (target: 30%+)
   - Click-through rates (target: 5%+)
   - Meeting booking rate (target: 15%+)
   - Show-up rate (target: 70%+)
   - Lead-to-customer conversion (target: 10%+)

2. **A/B Testing Opportunities:**
   - Email subject lines
   - Send time delays
   - Call-to-action copy
   - Email length (short vs. long)

3. **Weekly Review:**
   - Check workflow health in HubSpot
   - Review contacts stuck in workflows
   - Analyze drop-off points
   - Optimize based on data

---

## Part 4: Integration with AI Chatbot

### Ensure Proper Data Flow

The AI chatbot (`index.js`) already pushes contacts with:
- ✅ Email address
- ✅ First name, last name
- ✅ Phone (if provided)
- ✅ Company (if mentioned)
- ✅ Conversation summary
- ✅ All 7 custom properties (ai_lead_score, etc.)
- ✅ Source attribution: "LeniLani AI Chatbot"

### Workflow Triggers

Workflows will automatically enroll contacts when:
1. Contact is created in HubSpot via API
2. Custom properties are set (ai_lead_priority, ai_recommended_service, etc.)
3. Source is set to "LeniLani AI Chatbot"

### Real-Time Testing

Test the full flow:
1. Chat with AI bot at https://ai-bot-special.lenilani.com
2. Provide email and conversation
3. Check HubSpot for contact creation
4. Verify workflow enrollment
5. Confirm email delivery

---

## Part 5: Reporting & Analytics

### Create Dashboard

1. Go to **Reports** → **Dashboards**
2. Create "AI Chatbot Lead Performance" dashboard
3. Add these reports:

   **Report 1: Leads by Source**
   - Filter: Source = "LeniLani AI Chatbot"
   - Metric: Total contacts created this month

   **Report 2: Lead Score Distribution**
   - Chart: Histogram of ai_lead_score
   - Shows quality of incoming leads

   **Report 3: Service Interest Breakdown**
   - Pie chart: ai_recommended_service distribution
   - Shows which services are most popular

   **Report 4: Workflow Performance**
   - Email performance by workflow
   - Open rates, click rates, conversions

   **Report 5: Meeting Booking Funnel**
   - Total leads → Emails sent → Clicked → Booked → Showed up

   **Report 6: Revenue Attribution**
   - Deals created from AI chatbot source
   - Pipeline value
   - Closed-won revenue

---

## Troubleshooting

### Common Issues

**Issue: Contacts not enrolling in workflows**
- Check enrollment criteria match contact properties
- Verify contact meets ALL conditions (not just one)
- Check if contact was previously suppressed
- Review re-enrollment settings

**Issue: Emails not sending**
- Verify email templates are published
- Check contact has valid email address
- Review email subscription status
- Check if contact previously unsubscribed

**Issue: Personalization tokens showing blank**
- Ensure custom properties are populated for the contact
- Check property internal names match tokens
- Use default values in templates: `{{contact.firstname|default:"there"}}`

**Issue: Delays not working as expected**
- Check timezone settings in HubSpot
- Review delay type (duration vs. specific date)
- Verify workflow is active

---

## Next Steps

1. ✅ Custom properties created (already done)
2. 📧 Create 8 email templates using provided copy
3. 🔄 Build 10 workflows using step-by-step instructions above
4. 🧪 Test each workflow with test contacts
5. 📊 Set up reporting dashboard
6. 🚀 Activate all workflows
7. 📈 Monitor and optimize based on performance

---

## Support & Resources

- **HubSpot Academy:** Free certification courses on workflows and email marketing
- **HubSpot Community:** https://community.hubspot.com
- **Email Template Best Practices:** https://knowledge.hubspot.com/email/create-marketing-emails
- **Workflow Limits:** Check your HubSpot tier for active workflow limits

---

**Questions?** Review `hubspot-email-templates.json` for full email copy and `create-hubspot-workflows.js` for workflow architecture details.

**Pro Tip:** Start with Workflow 1 (Immediate Welcome) and Workflow 2 (High Priority) first. These will have the most immediate impact on lead conversion.
