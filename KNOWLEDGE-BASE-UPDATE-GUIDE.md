# Knowledge Base Update Guide

This guide explains how to keep the LeniLani AI chatbot's knowledge base up-to-date with the latest company information.

## Knowledge Base File

**Location**: `lenilani-knowledge-base.md`

This file contains all verified information about LeniLani Consulting that the AI chatbot uses to answer questions accurately.

## Sources to Check for Updates

The knowledge base pulls information from:

1. **Main Website**: https://www.lenilani.com
2. **Hawaii Site**: https://hawaii.lenilani.com
3. **Blog**: https://blog.lenilani.com
4. **Services Page**: https://www.lenilani.com/services
5. **About Page**: https://www.lenilani.com/about
6. **All other LeniLani subdomains**

## When to Update

Update the knowledge base when:

- New services are added
- Pricing changes
- Team members join or change roles
- Contact information changes
- New case studies or client testimonials are added
- Company policies or processes change
- New blog posts with important information are published
- Special promotions or offers are launched
- Performance metrics are updated

## How to Update

### Method 1: Manual Update (Quick Changes)

1. Open `lenilani-knowledge-base.md`
2. Locate the relevant section
3. Make your changes
4. Save the file
5. The server will automatically reload with the new information (if using `npm run dev`)

### Method 2: Fetch from Websites (Major Updates)

Use this process to pull fresh content from all LeniLani domains:

```bash
# 1. Ask Claude Code or another AI assistant to fetch updated content:
# "Please fetch the latest information from www.lenilani.com, hawaii.lenilani.com,
#  and all subdomains, then update the lenilani-knowledge-base.md file"

# 2. The AI will use WebFetch to pull current content
# 3. Review the changes before saving
# 4. Test the chatbot to ensure accuracy
```

### Method 3: Using the Provided Script (Future Enhancement)

A script can be created to automatically fetch and update the knowledge base:

```javascript
// update-knowledge-base.js (to be created if needed)
// This would fetch from all LeniLani domains and update the MD file
```

## Testing After Updates

After updating the knowledge base:

1. Restart the server: `npm run dev` or `npm start`
2. Open http://localhost:3000
3. Test by asking questions related to your updates:
   - "What are your pricing options?"
   - "Tell me about your team"
   - "What services do you offer?"
   - "How do I contact LeniLani?"

4. Verify the AI provides accurate, updated information

## Knowledge Base Structure

The knowledge base is organized into sections:

- **Company Overview**: Mission, values, history
- **Leadership Team**: Bios and roles
- **Core Services**: Detailed service descriptions
- **Pricing & Packages**: All pricing information
- **Key Performance Metrics**: Client results and statistics
- **Contact Information**: All ways to reach LeniLani
- **Notable Clients**: Client list and testimonials
- **Technology Stack**: Technical capabilities
- **Competitive Advantages**: What makes LeniLani unique
- **FAQ**: Common questions and answers

## Best Practices

1. **Always include sources**: Note where information came from
2. **Date your updates**: Update the "Last Updated" date at the top
3. **Be specific**: Include exact numbers, dates, and details
4. **Verify accuracy**: Double-check all facts before adding
5. **Maintain formatting**: Keep the markdown structure consistent
6. **Test thoroughly**: Always test the chatbot after major changes

## Maintenance Schedule

**Recommended Update Frequency**:
- Monthly: Review for any changes
- Quarterly: Full audit of all information
- As needed: Immediate updates for pricing, team, or service changes

## Version Control

The knowledge base is tracked in git. Before making major changes:

```bash
# Create a backup branch
git checkout -b knowledge-base-update-[date]

# Make your changes to lenilani-knowledge-base.md

# Commit the changes
git add lenilani-knowledge-base.md
git commit -m "Update knowledge base: [description of changes]"

# Test thoroughly, then merge back to main
git checkout main
git merge knowledge-base-update-[date]
```

## Troubleshooting

### Issue: Chatbot not using updated information
**Solution**:
- Verify the file was saved
- Restart the server manually
- Check for syntax errors in the markdown

### Issue: Server crashes after update
**Solution**:
- Check `index.js` line 14-17 for any file reading errors
- Verify `lenilani-knowledge-base.md` exists in the root directory
- Check for special characters that might break parsing

### Issue: Information contradicts between knowledge base and website
**Solution**:
- Trust the website as the source of truth
- Update the knowledge base to match
- Document when the discrepancy was found

## Contact

For questions about updating the knowledge base:
- Email: info@lenilani.com
- Phone: 808-766-1164

---

**Last Updated**: October 23, 2024
