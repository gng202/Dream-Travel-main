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

        // The HTML for your widget remains the same
        const widgetHTML = `
            <div id="dream-ai-widget-root" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
                <button id="dream-ai-button" class="btn btn-primary rounded-circle shadow d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;" aria-label="Open Dream AI chat">
                    <i class="fa-solid fa-robot fa-2x"></i>
                </button>

                <div id="dream-ai-chat-window" class="card shadow d-none flex-column" style="width: 350px; height: 500px; position: absolute; bottom: 80px; right: 0; border-radius: 15px; overflow: hidden;">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="fa-solid fa-brain"></i>
                            <span class="fw-bold">Dream AI</span>
                        </div>
                        <button id="dream-ai-close-button" class="btn btn-sm btn-outline-light border-0"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div id="dream-ai-messages" class="card-body bg-light overflow-auto p-3" style="flex-grow: 1;">
                        <!-- Messages go here -->
                    </div>

                    <div class="card-footer bg-white p-2">
                        <div class="d-flex gap-2 overflow-auto mb-2" id="dream-ai-suggestions" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-outline-secondary dream-ai-chip">Bali itinerary</button>
                            <button class="btn btn-sm btn-outline-secondary dream-ai-chip">Packing checklist</button>
                        </div>
                        <form id="dream-ai-form" class="d-flex gap-2">
                            <input type="text" id="dream-ai-input" class="form-control" placeholder="Ask Dream AI..." required autocomplete="off">
                            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-paper-plane"></i></button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', widgetHTML);
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
        const html = `
            <div class="d-flex justify-content-end mb-3">
                <div class="bg-primary text-white p-2 rounded-3" style="max-width: 80%;">${this.escapeHtml(text)}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
        
        // Save to Gemini's expected format
        this.chatHistory.push({ role: 'user', parts: [{ text: text }] });
    },

    addBotMessage: function(text) {
        const container = document.getElementById('dream-ai-messages');
        const html = `
            <div class="d-flex justify-content-start mb-3">
                <div class="bg-white border p-2 rounded-3" style="max-width: 80%;">${this.formatText(text)}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
        
        // Save to Gemini's expected format
        this.chatHistory.push({ role: 'model', parts: [{ text: text }] });
    },

    showTypingIndicator: function() {
        const container = document.getElementById('dream-ai-messages');
        const html = `<div id="dream-ai-typing" class="text-muted small mb-3">Typing...</div>`;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    },

    removeTypingIndicator: function() {
        const indicator = document.getElementById('dream-ai-typing');
        if (indicator) indicator.remove();
    },

    // ---------------------------------------------------------
    // 👇 THIS IS THE FIXED API CALL 👇
    // ---------------------------------------------------------
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
    // ---------------------------------------------------------
    // 👆 END OF FIX 👆
    // ---------------------------------------------------------

    renderWelcomeMessage: function() {
        const text = 'Hello! I am Dream AI. Ask me about travel destinations, itineraries, hotels, weather, or visa tips.';
        this.addBotMessage(text);
        // Clear history so it only starts with the welcome message
        this.chatHistory = [{ role: 'model', parts: [{ text: text }] }];
    },

    escapeHtml: function(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    },

    formatText: function(value) {
        return this.escapeHtml(value).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
};

DreamAIChat.init();