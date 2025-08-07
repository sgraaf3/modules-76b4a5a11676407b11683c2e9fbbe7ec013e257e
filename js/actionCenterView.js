// Bestand: js/views/actionCenterView.js
// Bevat logica voor het uitvoeren van globale acties zoals gebruikersbeheer en notificaties.

import { putData, deleteData, setUserRole } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export function initActionCenterView() {
    console.log("Actie Centrum View geïnitialiseerd.");
    // Logica voor de acties in het actiecentrum.
    const changeUserBtn = document.getElementById('changeUserBtn');
    const inviteUserBtn = document.getElementById('inviteUserBtn');
    const removeUserBtn = document.getElementById('removeUserBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const sendPopupNotificationBtn = document.getElementById('sendPopupNotificationBtn');

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
                    await putData('userProfile', { id: inviteUserId, userName: `User ${inviteUserId}` }); // Creëer een basisprofiel
                    await setUserRole(inviteUserId, inviteUserRole);
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
                        await deleteData('userProfile', removeUserId);
                        await deleteData('userRoles', removeUserId);
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
        sendPopupNotificationBtn.addEventListener('click', () => {
            const notificationMessage = prompt("Voer het bericht voor de pop-upmelding in:");
            if (notificationMessage) {
                showNotification(`Melding verzonden: ${notificationMessage}`, 'info');
            } else {
                showNotification("Geen melding ingevoerd.", 'warning');
            }
        });
    }
}
