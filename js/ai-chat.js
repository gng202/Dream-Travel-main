/* Dream Travel AI Chat widget - Frontend Fix */
const GEMINI_API_KEY = 'AQ.Ab8RN6KtiwDyLn5Um9i3EMoT4_DK-fazYXKOs4hqFdltKbdfnA'; // Your API Key

const DreamAIChat = {
    chatOpen: false,
    isTyping: false,
    chatHistory: [], // Stores conversation for context

    init: function() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    },

    start: function() {
        this.injectUI();
        this.bindEvents();
        this.renderWelcomeMessage();
    },

    injectUI: function() {
        if (document.getElementById('dream-ai-widget-root')) return;

        const widgetRoot = document.createElement('div');
        widgetRoot.id = 'dream-ai-widget-root';
        widgetRoot.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999;';

        // Toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'dream-ai-button';
        toggleBtn.className = 'btn btn-primary rounded-circle shadow d-flex align-items-center justify-content-center';
        toggleBtn.style.cssText = 'width: 60px; height: 60px;';
        toggleBtn.setAttribute('aria-label', 'Open Dream AI chat');
        const toggleIcon = document.createElement('i');
        toggleIcon.className = 'fa-solid fa-robot fa-2x';
        toggleBtn.appendChild(toggleIcon);
        widgetRoot.appendChild(toggleBtn);

        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.id = 'dream-ai-chat-window';
        chatWindow.className = 'card shadow d-none flex-column';
        chatWindow.style.cssText = 'width: 350px; height: 500px; position: absolute; bottom: 80px; right: 0; border-radius: 15px; overflow: hidden;';

        // Header
        const header = document.createElement('div');
        header.className = 'card-header bg-primary text-white d-flex justify-content-between align-items-center p-3';
        const headerLeft = document.createElement('div');
        headerLeft.className = 'd-flex align-items-center gap-2';
        const brainIcon = document.createElement('i');
        brainIcon.className = 'fa-solid fa-brain';
        const title = document.createElement('span');
        title.className = 'fw-bold';
        title.textContent = 'Dream AI';
        headerLeft.appendChild(brainIcon);
        headerLeft.appendChild(title);
        const closeBtn = document.createElement('button');
        closeBtn.id = 'dream-ai-close-button';
        closeBtn.className = 'btn btn-sm btn-outline-light border-0';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fa-solid fa-xmark';
        closeBtn.appendChild(closeIcon);
        header.appendChild(headerLeft);
        header.appendChild(closeBtn);
        chatWindow.appendChild(header);

        // Messages container
        const messages = document.createElement('div');
        messages.id = 'dream-ai-messages';
        messages.className = 'card-body bg-light overflow-auto p-3';
        messages.style.flexGrow = '1';
        chatWindow.appendChild(messages);

        // Footer with suggestions and form
        const footer = document.createElement('div');
        footer.className = 'card-footer bg-white p-2';

        const suggestions = document.createElement('div');
        suggestions.id = 'dream-ai-suggestions';
        suggestions.className = 'd-flex gap-2 overflow-auto mb-2';
        suggestions.style.whiteSpace = 'nowrap';

        const chip1 = document.createElement('button');
        chip1.className = 'btn btn-sm btn-outline-secondary dream-ai-chip';
        chip1.textContent = 'Bali itinerary';
        const chip2 = document.createElement('button');
        chip2.className = 'btn btn-sm btn-outline-secondary dream-ai-chip';
        chip2.textContent = 'Packing checklist';
        suggestions.appendChild(chip1);
        suggestions.appendChild(chip2);
        footer.appendChild(suggestions);

        const form = document.createElement('form');
        form.id = 'dream-ai-form';
        form.className = 'd-flex gap-2';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'dream-ai-input';
        input.className = 'form-control';
        input.placeholder = 'Ask Dream AI...';
        input.required = true;
        input.autocomplete = 'off';
        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.className = 'btn btn-primary';
        const sendIcon = document.createElement('i');
        sendIcon.className = 'fa-solid fa-paper-plane';
        submitBtn.appendChild(sendIcon);
        form.appendChild(input);
        form.appendChild(submitBtn);
        footer.appendChild(form);
        chatWindow.appendChild(footer);

        widgetRoot.appendChild(chatWindow);
        document.body.appendChild(widgetRoot);
    },

    bindEvents: function() {
        const toggle = document.getElementById('dream-ai-button');
        const close = document.getElementById('dream-ai-close-button');
        const form = document.getElementById('dream-ai-form');
        const chips = document.querySelectorAll('.dream-ai-chip');
        const input = document.getElementById('dream-ai-input');

        toggle?.addEventListener('click', () => this.toggleChatWindow());
        close?.addEventListener('click', () => this.closeChatWindow());

        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                const text = chip.textContent?.trim();
                if (text) this.submitText(text);
            });
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const text = input?.value.trim();
            if (!text || this.isTyping) return;
            this.submitText(text);
            if (input) input.value = '';
        });
    },

    toggleChatWindow: function() {
        const windowEl = document.getElementById('dream-ai-chat-window');
        this.chatOpen = !this.chatOpen;
        windowEl.classList.toggle('d-none', !this.chatOpen);
        windowEl.classList.toggle('d-flex', this.chatOpen);
    },

    closeChatWindow: function() {
        const windowEl = document.getElementById('dream-ai-chat-window');
        this.chatOpen = false;
        windowEl.classList.add('d-none');
        windowEl.classList.remove('d-flex');
    },

    submitText: function(text) {
        this.addUserMessage(text);
        this.requestAIReply(text);
    },

    addUserMessage: function(text) {
        const container = document.getElementById('dream-ai-messages');
        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex justify-content-end mb-3';
        const bubble = document.createElement('div');
        bubble.className = 'bg-primary text-white p-2 rounded-3';
        bubble.style.maxWidth = '80%';
        bubble.textContent = text; // textContent prevents XSS
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;

        // Save to Gemini's expected format
        this.chatHistory.push({ role: 'user', parts: [{ text: text }] });
    },

    addBotMessage: function(text) {
        const container = document.getElementById('dream-ai-messages');
        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex justify-content-start mb-3';
        const bubble = document.createElement('div');
        bubble.className = 'bg-white border p-2 rounded-3';
        bubble.style.maxWidth = '80%';
        bubble.innerHTML = this.formatText(text); // formatText escapes HTML then adds formatting
        wrapper.appendChild(bubble);
        container.appendChild(wrapper);
        container.scrollTop = container.scrollHeight;

        // Save to Gemini's expected format
        this.chatHistory.push({ role: 'model', parts: [{ text: text }] });
    },

    showTypingIndicator: function() {
        const container = document.getElementById('dream-ai-messages');
        const indicator = document.createElement('div');
        indicator.id = 'dream-ai-typing';
        indicator.className = 'text-muted small mb-3';
        indicator.textContent = 'Typing...';
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    },

    removeTypingIndicator: function() {
        const indicator = document.getElementById('dream-ai-typing');
        if (indicator) indicator.remove();
    },

    requestAIReply: async function(prompt) {
        if (this.isTyping) return;
        this.isTyping = true;
        this.showTypingIndicator();

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Pass the whole chat history so it remembers the conversation
                    contents: this.chatHistory 
                })
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const json = await response.json();
            const reply = json.candidates[0].content.parts[0].text;
            
            this.removeTypingIndicator();
            this.addBotMessage(reply);

        } catch (error) {
            console.error('API Error:', error);
            this.removeTypingIndicator();
            this.addBotMessage('Xin lỗi, tôi không thể kết nối tới Google Gemini lúc này.');
        } finally {
            this.isTyping = false;
        }
    },

    renderWelcomeMessage: function() {
        const text = 'Hello! I am Dream AI. Ask me about travel destinations, itineraries, hotels, weather, or visa tips.';
        this.addBotMessage(text);
        // Clear history so it only starts with the welcome message
        this.chatHistory = [{ role: 'model', parts: [{ text: text }] }];
    },

    escapeHtml: function(value) {
        // Use a text node to let the browser handle HTML escaping safely
        const div = document.createElement('div');
        div.textContent = String(value);
        return div.innerHTML.replace(/\n/g, '<br>');
    },

    formatText: function(value) {
        return this.escapeHtml(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
};

DreamAIChat.init();