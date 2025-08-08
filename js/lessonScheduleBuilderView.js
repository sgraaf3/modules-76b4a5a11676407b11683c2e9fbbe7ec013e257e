import { getData, putData, getAllData } from '../database.js';
import { showNotification } from './notifications.js';

export function initLessonScheduleBuilderView() {
    console.log("Lesrooster Bouwer View geïnitialiseerd.");

    // --- Hulpfuncties ---
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    function showMessage(message, type = 'info') {
        const msgBox = document.getElementById('message-box');
        if (msgBox) {
            msgBox.textContent = message;
            msgBox.className = `message-box show bg-${type === 'error' ? 'red' : type === 'success' ? 'green' : 'gray'}-700`;
            setTimeout(() => {
                msgBox.classList.remove('show');
            }, 3000);
        } else {
            console.warn("Message box element not found.");
        }
    }

    // --- UI Elementen ---
    const availableLessonsList = document.getElementById('availableLessonsList');
    const lessonCategorySelect = document.getElementById('lessonCategorySelect');
    const newLessonForm = document.getElementById('newLessonForm');

    const calendarDayCells = document.querySelectorAll('.calendar-day-cell-lesson .lesson-drop-zone');
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const currentWeekDisplay = document.getElementById('currentWeekDisplay');
    const saveLessonScheduleBtn = document.getElementById('saveLessonScheduleBtn');

    let currentWeekNumber = 0; // Relative week number (0 = current week)
    let currentLessonSchedule = {}; // { weekNumber: { dayOfWeek: [lessons] } }

    // --- Lessen Beheer (aanmaken, laden, filteren) ---

    // Laadt en filtert lessen in de zijbalk
    async function loadAvailableLessons() {
        availableLessonsList.innerHTML = '';
        const lessons = await getAllData('lessons'); // Haal lessen op uit IndexedDB
        const selectedCategory = lessonCategorySelect.value;

        const filteredLessons = selectedCategory === 'all'
            ? lessons
            : lessons.filter(lesson => lesson.category === selectedCategory);

        if (filteredLessons.length === 0) {
            availableLessonsList.innerHTML = '<p class="text-gray-400 text-sm">Geen lessen beschikbaar in deze categorie.</p>';
            return;
        }

        filteredLessons.forEach(lesson => {
            const lessonItem = document.createElement('div');
            lessonItem.className = 'lesson-item drag-item bg-gray-700 p-3 rounded-md shadow flex flex-col cursor-grab';
            lessonItem.setAttribute('draggable', 'true');
            lessonItem.dataset.id = lesson.id;
            lessonItem.dataset.name = lesson.name;
            lessonItem.dataset.category = lesson.category;
            lessonItem.dataset.teacher = lesson.teacher || '';
            lessonItem.dataset.duration = lesson.duration || '';
            lessonItem.dataset.explanation = lesson.explanation || '';
            lessonItem.dataset.docs = lesson.docs || '';

            lessonItem.innerHTML = `
                <div class="lesson-header">
                    <span>${lesson.name} (${lesson.category})</span>
                </div>
                <div class="lesson-details">
                    Docent: ${lesson.teacher || 'N.v.t.'} | Duur: ${lesson.duration || '--'} min
                </div>
            `;
            availableLessonsList.appendChild(lessonItem);
        });

        // Voeg dragstart listeners toe aan de nieuwe items
        availableLessonsList.querySelectorAll('.drag-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const lessonData = { ...e.target.dataset };
                e.dataTransfer.setData('text/plain', JSON.stringify(lessonData));
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
    }

    // Voegt een nieuwe les toe via het formulier
    if (newLessonForm) {
        newLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newLesson = {
                id: generateUniqueId(),
                name: document.getElementById('newLessonName').value,
                category: document.getElementById('newLessonCategory').value,
                teacher: document.getElementById('newLessonTeacher').value,
                duration: parseInt(document.getElementById('newLessonDuration').value) || 0,
                explanation: document.getElementById('newLessonExplanation').value,
                docs: document.getElementById('newLessonDocs').value
            };

            try {
                await putData('lessons', newLesson); // Sla les op in IndexedDB
                showMessage('Les succesvol toegevoegd!', 'success');
                newLessonForm.reset();
                loadAvailableLessons(); // Herlaad de lijst met beschikbare lessen
            } catch (error) {
                console.error("Fout bij toevoegen les:", error);
                showMessage('Fout bij toevoegen les.', 'error');
            }
        });
    }

    // Filter lessen bij wijzigen van categorie
    if (lessonCategorySelect) {
        lessonCategorySelect.addEventListener('change', loadAvailableLessons);
    }

    // --- Kalender Logica ---

    // Rendert het lesrooster voor de huidige week
    async function renderLessonSchedule() {
        calendarDayCells.forEach(cell => {
            cell.innerHTML = '<p class="text-gray-500 text-sm">Sleep lessen hierheen</p>'; // Maak cellen leeg
        });

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1 + (currentWeekNumber * 7)); // Maandag van de huidige/geselecteerde week
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Zondag
        endOfWeek.setHours(23, 59, 59, 999);

        currentWeekDisplay.textContent = `Week ${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;

        // Laad het rooster voor deze specifieke week
        const savedSchedule = await getData('lessonSchedules', `week-${currentWeekNumber}`);
        if (savedSchedule && savedSchedule.schedule) {
            currentLessonSchedule = savedSchedule.schedule;
        } else {
            currentLessonSchedule = {}; // Reset als er geen opgeslagen rooster is
        }

        for (const dayOfWeek in currentLessonSchedule) {
            const lessonsForDay = currentLessonSchedule[dayOfWeek];
            const targetCell = document.querySelector(`.calendar-day-cell-lesson[data-day-of-week="${dayOfWeek}"] .lesson-drop-zone`);
            if (targetCell && lessonsForDay && lessonsForDay.length > 0) {
                targetCell.innerHTML = ''; // Clear placeholder
                lessonsForDay.forEach(lesson => {
                    const lessonElement = createScheduledLessonElement(lesson);
                    targetCell.appendChild(lessonElement);
                });
            }
        }
    }

    // Creëert een DOM-element voor een geplande les
    function createScheduledLessonElement(lessonData) {
        const lessonElement = document.createElement('div');
        lessonElement.className = 'lesson-item flex flex-col p-3 rounded-md bg-gray-700 shadow relative cursor-grab';
        lessonElement.setAttribute('draggable', 'true');
        lessonElement.dataset.id = lessonData.id;
        lessonElement.dataset.name = lessonData.name;
        lessonElement.dataset.category = lessonData.category;
        lessonElement.dataset.teacher = lessonData.teacher || '';
        lessonElement.dataset.duration = lessonData.duration || '';
        lessonElement.dataset.explanation = lessonData.explanation || '';
        lessonElement.dataset.docs = lessonData.docs || '';

        lessonElement.innerHTML = `
            <div class="lesson-header">
                <span>${lessonData.name}</span>
                <button class="remove-btn text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button>
            </div>
            <div class="lesson-details">
                Docent: ${lessonData.teacher || 'N.v.t.'} | Duur: ${lessonData.duration || '--'} min
            </div>
            <div class="lesson-settings hidden flex flex-col gap-2 mt-2">
                <input type="text" placeholder="Docent" data-teacher-input value="${lessonData.teacher || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <input type="number" placeholder="Duur (min)" data-duration-input value="${lessonData.duration || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <textarea placeholder="Uitleg" data-explanation-input rows="2" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">${lessonData.explanation || ''}</textarea>
                <input type="text" placeholder="Document URL" data-docs-input value="${lessonData.docs || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
            </div>
        `;

        // Event listener voor het tonen/verbergen van instellingen
        lessonElement.querySelector('.lesson-header').addEventListener('click', (e) => {
            if (!e.target.closest('.remove-btn')) { // Voorkom togglen bij klik op verwijderknop
                lessonElement.querySelector('.lesson-settings').classList.toggle('hidden');
            }
        });

        // Event listener voor verwijderen
        lessonElement.querySelector('.remove-btn').addEventListener('click', () => {
            lessonElement.remove();
            // Verwijder de les ook uit de currentLessonSchedule data
            const dayOfWeek = lessonElement.parentNode.parentNode.dataset.dayOfWeek;
            if (currentLessonSchedule[dayOfWeek]) {
                currentLessonSchedule[dayOfWeek] = currentLessonSchedule[dayOfWeek].filter(l => l.id !== lessonData.id);
                if (currentLessonSchedule[dayOfWeek].length === 0) {
                    lessonElement.parentNode.innerHTML = '<p class="text-gray-500 text-sm">Sleep lessen hierheen</p>';
                }
            }
        });

        // Voeg dragstart listener toe voor verplaatsen binnen de kalender
        lessonElement.addEventListener('dragstart', (e) => {
            const dataToTransfer = { ...lessonData, isScheduled: true }; // Voeg vlag toe
            e.dataTransfer.setData('text/plain', JSON.stringify(dataToTransfer));
            e.dataTransfer.effectAllowed = 'move';
        });

        return lessonElement;
    }

    // --- Event Listeners ---

    // Navigatie knoppen voor weken
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            currentWeekNumber--;
            renderLessonSchedule();
        });
    }
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            currentWeekNumber++;
            renderLessonSchedule();
        });
    }

    // Drop zones voor kalender
    calendarDayCells.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy'; // Altijd kopiëren vanuit de zijbalk
        });

        zone.addEventListener('dragleave', (e) => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');

            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const dayOfWeek = zone.parentNode.dataset.dayOfWeek;

            // Als het een bestaande les is die wordt verplaatst
            if (data.isScheduled) {
                // Verwijder uit de oude positie in de data
                for (const d in currentLessonSchedule) {
                    currentLessonSchedule[d] = currentLessonSchedule[d].filter(l => l.id !== data.id);
                }
                // Render de oude cel opnieuw om placeholder terug te plaatsen indien leeg
                document.querySelector(`.calendar-day-cell-lesson[data-day-of-week="${data.originalDayOfWeek}"] .lesson-drop-zone`).innerHTML = '<p class="text-gray-500 text-sm">Sleep lessen hierheen</p>';
                // Verwijder het element uit de DOM van de oude cel
                const oldElement = document.querySelector(`.lesson-item[data-id="${data.id}"]`);
                if(oldElement) oldElement.remove();
            }

            // Voeg toe aan de nieuwe positie in de data
            if (!currentLessonSchedule[dayOfWeek]) {
                currentLessonSchedule[dayOfWeek] = [];
            }
            // Voeg de les toe aan de array van lessen voor die dag
            // Zorg ervoor dat we een kopie toevoegen, zodat we de originele data niet wijzigen
            const newLessonInstance = { ...data, id: generateUniqueId(), originalDayOfWeek: dayOfWeek }; // Nieuwe ID voor de instantie
            currentLessonSchedule[dayOfWeek].push(newLessonInstance);

            // Verwijder placeholder indien aanwezig
            const placeholder = zone.querySelector('p.text-gray-500');
            if (placeholder) {
                placeholder.remove();
            }

            // Voeg de les toe aan de DOM van de nieuwe cel
            const lessonElement = createScheduledLessonElement(newLessonInstance);
            zone.appendChild(lessonElement);

            showMessage(`Les '${data.name}' gepland op ${dayOfWeek}!`, 'success');
        });
    });

    // Opslaan van het gehele lesrooster
    if (saveLessonScheduleBtn) {
        saveLessonScheduleBtn.addEventListener('click', async () => {
            try {
                // Sla het hele rooster op onder een specifieke week-ID
                await putData('lessonSchedules', {
                    id: `week-${currentWeekNumber}`,
                    schedule: currentLessonSchedule,
                    lastUpdated: new Date().toISOString()
                });
                showMessage('Lesrooster succesvol opgeslagen!', 'success');
            } catch (error) {
                console.error("Fout bij opslaan lesrooster:", error);
                showMessage('Fout bij opslaan lesrooster.', 'error');
            }
        });
    }

    // --- Initialisatie ---
    loadAvailableLessons();
    renderLessonSchedule();
}
