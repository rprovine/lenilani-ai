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
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            transition: all 0.3s;
            position: relative;
        }

        #lenilani-chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 20px rgba(14, 165, 233, 0.5);
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
            height: 600px;
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
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            padding: 20px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .lenilani-chat-header-content {
            flex: 1;
        }

        .lenilani-chat-header h3 {
            margin: 0;
            font-size: 18px;
            margin-bottom: 5px;
        }

        .lenilani-chat-header p {
            margin: 0;
            font-size: 12px;
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
            padding: 20px;
            border-top: 1px solid #e9ecef;
            display: flex;
            gap: 10px;
            background: white;
        }

        .lenilani-chat-input input {
            flex: 1;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 25px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.3s;
        }

        .lenilani-chat-input input:focus {
            border-color: #0ea5e9;
        }

        .lenilani-chat-input button {
            padding: 12px 20px;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            color: white;
            border: none;
            border-radius: 25px;
            font-size: 14px;
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
            border: 2px solid #0ea5e9;
            color: #0ea5e9;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            text-decoration: none;
            display: inline-block;
        }

        .lenilani-suggestion-btn:hover {
            background: #0ea5e9;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        }

        .lenilani-quickstart {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }

        .lenilani-quickstart-title {
            font-size: 11px;
            color: #6c757d;
            margin-bottom: 10px;
            text-align: center;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .lenilani-quickstart-buttons {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        .lenilani-quickstart-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
        }

        .lenilani-quickstart-btn:hover {
            border-color: #0ea5e9;
            background: #f0f9ff;
            transform: translateY(-2px);
        }

        .lenilani-quickstart-icon {
            font-size: 24px;
            margin-bottom: 6px;
        }

        .lenilani-quickstart-label {
            font-size: 11px;
            color: #333;
            font-weight: 500;
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
                    <h3>LeniLani AI</h3>
                    <p>AI & Technology Solutions</p>
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

    console.log('🤖 LeniLani AI Chatbot Widget loaded successfully');
})();
