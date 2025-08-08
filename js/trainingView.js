import { getAllData } from '../database.js';

export async function initTrainingView(showView) {
    console.log("Training View geïnitialiseerd.");

    const savedSchedulesList = document.getElementById('saved-schedules-list');

    async function loadSavedSchedules() {
        try {
            const blocks = await getAllData('cardioBloks');
            const weeks = await getAllData('cardioWeeks');

            savedSchedulesList.innerHTML = '';

            if (blocks.length === 0 && weeks.length === 0) {
                savedSchedulesList.innerHTML = '<p class="text-gray-400">Geen opgeslagen schema\'s gevonden.</p>';
                return;
            }

            blocks.forEach(block => {
                const blockCard = document.createElement('div');
                blockCard.className = 'bg-gray-700 p-4 rounded-lg mb-4';
                blockCard.innerHTML = `
                    <h3 class="text-lg font-bold">${block.name} (Blok)</h3>
                    <p class="text-sm text-gray-400">${block.notes}</p>
                    <button class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md" data-type="block" data-id="${block.id}">Start Blok</button>
                `;
                savedSchedulesList.appendChild(blockCard);
            });

            weeks.forEach(week => {
                const weekCard = document.createElement('div');
                weekCard.className = 'bg-gray-700 p-4 rounded-lg mb-4';
                weekCard.innerHTML = `
                    <h3 class="text-lg font-bold">${week.name} (Week)</h3>
                    <button class="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md" data-type="week" data-id="${week.id}">Start Week</button>
                `;
                savedSchedulesList.appendChild(weekCard);
            });

            savedSchedulesList.querySelectorAll('button').forEach(button => {
                button.addEventListener('click', () => {
                    const type = button.dataset.type;
                    const id = button.dataset.id;
                    showView('liveTrainingView', { scheduleType: type, scheduleId: id });
                });
            });

        } catch (error) {
            console.error("Error loading saved schedules:", error);
        }
    }

    await loadSavedSchedules();
}


