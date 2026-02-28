document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const exportBtn = document.getElementById('export-btn');
    const chatHistory = document.getElementById('chat-history');
    const statusMessage = document.getElementById('status-message');

    let currentPrompt = '';
    let currentResponse = '';
    const API_BASE_URL = 'http://127.0.0.1:8888'; // Make sure backend runs on this

    // Auto-resize textarea
    promptInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim() === '') {
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    });

    promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    sendBtn.addEventListener('click', handleSend);
    exportBtn.addEventListener('click', handleExport);

    async function handleSend() {
        const text = promptInput.value.trim();
        if (!text) return;

        // Reset export button state
        exportBtn.disabled = true;
        currentPrompt = text;

        // Add User Message
        appendMessage('user-message', text);

        // Clear input
        promptInput.value = '';
        promptInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Add loading indicator
        const loadingId = addLoadingIndicator();

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: text })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            currentResponse = data.response;

            // Remove loading and add bot message
            removeElement(loadingId);
            appendMessage('bot-message', currentResponse);

            // Enable export button since we have a new Q&A pair
            exportBtn.disabled = false;

        } catch (error) {
            console.error('Error:', error);
            removeElement(loadingId);
            appendMessage('bot-message', 'Sorry, I encountered an error communicating with the server.');
        }
    }

    async function handleExport() {
        if (!currentPrompt || !currentResponse) return;

        exportBtn.disabled = true;
        showStatus('Exporting to Google Sheets...', false);

        try {
            const response = await fetch(`${API_BASE_URL}/api/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: currentPrompt,
                    response: currentResponse
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            showStatus('Successfully exported to Google Sheets!', false);
            // Re-enable after a short delay so user can export again if they really want,
            // but normally you'd keep it disabled till a new prompt.
            setTimeout(() => { exportBtn.disabled = false; }, 3000);

        } catch (error) {
            console.error('Export Error:', error);
            showStatus('Failed to export. Check server logs.', true);
            exportBtn.disabled = false;
        }
    }

    function appendMessage(className, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${className}`;
        msgDiv.textContent = text;
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }

    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const indicator = document.createElement('div');
        indicator.id = id;
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        chatHistory.appendChild(indicator);
        scrollToBottom();
        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function showStatus(text, isError) {
        statusMessage.textContent = text;
        statusMessage.className = `status-message show ${isError ? 'error' : ''}`;

        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 4000);
    }
});
