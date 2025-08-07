// Bestand: js/views/scheduleBuilderView.js
// Bevat logica voor de drag-and-drop functionaliteit van de schema bouwer.

import { putData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export function initScheduleBuilderView() {
    console.log("Schema Bouwer View geïnitialiseerd.");
    // Logica voor de drag-and-drop functionaliteit en het opslaan van schema's.
    const availableModules = document.getElementById('available-modules');
    const mySchedule = document.getElementById('my-schedule');
    const saveScheduleBtn = document.getElementById('saveScheduleBtn');

    if (availableModules && mySchedule) {
        let draggedItem = null;

        availableModules.addEventListener('dragstart', (e) => {
            draggedItem = e.target.closest('.drag-item');
            if (draggedItem) {
                e.dataTransfer.setData('text/plain', draggedItem.dataset.moduleType);
                setTimeout(() => {
                    draggedItem.classList.add('hidden');
                }, 0);
            }
        });

        availableModules.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('hidden');
                draggedItem = null;
            }
        });

        mySchedule.addEventListener('dragover', (e) => {
            e.preventDefault(); // Sta drop toe
        });

        mySchedule.addEventListener('dragenter', (e) => {
            e.preventDefault();
            mySchedule.classList.add('border-blue-300'); // Visuele feedback
        });

        mySchedule.addEventListener('dragleave', () => {
            mySchedule.classList.remove('border-blue-300');
        });

        mySchedule.addEventListener('drop', (e) => {
            e.preventDefault();
            mySchedule.classList.remove('border-blue-300');

            const moduleType = e.dataTransfer.getData('text/plain');
            if (moduleType) {
                const newItem = document.createElement('div');
                newItem.className = 'drag-item bg-gray-600 p-3 mb-2 rounded-md shadow flex items-center justify-between cursor-grab';
                newItem.setAttribute('draggable', 'true');
                newItem.dataset.moduleType = moduleType;

                let iconClass = '';
                let text = '';
                switch (moduleType) {
                    case 'Rest': iconClass = 'fas fa-bed text-blue-300'; text = 'Rustsessie'; break;
                    case 'Training': iconClass = 'fas fa-dumbbell text-purple-300'; text = 'Trainingssessie'; break;
                    case 'Nutrition': iconClass = 'fas fa-apple-alt text-yellow-300'; text = 'Voedingsplan'; break;
                    case 'Test': iconClass = 'fas fa-running text-red-300'; text = 'Testmeting'; break;
                    default: iconClass = 'fas fa-question text-gray-300'; text = 'Onbekende Module';
                }
                newItem.innerHTML = `<span><i class="${iconClass} mr-2"></i>${text}</span><i class="fas fa-grip-vertical text-gray-400"></i>`;
                mySchedule.appendChild(newItem);

                // Verwijder placeholder tekst indien aanwezig
                const placeholder = mySchedule.querySelector('p.text-gray-400');
                if (placeholder) {
                    placeholder.remove();
                }
                showNotification(`Module '${text}' toegevoegd aan schema.`, 'info', 1500);
            }
        });

        saveScheduleBtn.addEventListener('click', async () => {
            const scheduleItems = Array.from(mySchedule.querySelectorAll('.drag-item')).map(item => item.dataset.moduleType);
            if (scheduleItems.length > 0) {
                const scheduleName = prompt('Geef een naam op voor dit schema:'); // confirm() of prompt() blijven nog even
                if (scheduleName) {
                    const newSchedule = {
                        name: scheduleName,
                        modules: scheduleItems,
                        dateCreated: new Date().toISOString()
                    };
                    try {
                        await putData('schedules', newSchedule);
                        showNotification('Schema opgeslagen!', 'success');
                    } catch (error) {
                        console.error("Fout bij opslaan schema:", error);
                        showNotification('Fout bij opslaan schema.', 'error');
                    }
                } else {
                    showNotification('Schema niet opgeslagen: Geen naam opgegeven.', 'warning');
                }
            } else {
                showNotification('Voeg modules toe aan uw schema voordat u opslaat.', 'warning');
            }
        });
    }
}
