// Bestand: js/views/messagesView.js
// Bevat logica voor het berichtensysteem.

import { getData, putData, deleteData, getAllData, getOrCreateUserId } from '../database.js';
import { showNotification } from './notifications.js';

export async function initMessagesView() {
    console.log("Berichtenscherm View geïnitialiseerd.");

    const messageForm = document.getElementById('messageForm');
    const messageIdInput = document.getElementById('messageId');
    const messageRecipientInput = document.getElementById('messageRecipient');
    const messageSubjectInput = document.getElementById('messageSubject');
    const messageContentInput = document.getElementById('messageContent');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const clearMessageFormBtn = document.getElementById('clearMessageFormBtn');
    const receivedMessagesList = document.getElementById('receivedMessagesList');
    const sentMessagesList = document.getElementById('sentMessagesList');

    const currentUserId = getOrCreateUserId();

    async function loadMessages() {
        try {
            const allMessages = await getAllData('messages');
            receivedMessagesList.innerHTML = '';
            sentMessagesList.innerHTML = '';

            const received = allMessages.filter(msg => msg.recipientId === currentUserId || msg.recipientId === 'all');
            const sent = allMessages.filter(msg => msg.senderId === currentUserId);

            if (received.length === 0) {
                receivedMessagesList.innerHTML = '<p class="text-gray-400">Geen ontvangen berichten.</p>';
            } else {
                received.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                for (const msg of received) {
                    const sender = await getData('registry', msg.senderId);
                    const senderName = sender ? sender.name : 'Onbekend';
                    const messageCard = document.createElement('div');
                    messageCard.className = 'data-card';
                    messageCard.innerHTML = `
                        <div class="card-header"><h3>${msg.subject}</h3></div>
                        <div class="sub-value">Van: ${senderName} | Datum: ${new Date(msg.timestamp).toLocaleString()}</div>
                        <div class="sub-value">${msg.content}</div>
                        <div class="flex justify-end mt-2">
                            <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-message" data-id="${msg.id}">Verwijder</button>
                        </div>
                    `;
                    receivedMessagesList.appendChild(messageCard);
                }
            }

            if (sent.length === 0) {
                sentMessagesList.innerHTML = '<p class="text-gray-400">Geen verzonden berichten.</p>';
            } else {
                sent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                for (const msg of sent) {
                    const recipient = msg.recipientId === 'all' ? 'Alle gebruikers' : (await getData('registry', msg.recipientId))?.name || 'Onbekend';
                    const messageCard = document.createElement('div');
                    messageCard.className = 'data-card';
                    messageCard.innerHTML = `
                        <div class="card-header"><h3>${msg.subject}</h3></div>
                        <div class="sub-value">Aan: ${recipient} | Datum: ${new Date(msg.timestamp).toLocaleString()}</div>
                        <div class="sub-value">${msg.content}</div>
                        <div class="flex justify-end mt-2">
                            <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-message" data-id="${msg.id}">Verwijder</button>
                        </div>
                    `;
                    sentMessagesList.appendChild(messageCard);
                }
            }

            // Add event listeners for delete buttons
            document.querySelectorAll('[data-action="delete-message"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const messageId = parseInt(event.target.dataset.id);
                    if (confirm('Weet u zeker dat u dit bericht wilt verwijderen?')) {
                        try {
                            await deleteData('messages', messageId);
                            showNotification('Bericht verwijderd!', 'success');
                            loadMessages();
                        } catch (error) {
                            console.error("Fout bij verwijderen bericht:", error);
                            showNotification('Fout bij verwijderen bericht.', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Fout bij laden berichten:", error);
            showNotification("Fout bij laden berichten.", "error");
        }
    }

    if (messageForm) {
        messageForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const message = {
                id: messageIdInput.value ? parseInt(messageIdInput.value) : undefined,
                senderId: currentUserId,
                recipientId: messageRecipientInput.value === 'all' ? 'all' : parseInt(messageRecipientInput.value),
                subject: messageSubjectInput.value,
                content: messageContentInput.value,
                timestamp: new Date().toISOString()
            };

            try {
                await putData('messages', message);
                showNotification('Bericht verzonden!', 'success');
                messageForm.reset();
                messageIdInput.value = '';
                loadMessages();
            } catch (error) {
                console.error("Fout bij verzenden bericht:", error);
                showNotification('Fout bij verzenden bericht.', 'error');
            }
        });
    }

    if (clearMessageFormBtn) {
        clearMessageFormBtn.addEventListener('click', () => {
            messageForm.reset();
            messageIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadMessages();
}