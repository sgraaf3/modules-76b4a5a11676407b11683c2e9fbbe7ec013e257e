// Bestand: js/views/logsView.js
// Bevat logica voor het weergeven van systeem- en activiteitslogs.

import { putData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initLogsView() {
    console.log("Logs View geïnitialiseerd.");

    const logsList = document.getElementById('logsList');
    const addLogForm = document.getElementById('addLogForm');
    const logMessageInput = document.getElementById('logMessage');

    async function loadLogs() {
        try {
            const logs = await getAllData('logs'); // 'logs' is de store voor logs
            logsList.innerHTML = ''; // Maak de bestaande lijst leeg

            if (logs.length === 0) {
                logsList.innerHTML = '<p class="text-gray-400">Geen logs gevonden.</p>';
                return;
            }

            // Sorteer logs van nieuw naar oud
            logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            logs.forEach(log => {
                const logCard = document.createElement('div');
                logCard.className = 'data-card';
                logCard.innerHTML = `
                    <div class="card-header"><h3>${log.message}</h3></div>
                    <div class="sub-value">Tijdstip: ${new Date(log.timestamp).toLocaleString()}</div>
                    ${log.details ? `<div class="sub-value">Details: ${log.details}</div>` : ''}
                `;
                logsList.appendChild(logCard);
            });
        } catch (error) {
            console.error("Fout bij laden logs:", error);
            showNotification("Fout bij laden logs.", "error");
        }
    }

    if (addLogForm) {
        addLogForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const newLog = {
                message: logMessageInput.value,
                timestamp: new Date().toISOString(),
                // Je kunt hier meer details toevoegen, bijv. userId, type log, etc.
                // details: "Extra info over de log"
            };
            try {
                await putData('logs', newLog);
                showNotification('Log toegevoegd!', 'success');
                addLogForm.reset();
                loadLogs(); // Herlaad de lijst
            } catch (error) {
                console.error("Fout bij toevoegen log:", error);
                showNotification('Fout bij toevoegen log.', 'error');
            }
        });
    }

    await loadLogs(); // Laad logs bij initialisatie van de view
}
