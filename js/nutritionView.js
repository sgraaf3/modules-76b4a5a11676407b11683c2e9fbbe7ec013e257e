// Bestand: js/views/nutritionView.js
// Bevat logica voor het beheren van voedingsprogramma's (CRUD-operaties).

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initNutritionView() {
    console.log("Voeding View geïnitialiseerd.");

    const nutritionProgramForm = document.getElementById('nutritionProgramForm');
    const nutritionProgramsList = document.getElementById('nutritionProgramsList');
    const programIdInput = document.getElementById('programId');
    const programNameInput = document.getElementById('programName');
    const programDescriptionInput = document.getElementById('programDescription');
    const clearNutritionFormBtn = document.getElementById('clearNutritionFormBtn'); // Corrected ID

    async function loadNutritionPrograms() {
        try {
            const programs = await getAllData('nutritionPrograms');
            nutritionProgramsList.innerHTML = ''; // Maak de bestaande lijst leeg

            if (programs.length === 0) {
                nutritionProgramsList.innerHTML = '<p class="text-gray-400">Geen voedingsprogrammas gevonden.</p>';
                return;
            }

            programs.forEach(program => {
                const programCard = document.createElement('div');
                programCard.className = 'data-card';
                programCard.innerHTML = `
                    <div class="card-header"><h3>Programma: ${program.name}</h3></div>
                    <div class="sub-value">${program.description}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-program" data-id="${program.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-program" data-id="${program.id}">Verwijder</button>
                    </div>
                `;
                nutritionProgramsList.appendChild(programCard);
            });

            // Voeg event listeners toe voor bewerk/verwijder knoppen
            nutritionProgramsList.querySelectorAll('[data-action="edit-program"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const programId = parseInt(event.target.dataset.id);
                    const program = await getData('nutritionPrograms', programId);
                    if (program) {
                        programIdInput.value = program.id;
                        programNameInput.value = program.name;
                        programDescriptionInput.value = program.description;
                    }
                });
            });

            nutritionProgramsList.querySelectorAll('[data-action="delete-program"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const programId = parseInt(event.target.dataset.id);
                    // Vervang confirm() door een custom modal of notificatie met actie
                    if (confirm('Weet u zeker dat u dit programma wilt verwijderen?')) { // Voor nu nog confirm
                        try {
                            await deleteData('nutritionPrograms', programId);
                            showNotification('Voedingsprogramma verwijderd!', 'success');
                            loadNutritionPrograms(); // Herlaad de lijst
                        } catch (error) {
                            console.error("Fout bij verwijderen voedingsprogramma:", error);
                            showNotification('Fout bij verwijderen voedingsprogramma.', 'error');
                        }
                    }
                });
            });
        } catch (error) {
            console.error("Fout bij laden voedingsprogramma's:", error);
            showNotification("Fout bij laden voedingsprogramma's.", "error");
        }
    }

    if (nutritionProgramForm) {
        nutritionProgramForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const program = {
                id: programIdInput.value ? parseInt(programIdInput.value) : undefined, // Gebruik undefined voor autoIncrement
                name: programNameInput.value,
                description: programDescriptionInput.value
            };
            try {
                await putData('nutritionPrograms', program);
                showNotification('Voedingsprogramma opgeslagen!', 'success');
                nutritionProgramForm.reset();
                programIdInput.value = ''; // Maak verborgen ID leeg
                loadNutritionPrograms(); // Herlaad de lijst
            } catch (error) {
                console.error("Fout bij opslaan voedingsprogramma:", error);
                showNotification('Fout bij opslaan voedingsprogramma.', 'error');
            }
        });
    }

    // Voeg listener toe voor de "Formulier Leegmaken" knop
    if (clearNutritionFormBtn) {
        clearNutritionFormBtn.addEventListener('click', () => {
            nutritionProgramForm.reset();
            programIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadNutritionPrograms(); // Laad programma's bij initialisatie van de view
}
