// Bestand: js/views/actionCenterView.js
// Bevat logica voor het uitvoeren van globale acties zoals gebruikersbeheer en notificaties.

import { putData, deleteData, setUserRole, getAllData, getData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initActionCenterView() {
    console.log("Actie Centrum View geïnitialiseerd.");

    const changeUserBtn = document.getElementById('changeUserBtn');
    const inviteUserBtn = document.getElementById('inviteUserBtn');
    const removeUserBtn = document.getElementById('removeUserBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const sendPopupNotificationBtn = document.getElementById('sendPopupNotificationBtn');

    const openTasksCountDisplay = document.getElementById('openTasksCount');
    const newMessagesCountDisplay = document.getElementById('newMessagesCount');
    const openTasksList = document.getElementById('openTasksList');
    const importantMessagesList = document.getElementById('importantMessagesList');

    async function loadActionCenterData() {
        try {
            const actionCenterData = await getAllData('actionCenterData');
            const tasks = actionCenterData.filter(item => item.type === 'task');
            const messages = actionCenterData.filter(item => item.type === 'message');

            if (openTasksCountDisplay) openTasksCountDisplay.textContent = tasks.length;
            if (newMessagesCountDisplay) newMessagesCountDisplay.textContent = messages.length;

            openTasksList.innerHTML = '';
            if (tasks.length === 0) {
                openTasksList.innerHTML = '<p class="text-gray-400">Geen openstaande taken.</p>';
            } else {
                tasks.forEach(task => {
                    const taskCard = document.createElement('div');
                    taskCard.className = 'data-card';
                    taskCard.innerHTML = `
                        <div class="card-header"><h3>${task.title}</h3></div>
                        <div class="sub-value">${task.description || 'Geen beschrijving'}</div>
                        <div class="flex justify-end mt-2">
                            <button class="text-green-400 hover:text-green-300 text-sm mr-2" data-action="complete-task" data-id="${task.id}">Voltooi</button>
                            <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-task" data-id="${task.id}">Verwijder</button>
                        </div>
                    `;
                    openTasksList.appendChild(taskCard);
                });
            }

            importantMessagesList.innerHTML = '';
            if (messages.length === 0) {
                importantMessagesList.innerHTML = '<p class="text-gray-400">Geen belangrijke meldingen.</p>';
            } else {
                messages.forEach(message => {
                    const messageCard = document.createElement('div');
                    messageCard.className = 'data-card';
                    messageCard.innerHTML = `
                        <div class="card-header"><h3>${message.title}</h3></div>
                        <div class="sub-value">${message.content || 'Geen inhoud'}</div>
                        <div class="flex justify-end mt-2">
                            <button class="text-green-400 hover:text-green-300 text-sm mr-2" data-action="mark-read" data-id="${message.id}">Markeer als gelezen</button>
                            <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-message" data-id="${message.id}">Verwijder</button>
                        </div>
                    `;
                    importantMessagesList.appendChild(messageCard);
                });
            }

            // Add event listeners for dynamically loaded buttons
            openTasksList.querySelectorAll('[data-action="complete-task"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const taskId = parseInt(event.target.dataset.id);
                    if (confirm('Taak voltooien?')) {
                        await deleteData('actionCenterData', taskId);
                        showNotification('Taak voltooid!', 'success');
                        loadActionCenterData();
                    }
                });
            });
            openTasksList.querySelectorAll('[data-action="delete-task"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const taskId = parseInt(event.target.dataset.id);
                    if (confirm('Taak verwijderen?')) {
                        await deleteData('actionCenterData', taskId);
                        showNotification('Taak verwijderd!', 'success');
                        loadActionCenterData();
                    }
                });
            });
            importantMessagesList.querySelectorAll('[data-action="mark-read"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const messageId = parseInt(event.target.dataset.id);
                    if (confirm('Melding markeren als gelezen?')) {
                        await deleteData('actionCenterData', messageId);
                        showNotification('Melding gemarkeerd als gelezen!', 'success');
                        loadActionCenterData();
                    }
                });
            });
            importantMessagesList.querySelectorAll('[data-action="delete-message"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const messageId = parseInt(event.target.dataset.id);
                    if (confirm('Melding verwijderen?')) {
                        await deleteData('actionCenterData', messageId);
                        showNotification('Melding verwijderd!', 'success');
                        loadActionCenterData();
                    }
                });
            });

        } catch (error) {
            console.error("Fout bij laden actiecentrum data:", error);
            showNotification("Fout bij laden actiecentrum data.", "error");
        }
    }

    if (changeUserBtn) {
        changeUserBtn.addEventListener('click', () => {
            const newUserId = prompt("Voer de ID van de gebruiker in:"); // confirm/prompt blijven nog even
            if (newUserId) {
                localStorage.setItem('appUserId', newUserId);
                showNotification(`Gebruiker gewijzigd naar ${newUserId}. Pagina wordt herladen.`, 'info');
                setTimeout(() => location.reload(), 1000); // Geef notificatie tijd om te verschijnen
            } else {
                showNotification('Geen gebruiker ID ingevoerd.', 'warning');
            }
        });
    }

    if (inviteUserBtn) {
        inviteUserBtn.addEventListener('click', async () => {
            const inviteUserId = prompt("Voer de ID van de nieuwe gebruiker in:");
            const inviteUserRole = prompt("Voer de rol voor de nieuwe gebruiker in (bijv. member, admin, trainer):");
            if (inviteUserId && inviteUserRole) {
                try {
                    await putData('registry', { id: parseInt(inviteUserId), name: `User ${inviteUserId}`, email: `user${inviteUserId}@example.com`, status: 'Active' }); // Creëer een basisprofiel in registry
                    await setUserRole(parseInt(inviteUserId), inviteUserRole);
                    showNotification(`Gebruiker ${inviteUserId} met rol ${inviteUserRole} uitgenodigd!`, 'success');
                } catch (error) {
                    console.error("Fout bij uitnodigen gebruiker:", error);
                    showNotification('Fout bij uitnodigen gebruiker.', 'error');
                }
            } else {
                showNotification("Ongeldige invoer voor gebruiker uitnodigen.", 'warning');
            }
        });
    }

    if (removeUserBtn) {
        removeUserBtn.addEventListener('click', async () => {
            const removeUserId = prompt("Voer de ID van de gebruiker die u wilt verwijderen in:");
            if (removeUserId) {
                if (confirm(`Weet u zeker dat u gebruiker ${removeUserId} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) { // confirm blijft nog even
                    try {
                        await deleteData('registry', parseInt(removeUserId)); // Verwijder uit registry
                        await deleteData('userRoles', parseInt(removeUserId)); // Verwijder rol
                        showNotification(`Gebruiker ${removeUserId} verwijderd.`, 'success');
                    } catch (error) {
                        console.error("Fout bij verwijderen gebruiker:", error);
                        showNotification('Fout bij verwijderen gebruiker.', 'error');
                    }
                }
            } else {
                showNotification("Ongeldige invoer voor gebruiker verwijderen.", 'warning');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('appUserId');
            showNotification('U bent uitgelogd. Pagina wordt herladen.', 'info');
            setTimeout(() => location.reload(), 1000); // Geef notificatie tijd om te verschijnen
        });
    }

    if (sendPopupNotificationBtn) {
        sendPopupNotificationBtn.addEventListener('click', async () => {
            const notificationMessage = prompt("Voer het bericht voor de pop-upmelding in:");
            if (notificationMessage) {
                // Voeg een nieuwe melding toe aan de actionCenterData store
                const newMessage = {
                    type: 'message',
                    title: 'Nieuwe Melding',
                    content: notificationMessage,
                    timestamp: new Date().toISOString()
                };
                await putData('actionCenterData', newMessage);
                showNotification(`Melding verzonden: ${notificationMessage}`, 'info');
                loadActionCenterData(); // Herlaad de data om de nieuwe melding te tonen
            } else {
                showNotification("Geen melding ingevoerd.", 'warning');
            }
        });
    }

    await loadActionCenterData();
}