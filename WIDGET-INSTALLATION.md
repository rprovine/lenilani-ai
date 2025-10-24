# LeniLani AI Chatbot Widget - Installation Guide

## Quick Installation

Add this single line of code before the closing `</body>` tag on any page where you want the chatbot:

```html
<script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
```

That's it! The chatbot will appear as a floating button in the bottom-right corner of your website.

## Features

- **Floating Chat Button**: Appears in bottom-right corner
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Full-Screen on Mobile**: Expands to full screen on small devices
- **Quick Start Buttons**: Pre-defined conversation starters
- **Smart Suggestions**: Context-aware quick replies
- **Lead Capture**: Automatically captures emails and names
- **HubSpot Integration**: Leads are automatically sent to HubSpot
- **Session Persistence**: Maintains conversation across page loads

## Complete Example

Here's a complete HTML page example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LeniLani Consulting</title>
</head>
<body>
    <h1>Welcome to LeniLani Consulting</h1>
    <p>Your content here...</p>

    <!-- Add the chatbot widget -->
    <script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
</body>
</html>
```

## For WordPress

### Option 1: Footer Scripts Plugin

1. Install a plugin like "Insert Headers and Footers" or "WPCode"
2. Add this code to the footer section:

```html
<script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
```

### Option 2: Theme Footer (functions.php)

Add this code to your theme's `functions.php`:

```php
function add_lenilani_chatbot() {
    ?>
    <script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
    <?php
}
add_action('wp_footer', 'add_lenilani_chatbot');
```

## For Shopify

1. Go to **Online Store** > **Themes**
2. Click **Actions** > **Edit code**
3. Find the `theme.liquid` file
4. Add this code before the closing `</body>` tag:

```html
<script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
```

## For Squarespace

1. Go to **Settings** > **Advanced** > **Code Injection**
2. Paste this code in the **Footer** section:

```html
<script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
```

## For Wix

1. Go to your Wix Editor
2. Click **Settings** in the left menu
3. Click **Custom Code** under **Advanced**
4. Click **+ Add Custom Code**
5. Paste the script and select "Body - end"

## Testing

After installation:

1. Visit your website
2. You should see a blue chat button (💬) in the bottom-right corner
3. Click it to open the chat window
4. Try sending a message to verify it's working

## Customization Options

The widget uses inline styles and doesn't conflict with your website's CSS. However, you can customize it by modifying the widget file or overriding styles:

### Change Chat Button Position

```html
<style>
#lenilani-chatbot-container {
    bottom: 100px !important;  /* Move up */
    right: 100px !important;   /* Move left */
}
</style>
```

### Change Colors

```html
<style>
#lenilani-chat-button {
    background: linear-gradient(135deg, #your-color 0%, #your-color2 100%) !important;
}
</style>
```

## Troubleshooting

### Chatbot doesn't appear

1. Check browser console for errors (F12 > Console)
2. Verify the script URL is correct
3. Make sure there are no JavaScript errors on your page blocking execution
4. Clear your browser cache

### Chat button appears but doesn't work

1. Check your browser console for network errors
2. Verify `https://ai-bot-special.lenilani.com` is accessible
3. Check if any browser extensions are blocking the connection

### Multiple chat buttons appear

This usually means the script is loaded multiple times. Check:
- Theme footer
- Plugin settings
- Page builder widgets
- Custom code sections

Remove duplicate script tags.

## Support

For questions or issues:
- Email: reno@lenilani.com
- Phone: (808) 766-1164

## Advanced: Loading Widget Conditionally

If you only want the chatbot on certain pages:

```html
<script>
// Only load on specific pages
if (window.location.pathname === '/contact' || window.location.pathname === '/services') {
    var script = document.createElement('script');
    script.src = 'https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js';
    document.body.appendChild(script);
}
</script>
```

## Privacy & Data

The chatbot:
- Creates anonymous session IDs for conversation tracking
- Captures email addresses and names when voluntarily provided
- Sends lead data to HubSpot CRM
- Does not use cookies
- Uses localStorage for session persistence
- Complies with GDPR and CCPA requirements

Add a privacy notice to your website if required by local regulations.
