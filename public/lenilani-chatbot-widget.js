/**
 * LeniLani AI Chatbot Widget
 * Embeddable chatbot for websites
 *
 * Usage: Add this script tag to your website:
 * <script src="https://ai-bot-special.lenilani.com/lenilani-chatbot-widget.js"></script>
 */

(function() {
    // Configuration
    const API_BASE_URL = 'https://ai-bot-special.lenilani.com';

    // Prevent multiple initializations
    if (window.LeniLaniChatbotInitialized) {
        console.warn('LeniLani Chatbot already initialized');
        return;
    }
    window.LeniLaniChatbotInitialized = true;

    // Session management
    let sessionId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let currentLanguageMode = 'english';
    let isOpen = false;

    // Create styles
    const styles = `
        #lenilani-chatbot-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            z-index: 999999;
        }

        #lenilani-chat-button {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(13, 115, 119, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
            position: relative;
        }

        #lenilani-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(13, 115, 119, 0.5);
        }

        #lenilani-chat-button.open {
            background: #e74c3c;
        }

        #lenilani-chat-window {
            display: none;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 400px;
            height: 650px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            flex-direction: column;
            overflow: hidden;
        }

        #lenilani-chat-window.open {
            display: flex;
        }

        @media (max-width: 768px) {
            #lenilani-chat-window {
                bottom: 0;
                right: 0;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                border-radius: 0;
            }

            #lenilani-chatbot-container {
                bottom: 10px;
                right: 10px;
            }

            #lenilani-chat-button {
                width: 56px;
                height: 56px;
                font-size: 24px;
            }
        }

        .lenilani-chat-header {
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }

        .lenilani-chat-header-content {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .lenilani-header-text {
            flex: 1;
        }

        .lenilani-chat-header h3 {
            margin: 0;
            font-size: 16px;
            margin-bottom: 3px;
        }

        .lenilani-chat-header p {
            margin: 0;
            font-size: 10px;
            opacity: 0.9;
        }

        .lenilani-close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
            margin-left: 10px;
        }

        .lenilani-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .lenilani-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8f9fa;
        }

        .lenilani-message {
            max-width: 80%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            animation: lenilaniMessageFadeIn 0.3s ease-in;
        }

        @keyframes lenilaniMessageFadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .lenilani-user-message {
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            align-self: flex-end;
        }

        .lenilani-bot-message {
            background: white;
            color: #333;
            align-self: flex-start;
            white-space: pre-wrap;
            line-height: 1.6;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .lenilani-typing {
            display: none;
            align-self: flex-start;
            padding: 12px 16px;
            background: white;
            border-radius: 18px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .lenilani-typing.active {
            display: block;
        }

        .lenilani-typing span {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #999;
            margin: 0 2px;
            animation: lenilaniTyping 1.4s infinite;
        }

        .lenilani-typing span:nth-child(2) {
            animation-delay: 0.2s;
        }

        .lenilani-typing span:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes lenilaniTyping {
            0%, 60%, 100% {
                transform: translateY(0);
            }
            30% {
                transform: translateY(-10px);
            }
        }

        .lenilani-chat-input {
            padding: 16px 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
            background: white;
        }

        .lenilani-chat-input input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e9ecef;
            border-radius: 20px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s;
        }

        .lenilani-chat-input input:focus {
            border-color: #0d7377;
        }

        .lenilani-chat-input button {
            padding: 10px 18px;
            background: linear-gradient(135deg, #0d7377 0%, #14919d 100%);
            color: white;
            border: none;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .lenilani-chat-input button:hover {
            transform: scale(1.05);
        }

        .lenilani-suggestions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            align-self: flex-start;
            max-width: 80%;
        }

        .lenilani-suggestion-btn {
            padding: 8px 14px;
            background: white;
            border: 2px solid #0d7377;
            color: #0d7377;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
        }

        .lenilani-suggestion-btn:hover {
            background: #0d7377;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(13, 115, 119, 0.3);
        }

        .lenilani-quickstart {
            padding: 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .lenilani-quickstart-title {
            font-size: 9px;
            color: #6c757d;
            margin-bottom: 8px;
            text-align: center;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .lenilani-quickstart-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .lenilani-quickstart-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 12px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .lenilani-quickstart-btn:hover {
            border-color: #0d7377;
            background: #e6f7f7;
            transform: translateY(-2px);
        }

        .lenilani-quickstart-icon {
            font-size: 20px;
            margin-bottom: 4px;
        }

        .lenilani-quickstart-label {
            font-size: 10px;
            color: #333;
            font-weight: 500;
        }

        /* Social proof banner */
        .lenilani-social-proof {
            background: linear-gradient(135deg, #e6f7f7 0%, #d1f0f0 100%);
            border-bottom: 1px solid #a8dede;
            padding: 8px 12px;
            font-size: 11px;
            color: #0d7377;
            text-align: center;
            font-weight: 500;
        }

        .lenilani-social-stats {
            display: flex;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .lenilani-stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .lenilani-stat-item strong {
            color: #075985;
        }

        /* Language selector */
        .lenilani-language-selector {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
        }

        .lenilani-language-label {
            font-size: 10px;
            font-weight: 600;
            opacity: 0.9;
            white-space: nowrap;
        }

        .lenilani-language-select {
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 12px;
            color: white;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
        }

        .lenilani-language-select option {
            background: #0ea5e9;
            color: white;
        }

        /* Actions footer */
        .lenilani-actions {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-top: 1px solid #e9ecef;
            flex-wrap: wrap;
            background: white;
        }

        .lenilani-action-btn {
            padding: 8px 14px;
            border-radius: 18px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            border: none;
        }

        .lenilani-human-btn {
            background: #2ecc71;
            color: white;
        }

        .lenilani-human-btn:hover {
            background: #27ae60;
            transform: scale(1.05);
        }

        .lenilani-clear-btn {
            background: #e74c3c;
            color: white;
        }

        .lenilani-clear-btn:hover {
            background: #c0392b;
            transform: scale(1.05);
        }

        /* Escalation card */
        .lenilani-escalation {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 12px;
            padding: 12px;
            margin: 10px 0;
        }

        .lenilani-escalation h4 {
            color: #856404;
            margin: 0 0 8px 0;
            font-size: 14px;
        }

        .lenilani-escalation p {
            color: #856404;
            margin: 0 0 10px 0;
            font-size: 12px;
            line-height: 1.6;
        }

        .lenilani-contact-options {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .lenilani-contact-btn {
            padding: 8px 14px;
            background: #ffc107;
            color: #856404;
            border: none;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
        }

        .lenilani-contact-btn:hover {
            background: #ffb300;
            transform: translateY(-2px);
        }

        /* Response time notice */
        .lenilani-response-notice {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border-left: 4px solid #4caf50;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 10px 0;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.15);
        }

        .lenilani-response-notice p {
            margin: 0;
            color: #1b5e20;
            font-size: 12px;
            line-height: 1.5;
        }

        .lenilani-response-notice strong {
            font-weight: 700;
            color: #1b5e20;
        }

        /* Notification badge */
        .lenilani-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #e74c3c;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            animation: lenilaniPulse 2s infinite;
        }

        @keyframes lenilaniPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.1);
            }
        }
    `;

    // Inject styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create HTML structure
    const container = document.createElement('div');
    container.id = 'lenilani-chatbot-container';
    container.innerHTML = `
        <button id="lenilani-chat-button" aria-label="Open chat">
            💬
        </button>
        <div id="lenilani-chat-window">
            <div class="lenilani-chat-header">
                <div class="lenilani-chat-header-content">
                    <div class="lenilani-header-text">
                        <h3>LeniLani AI</h3>
                        <p>AI & Technology Solutions</p>
                    </div>
                    <div class="lenilani-language-selector">
                        <span class="lenilani-language-label">Language:</span>
                        <select class="lenilani-language-select" id="lenilani-language">
                            <option value="english">English</option>
                            <option value="pidgin">Pidgin</option>
                            <option value="olelo">ʻŌlelo Hawaiʻi</option>
                        </select>
                    </div>
                </div>
                <button class="lenilani-close-btn" aria-label="Close chat">×</button>
            </div>
            <div class="lenilani-quickstart" id="lenilani-quickstart">
                <div class="lenilani-quickstart-title">Quick Start</div>
                <div class="lenilani-quickstart-buttons">
                    <div class="lenilani-quickstart-btn" data-message="I need help automating repetitive tasks">
                        <div class="lenilani-quickstart-icon">🤖</div>
                        <div class="lenilani-quickstart-label">AI Automation</div>
                    </div>
                    <div class="lenilani-quickstart-btn" data-message="I want to build a custom chatbot">
                        <div class="lenilani-quickstart-icon">💬</div>
                        <div class="lenilani-quickstart-label">Chatbot</div>
                    </div>
                    <div class="lenilani-quickstart-btn" data-message="We need help analyzing our business data">
                        <div class="lenilani-quickstart-icon">📊</div>
                        <div class="lenilani-quickstart-label">Analytics</div>
                    </div>
                    <div class="lenilani-quickstart-btn" data-message="I want to book a consultation">
                        <div class="lenilani-quickstart-icon">📅</div>
                        <div class="lenilani-quickstart-label">Consultation</div>
                    </div>
                </div>
            </div>
            <div class="lenilani-chat-messages" id="lenilani-messages">
                <div class="lenilani-message lenilani-bot-message">
                    Aloha! 👋 I'm here to help you explore how AI and tech can help your business. What brings you here today?
                </div>
            </div>
            <div class="lenilani-typing" id="lenilani-typing">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="lenilani-actions">
                <button class="lenilani-action-btn lenilani-clear-btn" id="lenilani-clear">Clear Chat</button>
                <button class="lenilani-action-btn lenilani-human-btn" id="lenilani-human">👤 Talk to Human</button>
            </div>
            <div class="lenilani-chat-input">
                <input
                    type="text"
                    id="lenilani-input"
                    placeholder="Type your message..."
                />
                <button id="lenilani-send">Send</button>
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Get elements
    const chatButton = document.getElementById('lenilani-chat-button');
    const chatWindow = document.getElementById('lenilani-chat-window');
    const closeBtn = container.querySelector('.lenilani-close-btn');
    const messagesContainer = document.getElementById('lenilani-messages');
    const input = document.getElementById('lenilani-input');
    const sendButton = document.getElementById('lenilani-send');
    const typingIndicator = document.getElementById('lenilani-typing');
    const quickstart = document.getElementById('lenilani-quickstart');
    const languageSelect = document.getElementById('lenilani-language');
    const clearButton = document.getElementById('lenilani-clear');
    const humanButton = document.getElementById('lenilani-human');

    // Toggle chat
    function toggleChat() {
        isOpen = !isOpen;
        chatWindow.classList.toggle('open');
        chatButton.classList.toggle('open');
        chatButton.textContent = isOpen ? '×' : '💬';

        if (isOpen) {
            input.focus();
        }
    }

    chatButton.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Smart scroll
    function smartScroll(force = false) {
        if (force) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            return;
        }

        const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 150;
        if (isNearBottom) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // Add message
    function addMessage(text, sender, suggestions = null) {
        // Remove existing suggestions
        const existingSuggestions = messagesContainer.querySelector('.lenilani-suggestions');
        if (existingSuggestions) {
            existingSuggestions.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('lenilani-message', `lenilani-${sender}-message`);
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);

        // Add suggestions
        if (sender === 'bot' && suggestions && suggestions.length > 0) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.classList.add('lenilani-suggestions');

            suggestions.forEach(suggestion => {
                if (suggestion.startsWith('Email:')) {
                    const email = suggestion.split('Email:')[1].trim();
                    const link = document.createElement('a');
                    link.classList.add('lenilani-suggestion-btn');
                    link.href = `mailto:${email}`;
                    link.textContent = `📧 ${email}`;
                    suggestionsContainer.appendChild(link);
                } else if (suggestion.startsWith('Call:')) {
                    const phone = suggestion.split('Call:')[1].trim();
                    const link = document.createElement('a');
                    link.classList.add('lenilani-suggestion-btn');
                    link.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
                    link.textContent = `📞 ${phone}`;
                    suggestionsContainer.appendChild(link);
                } else {
                    const button = document.createElement('button');
                    button.classList.add('lenilani-suggestion-btn');
                    button.textContent = suggestion;
                    button.onclick = () => {
                        suggestionsContainer.remove();
                        sendMessage(suggestion);
                    };
                    suggestionsContainer.appendChild(button);
                }
            });

            messagesContainer.appendChild(suggestionsContainer);
        }

        smartScroll(sender === 'user');
    }

    // Send message
    async function sendMessage(message = null) {
        const text = message || input.value.trim();
        if (!text) return;

        if (!message) {
            input.value = '';
        }

        // Hide quickstart
        if (quickstart.style.display !== 'none') {
            quickstart.style.display = 'none';
        }

        addMessage(text, 'user');

        // Show typing
        typingIndicator.classList.add('active');
        smartScroll(false);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: sessionId,
                    languageMode: currentLanguageMode
                }),
            });

            const data = await response.json();
            typingIndicator.classList.remove('active');

            if (response.ok) {
                addMessage(data.response, 'bot', data.suggestions);
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            typingIndicator.classList.remove('active');
            addMessage('Sorry, I could not connect. Please try again.', 'bot');
            console.error('Error:', error);
        }
    }

    // Event listeners
    sendButton.addEventListener('click', () => sendMessage());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Quickstart buttons
    const quickstartButtons = container.querySelectorAll('.lenilani-quickstart-btn');
    quickstartButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const message = btn.dataset.message;
            sendMessage(message);
        });
    });

    // Language selector
    languageSelect.addEventListener('change', (e) => {
        currentLanguageMode = e.target.value;
        console.log(`Language changed to: ${currentLanguageMode}`);
    });

    // Clear chat
    async function clearChat() {
        try {
            await fetch(`${API_BASE_URL}/reset`, {
                method: 'POST',
            });

            messagesContainer.innerHTML = `
                <div class="lenilani-message lenilani-bot-message">
                    Aloha! 👋 I'm here to help you explore how AI and tech can help your business. What brings you here today?
                </div>
            `;

            // Show quickstart buttons again
            quickstart.style.display = 'block';
        } catch (error) {
            console.error('Error clearing chat:', error);
        }
    }

    // Request human help
    function requestHumanHelp() {
        showEscalationCard();
    }

    // Show escalation card
    function showEscalationCard() {
        // Remove any existing escalation card and notice
        const existingEscalation = messagesContainer.querySelector('.lenilani-escalation');
        const existingNotice = messagesContainer.querySelector('.lenilani-response-notice');
        if (existingEscalation) existingEscalation.remove();
        if (existingNotice) existingNotice.remove();

        // Add response time notice
        const noticeDiv = document.createElement('div');
        noticeDiv.classList.add('lenilani-response-notice');
        noticeDiv.innerHTML = `
            <p>⚡ <strong>5-Minute Response Guarantee:</strong> Reno personally responds to all inquiries within 5 minutes during business hours (Mon-Fri, 9AM-5PM HST)</p>
        `;
        messagesContainer.appendChild(noticeDiv);

        // Add escalation card
        const escalationCard = document.createElement('div');
        escalationCard.classList.add('lenilani-escalation');
        escalationCard.innerHTML = `
            <h4>👤 Connect with Reno</h4>
            <p>Aloha! Reno would love to help you personally. Here's how you can reach him:</p>
            <div class="lenilani-contact-options">
                <a href="mailto:reno@lenilani.com" class="lenilani-contact-btn">
                    📧 Email Reno
                </a>
                <a href="tel:+18087661164" class="lenilani-contact-btn">
                    📞 Call (808) 766-1164
                </a>
                <button class="lenilani-contact-btn" onclick="this.closest('.lenilani-escalation').remove(); document.querySelector('.lenilani-response-notice').remove();">
                    ✕ Continue with AI
                </button>
            </div>
        `;

        messagesContainer.appendChild(escalationCard);

        // Smooth scroll
        setTimeout(() => {
            noticeDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    // Event listeners for action buttons
    clearButton.addEventListener('click', clearChat);
    humanButton.addEventListener('click', requestHumanHelp);

    console.log('🤖 LeniLani AI Chatbot Widget loaded successfully');
})();
