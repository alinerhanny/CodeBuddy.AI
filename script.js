document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatInput = document.getElementById('chat-input');
    const submitButton = document.getElementById('submit');
    const introDiv = document.querySelector('.intro');
    const bodyElement = document.querySelector('body');
    const newChatButtons = document.querySelectorAll('.new-chat');
    const chatHistoryDiv = document.querySelector('.chat-history');
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');

    let loadingMessageElement = null;
    let chatStarted = false;

    // Histórico guarda todos os chats completos
    // Cada chat: { title: string, messages: [{text:string, isUser:boolean}, ...] }
    let chatHistory = [];
    let currentChatIndex = null; // índice do chat atual no histórico

    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    function displayMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');

        if (!isUser) {
            messageDiv.innerHTML = marked.parse(message);
        } else {
            messageDiv.textContent = message;
        }

        if (chatContainer) {
            chatContainer.appendChild(messageDiv);

            // Scroll suave para a última mensagem, com delay para garantir renderização
            setTimeout(() => {
                chatContainer.scrollTo({
                    top: chatContainer.scrollHeight,
                    behavior: 'smooth',
                });
            }, 100);
        } else {
            console.error("Elemento 'chat-container' não encontrado no DOM.");
        }

        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    function displayLoadingMessage() {
        loadingMessageElement = document.createElement('div');
        loadingMessageElement.classList.add('message', 'bot-message', 'loading-message');
        loadingMessageElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-lg"></i> <span style="margin-left: 8px;">Processando...</span>';
        if (chatContainer) {
            chatContainer.appendChild(loadingMessageElement);

            // Scroll suave para o loading message
            setTimeout(() => {
                chatContainer.scrollTo({
                    top: chatContainer.scrollHeight,
                    behavior: 'smooth',
                });
            }, 100);
        }
    }

    function removeLoadingMessage() {
        if (loadingMessageElement && loadingMessageElement.parentNode === chatContainer) {
            chatContainer.removeChild(loadingMessageElement);
            loadingMessageElement = null;
        }
    }

    async function sendMessageToServer(pergunta) {
        try {
            const response = await fetch('https://codebuddy-api-ke1r.onrender.com/api/perguntar
', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pergunta }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro na requisição: ${response.status} - ${errorData?.erro || 'Erro desconhecido'}`);
            }

            const data = await response.json();
            return data.resposta;
        } catch (error) {
            console.error('Erro ao se comunicar com o servidor:', error);
            throw error;
        } finally {
            removeLoadingMessage();
        }
    }

    // Salva uma mensagem (usuário ou bot) no chat atual no histórico
    function saveMessageToCurrentChat(message, isUser) {
        if (currentChatIndex === null) {
            // Cria novo chat no histórico ao enviar a primeira mensagem
            chatHistory.push({
                title: isUser ? (message.slice(0, 30) + (message.length > 30 ? '...' : '')) : `Chat ${chatHistory.length + 1}`,
                messages: [],
            });
            currentChatIndex = chatHistory.length - 1;
        }
        chatHistory[currentChatIndex].messages.push({ text: message, isUser });
        updateSidebarHistory();
    }

    // Atualiza a lista do histórico na sidebar
    function updateSidebarHistory() {
        if (chatHistoryDiv) {
            chatHistoryDiv.innerHTML = '';
            chatHistory.forEach((chat, index) => {
                const historyItemDiv = document.createElement('div');
                historyItemDiv.classList.add('history-item');

                const titleSpan = document.createElement('span');
                titleSpan.textContent = chat.title;

                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-btn');
                deleteButton.innerHTML = '<img src="img/delete_24dp_F0E9D6_FILL0_wght400_GRAD0_opsz24.svg" alt="icone de lixeira">';

                historyItemDiv.appendChild(titleSpan);
                historyItemDiv.appendChild(deleteButton);

                // Coloca os chats mais recentes no topo
                chatHistoryDiv.insertBefore(historyItemDiv, chatHistoryDiv.firstChild);

                historyItemDiv.addEventListener('click', () => {
                    loadChatFromHistory(index);
                    sidebar.classList.remove('show');
                });

                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    deleteChatFromHistory(index);
                });
            });
        }
        saveHistoryToLocalStorage();
    }

    function deleteChatFromHistory(indexToDelete) {
        chatHistory.splice(indexToDelete, 1);
        // Se o chat atual foi deletado, reseta
        if (currentChatIndex === indexToDelete) {
            currentChatIndex = null;
            chatStarted = false;
            chatContainer.innerHTML = '';
            if (introDiv) introDiv.style.display = 'block';
            if (bodyElement) bodyElement.classList.remove('chat-started');
        } else if (currentChatIndex > indexToDelete) {
            currentChatIndex--; // ajusta índice após remoção anterior
        }
        updateSidebarHistory();
    }

    function loadChatFromHistory(index) {
        const chat = chatHistory[index];
        if (!chat) return;

        chatContainer.innerHTML = '';
        chat.messages.forEach(({ text, isUser }) => {
            displayMessage(text, isUser);
        });

        if (introDiv) introDiv.style.display = 'none';
        if (bodyElement) bodyElement.classList.add('chat-started');

        chatStarted = true;
        currentChatIndex = index;
    }

    submitButton.addEventListener('click', async () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        displayMessage(userMessage, true);
        saveMessageToCurrentChat(userMessage, true);

        chatInput.value = '';
        chatInput.style.height = 'auto';

        if (!chatStarted) {
            if (introDiv) introDiv.style.display = 'none';
            if (bodyElement) bodyElement.classList.add('chat-started');
            chatStarted = true;
        }

        displayLoadingMessage();

        try {
            const botResponse = await sendMessageToServer(userMessage);
            displayMessage(botResponse, false);
            saveMessageToCurrentChat(botResponse, false);
        } catch (error) {
            displayMessage(`Erro: ${error.message}`);
            saveMessageToCurrentChat(`Erro: ${error.message}`, false);
        }
    });

    chatInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submitButton.click();
        }
    });

    // Ao clicar em Novo Chat: salva chat atual (se existir), reseta tudo
    newChatButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (chatStarted) {
                saveCurrentChatToHistory();
            }

            chatContainer.innerHTML = '';
            chatInput.value = '';
            chatInput.style.height = 'auto';

            if (introDiv) introDiv.style.display = 'block';
            if (bodyElement) bodyElement.classList.remove('chat-started');
            chatStarted = false;
            currentChatIndex = null;
        });
    });

    // Função para salvar chat atual (útil no botão Novo Chat)
    function saveCurrentChatToHistory() {
        if (!chatStarted) return;

        const messagesNodes = chatContainer.querySelectorAll('.message');
        if (messagesNodes.length === 0) return;

        const messages = [];
        messagesNodes.forEach(msgDiv => {
            const isUser = msgDiv.classList.contains('user-message');
            const text = isUser ? msgDiv.textContent : (msgDiv.innerText || msgDiv.textContent);
            messages.push({ text, isUser });
        });

        // Usa a primeira mensagem do usuário como título ou fallback
        const firstUserMsg = messages.find(m => m.isUser);
        const title = firstUserMsg ? firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '') : `Chat ${chatHistory.length + 1}`;

        // Se já existe chat atual, atualiza, senão cria novo
        if (currentChatIndex !== null) {
            chatHistory[currentChatIndex] = { title, messages };
        } else {
            chatHistory.push({ title, messages });
            currentChatIndex = chatHistory.length - 1;
        }

        updateSidebarHistory();
    }

    // Salva o histórico no localStorage
    function saveHistoryToLocalStorage() {
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }

    // Carrega o histórico do localStorage
    function loadHistoryFromLocalStorage() {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            try {
                chatHistory = JSON.parse(savedHistory);
                // Não carrega chat automaticamente ao recarregar página
                currentChatIndex = null;
                chatStarted = false;
                if (introDiv) introDiv.style.display = 'block';
                if (bodyElement) bodyElement.classList.remove('chat-started');
                chatContainer.innerHTML = '';
            } catch {
                console.warn('Erro ao carregar histórico do localStorage');
            }
        }
    }

    // Inicializa a sidebar com histórico salvo (se houver)
    loadHistoryFromLocalStorage();
    updateSidebarHistory();
});
