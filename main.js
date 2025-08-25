document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const messagesDiv = document.getElementById('messages');

    let messages = []; // Array to store conversation history

    // Load conversation history from localStorage
    const loadHistory = () => {
        const storedMessages = localStorage.getItem('conversationHistory');
        if (storedMessages) {
            messages = JSON.parse(storedMessages);
            messages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.classList.add('message', `${msg.role}-message`);
                if (msg.role === 'user') {
                    messageElement.textContent = msg.content;
                } else {
                    messageElement.innerHTML = marked.parse(msg.content);
                }
                messagesDiv.appendChild(messageElement);
            });
            messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
        }
    };

    // Save conversation history to localStorage
    const saveHistory = () => {
        localStorage.setItem('conversationHistory', JSON.stringify(messages));
    };

    loadHistory(); // Load history when the page loads

    const addMessage = (content, sender) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        
        // For user messages, just set textContent
        if (sender === 'user') {
            messageElement.textContent = content;
        } else { // For AI messages, we'll update innerHTML with markdown
            messageElement.innerHTML = content; // Initial empty or partial content
        }
        
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll to bottom
        return messageElement; // Return the element for live updates
    };

    sendButton.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (prompt === '') return;

        addMessage(prompt, 'user');
        messages.push({ role: 'user', content: prompt }); // Add user message to history
        saveHistory(); // Save history after user message
        promptInput.value = '';
        sendButton.disabled = true;

        const aiMessageElement = addMessage('', 'ai'); // Create AI message element for live updates
        let aiResponseAccumulated = '';

        try {
            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'codellama',
                    messages: messages,
                    stream: true, // Enable streaming
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                try {
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        const data = JSON.parse(line);
                        if (data.message && data.message.content) {
                            aiResponseAccumulated += data.message.content;
                            const toolCodeMatch = aiResponseAccumulated.match(/<tool_code>([\s\S]*?)<\/tool_code>/);
                            const toolOutputMatch = aiResponseAccumulated.match(/<tool_output>([\s\S]*?)<\/tool_output>/);

                            if (toolCodeMatch && toolOutputMatch) {
                                const toolCode = toolCodeMatch[1].trim();
                                const toolOutput = toolOutputMatch[1].trim();
                                displayToolOutput(toolCode, toolOutput);
                                aiResponseAccumulated = aiResponseAccumulated.replace(toolCodeMatch[0], '').replace(toolOutputMatch[0], '');
                            }

                            aiMessageElement.innerHTML = marked.parse(aiResponseAccumulated);
                            hljs.highlightAll(); // Highlight code blocks
                            messagesDiv.scrollTop = messagesDiv.scrollHeight;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing JSON chunk:', e, 'Chunk:', chunk);
                }
            }
            // After stream ends, add the full AI response to history
            messages.push({ role: 'assistant', content: aiResponseAccumulated });
            saveHistory(); // Save history after AI message

        } catch (error) {
            console.error('Error:', error);
            addMessage(`Error: ${error.message}. Make sure Ollama is running and 'codellama' model is available.`, 'ai');
        } finally {
            sendButton.disabled = false;
        }
    });

    const displayToolOutput = (toolCode, toolOutput) => {
        const toolOutputElement = document.createElement('div');
        toolOutputElement.classList.add('tool-output');
        toolOutputElement.innerHTML = `
            <h3>Tool Executed:</h3>
            <pre><code class="language-javascript">${toolCode}</code></pre>
            <h3>Tool Output:</h3>
            <pre><code>${toolOutput}</code></pre>
        `;
        messagesDiv.appendChild(toolOutputElement);
        hljs.highlightAll();
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendButton.click();
        }
    });
});