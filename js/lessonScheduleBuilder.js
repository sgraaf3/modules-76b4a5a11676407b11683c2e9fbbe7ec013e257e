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

    // Functie om eindtijd te berekenen
    function calculateEndTime(startTime, duration) {
        if (!startTime || !duration) return '';
        const [hours, minutes] = startTime.split(':').map(Number);
        const start = new Date();
        start.setHours(hours, minutes, 0, 0);
        start.setMinutes(start.getMinutes() + duration);
        return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
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

    const copyLessonBtn = document.getElementById('copyLessonBtn');
    const copyWeekBtn = document.getElementById('copyWeekBtn');
    const copyLessonModal = document.getElementById('copyLessonModal');
    const copyLessonModalCloseBtn = document.getElementById('copyLessonModalCloseBtn');
    const copyLessonTargetDays = document.getElementById('copyLessonTargetDays');
    const copyLessonTargetWeeks = document.getElementById('copyLessonTargetWeeks');
    const confirmCopyLessonBtn = document.getElementById('confirmCopyLessonBtn');
    const copyWeekModal = document.getElementById('copyWeekModal');
    const copyWeekModalCloseBtn = document.getElementById('copyWeekModalCloseBtn');
    const copyWeekTargetWeeks = document.getElementById('copyWeekTargetWeeks');
    const confirmCopyWeekBtn = document.getElementById('confirmCopyWeekBtn');


    let currentWeekNumber = 0; // Relative week number (0 = current week)
    let currentLessonSchedule = {}; // { dayOfWeek: [lessons] } voor de huidige week
    let lessonToCopy = null; // Tijdelijke opslag voor de les die gekopieerd moet worden

    // --- Lessen Beheer (aanmaken, laden, filteren) ---

    // Definieer sportsectie kleuren
    const sportSectionColors = {
        fitness: 'bg-red-600',
        budo: 'bg-gray-200 text-gray-900', // Wit met donkere tekst
        dance: 'bg-yellow-500',
        swim: 'bg-blue-500',
        group: 'bg-green-500',
        default: 'bg-gray-600'
    };

    // Laadt en filtert lessen in de zijbalk
    async function loadAvailableLessons() {
        if (!availableLessonsList) {
            console.error("Element with ID 'availableLessonsList' not found.");
            return;
        }
        availableLessonsList.innerHTML = '';
        const lessons = await getAllData('lessons'); // Haal lessen op uit IndexedDB
        const selectedCategory = lessonCategorySelect ? lessonCategorySelect.value : 'all';

        const filteredLessons = selectedCategory === 'all'
            ? lessons
            : lessons.filter(lesson => lesson.category === selectedCategory);

        if (filteredLessons.length === 0) {
            availableLessonsList.innerHTML = '<p class="text-gray-400 text-sm">Geen lessen beschikbaar in deze categorie.</p>';
            return;
        }

        filteredLessons.forEach(lesson => {
            const lessonItem = document.createElement('div');
            const categoryClass = sportSectionColors[lesson.category] || sportSectionColors.default;
            lessonItem.className = `lesson-item drag-item ${categoryClass} p-3 rounded-md shadow flex flex-col cursor-grab`;
            lessonItem.setAttribute('draggable', 'true');
            lessonItem.dataset.id = lesson.id;
            lessonItem.dataset.name = lesson.name;
            lessonItem.dataset.category = lesson.category;
            lessonItem.dataset.teacher = lesson.teacher || '';
            lessonItem.dataset.startTime = lesson.startTime || '';
            lessonItem.dataset.duration = lesson.duration || '';
            lessonItem.dataset.endTime = calculateEndTime(lesson.startTime, lesson.duration); // Auto-berekend
            lessonItem.dataset.room = lesson.room || '';
            lessonItem.dataset.totalPlaces = lesson.totalPlaces || '';
            lessonItem.dataset.explanation = lesson.explanation || '';
            lessonItem.dataset.teacherNotes = lesson.teacherNotes || '';
            lessonItem.dataset.docs = lesson.docs || '';

            lessonItem.innerHTML = `
                <div class="lesson-header">
                    <span>${lesson.name} (${lesson.category})</span>
                </div>
                <div class="lesson-details">
                    ${lesson.startTime ? `${lesson.startTime} - ${lessonItem.dataset.endTime} | ` : ''}
                    Docent: ${lesson.teacher || 'N.v.t.'} | Lokaal: ${lesson.room || 'N.v.t.'}
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
            const startTime = document.getElementById('newLessonStartTime').value;
            const duration = parseInt(document.getElementById('newLessonDuration').value) || 0;
            const newLesson = {
                id: generateUniqueId(),
                name: document.getElementById('newLessonName').value,
                category: document.getElementById('newLessonCategory').value,
                teacher: document.getElementById('newLessonTeacher').value,
                startTime: startTime,
                duration: duration,
                endTime: calculateEndTime(startTime, duration), // Auto-berekend
                room: document.getElementById('newLessonRoom').value,
                totalPlaces: parseInt(document.getElementById('newLessonTotalPlaces').value) || 0,
                explanation: document.getElementById('newLessonExplanation').value,
                teacherNotes: document.getElementById('newLessonTeacherNotes').value,
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
        if (!currentWeekDisplay) {
            console.error("Element with ID 'currentWeekDisplay' not found.");
            return;
        }

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
                // Sorteer lessen op starttijd voordat ze worden weergegeven
                lessonsForDay.sort((a, b) => {
                    if (!a.startTime || !b.startTime) return 0;
                    return a.startTime.localeCompare(b.startTime);
                });

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
        const categoryClass = sportSectionColors[lessonData.category] || sportSectionColors.default;
        lessonElement.className = `lesson-item flex flex-col p-3 rounded-md shadow relative cursor-grab ${categoryClass}`;
        lessonElement.setAttribute('draggable', 'true');
        lessonElement.dataset.id = lessonData.id;
        lessonElement.dataset.name = lessonData.name;
        lessonElement.dataset.category = lessonData.category;
        lessonElement.dataset.teacher = lessonData.teacher || '';
        lessonElement.dataset.startTime = lessonData.startTime || '';
        lessonElement.dataset.duration = lessonData.duration || '';
        lessonElement.dataset.endTime = calculateEndTime(lessonData.startTime, lessonData.duration); // Auto-berekend
        lessonElement.dataset.room = lessonData.room || '';
        lessonElement.dataset.totalPlaces = lessonData.totalPlaces || '';
        lessonElement.dataset.explanation = lessonData.explanation || '';
        lessonElement.dataset.teacherNotes = lessonData.teacherNotes || '';
        lessonElement.dataset.docs = lessonData.docs || '';

        lessonElement.innerHTML = `
            <div class="lesson-header">
                <span>${lessonData.name}</span>
                <button class="remove-btn text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button>
            </div>
            <div class="lesson-details">
                ${lessonData.startTime ? `${lessonData.startTime} - ${lessonElement.dataset.endTime} ` : ''}
                ${lessonData.room ? `(${lessonData.room})` : ''}<br>
                Docent: ${lessonData.teacher || 'N.v.t.'} | Plekken: ${lessonData.totalPlaces || '--'}
            </div>
            <div class="lesson-settings hidden flex flex-col gap-2 mt-2">
                <input type="time" placeholder="Starttijd" data-start-time-input value="${lessonData.startTime || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <input type="number" placeholder="Duur (min)" data-duration-input value="${lessonData.duration || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <input type="text" placeholder="Lokaal/Ruimte" data-room-input value="${lessonData.room || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <input type="number" placeholder="Totaal aantal plaatsen" data-total-places-input value="${lessonData.totalPlaces || ''}" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">
                <textarea placeholder="Uitleg (voor leden)" data-explanation-input rows="2" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">${lessonData.explanation || ''}</textarea>
                <textarea placeholder="Notities (alleen voor docent)" data-teacher-notes-input rows="2" class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm">${lessonData.teacherNotes || ''}</textarea>
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
        lessonElement.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Voorkom dat de klik doorgeeft aan de header
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
            const dataToTransfer = { ...lessonData, isScheduled: true, originalDayOfWeek: lessonElement.parentNode.parentNode.dataset.dayOfWeek }; // Voeg vlag en originele dag toe
            e.dataTransfer.setData('text/plain', JSON.stringify(dataToTransfer));
            e.dataTransfer.effectAllowed = 'move';
        });

        // Event listeners voor wijzigingen in inputvelden (voor live updates in data)
        lessonElement.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('change', () => {
                const dayOfWeek = lessonElement.parentNode.parentNode.dataset.dayOfWeek;
                const lessonIndex = currentLessonSchedule[dayOfWeek].findIndex(l => l.id === lessonData.id);
                if (lessonIndex !== -1) {
                    const updatedLesson = currentLessonSchedule[dayOfWeek][lessonIndex];
                    if (input.dataset.teacherInput !== undefined) updatedLesson.teacher = input.value;
                    if (input.dataset.durationInput !== undefined) updatedLesson.duration = parseInt(input.value) || 0;
                    if (input.dataset.explanationInput !== undefined) updatedLesson.explanation = input.value;
                    if (input.dataset.teacherNotesInput !== undefined) updatedLesson.teacherNotes = input.value;
                    if (input.dataset.docsInput !== undefined) updatedLesson.docs = input.value;
                    if (input.dataset.roomInput !== undefined) updatedLesson.room = input.value;
                    if (input.dataset.totalPlacesInput !== undefined) updatedLesson.totalPlaces = parseInt(input.value) || 0;
                    if (input.dataset.startTimeInput !== undefined) {
                        updatedLesson.startTime = input.value;
                        updatedLesson.endTime = calculateEndTime(updatedLesson.startTime, updatedLesson.duration);
                        // Update de weergegeven tijden in lesson-details
                        lessonElement.querySelector('.lesson-details').innerHTML = `
                            ${updatedLesson.startTime ? `${updatedLesson.startTime} - ${updatedLesson.endTime} ` : ''}
                            ${updatedLesson.room ? `(${updatedLesson.room})` : ''}<br>
                            Docent: ${updatedLesson.teacher || 'N.v.t.'} | Plekken: ${updatedLesson.totalPlaces || '--'}
                        `;
                    }
                }
            });
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
                const oldCell = document.querySelector(`.calendar-day-cell-lesson[data-day-of-week="${data.originalDayOfWeek}"] .lesson-drop-zone`);
                if (oldCell && currentLessonSchedule[data.originalDayOfWeek] && currentLessonSchedule[data.originalDayOfWeek].length === 0) {
                    oldCell.innerHTML = '<p class="text-gray-500 text-sm">Sleep lessen hierheen</p>';
                }
                // Verwijder het element uit de DOM van de oude cel
                const oldElement = document.querySelector(`.lesson-item[data-id="${data.id}"]`);
                if(oldElement) oldElement.remove();
            }

            // Voeg toe aan de nieuwe positie in de data
            if (!currentLessonSchedule[dayOfWeek]) {
                currentLessonSchedule[dayOfWeek] = [];
            }
            // Zorg ervoor dat we een kopie toevoegen, zodat we de originele data niet wijzigen
            // En geef een nieuwe unieke ID aan de gekopieerde instantie
            const newLessonInstance = { ...data, id: generateUniqueId(), originalDayOfWeek: dayOfWeek }; 
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

    // --- Herhaal functionaliteit (Kopiëren) ---

    // Open Kopieer Les Modal
    if (copyLessonBtn) {
        copyLessonBtn.addEventListener('click', () => {
            // Check of er lessen zijn om te kopiëren
            const allLessonsInWeek = Object.values(currentLessonSchedule).flat();
            if (allLessonsInWeek.length === 0) {
                showMessage('Geen lessen in deze week om te kopiëren.', 'warning');
                return;
            }

            // Populeer de dropdown met lessen uit de huidige week
            copyLessonTargetDays.innerHTML = '';
            const daysOfWeek = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
            daysOfWeek.forEach(day => {
                if (currentLessonSchedule[day] && currentLessonSchedule[day].length > 0) {
                    currentLessonSchedule[day].forEach(lesson => {
                        const option = document.createElement('option');
                        option.value = `${day}|${lesson.id}`; // Dag en les ID combineren
                        option.textContent = `${day}: ${lesson.name} (${lesson.startTime})`;
                        copyLessonTargetDays.appendChild(option);
                    });
                }
            });

            if (copyLessonTargetDays.options.length === 0) {
                showMessage('Geen lessen gevonden om te kopiëren in de huidige week.', 'warning');
                return;
            }

            copyLessonModal.classList.add('active');
        });
    }

    // Sluit Kopieer Les Modal
    if (copyLessonModalCloseBtn) {
        copyLessonModalCloseBtn.addEventListener('click', () => {
            copyLessonModal.classList.remove('active');
        });
    }

    // Bevestig Kopiëren Les
    if (confirmCopyLessonBtn) {
        confirmCopyLessonBtn.addEventListener('click', async () => {
            const selectedOptions = Array.from(copyLessonTargetDays.selectedOptions);
            const lessonsToDuplicate = [];

            selectedOptions.forEach(option => {
                const [day, lessonId] = option.value.split('|');
                const lesson = currentLessonSchedule[day]?.find(l => l.id === lessonId);
                if (lesson) {
                    lessonsToDuplicate.push(lesson);
                }
            });

            const numberOfWeeks = parseInt(copyLessonTargetWeeks.value) || 0;

            if (lessonsToDuplicate.length === 0 && numberOfWeeks === 0) {
                showMessage('Selecteer lessen en/of het aantal weken om te kopiëren.', 'warning');
                return;
            }

            // Kopieer naar huidige week (indien geselecteerd) en/of toekomstige weken
            for (let i = 0; i <= numberOfWeeks; i++) {
                const targetWeekNumber = currentWeekNumber + i;
                let targetSchedule = await getData('lessonSchedules', `week-${targetWeekNumber}`);
                if (!targetSchedule) {
                    targetSchedule = { id: `week-${targetWeekNumber}`, schedule: {} };
                }

                lessonsToDuplicate.forEach(lesson => {
                    const newLessonInstance = { ...lesson, id: generateUniqueId() }; // Nieuwe unieke ID
                    const targetDayOfWeek = lesson.originalDayOfWeek || "Maandag"; // Gebruik oorspronkelijke dag of standaard

                    if (!targetSchedule.schedule[targetDayOfWeek]) {
                        targetSchedule.schedule[targetDayOfWeek] = [];
                    }
                    // Voorkom duplicaten als al bestaat (optioneel, afhankelijk van gewenst gedrag)
                    const exists = targetSchedule.schedule[targetDayOfWeek].some(l => 
                        l.name === newLessonInstance.name && 
                        l.startTime === newLessonInstance.startTime &&
                        l.room === newLessonInstance.room
                    );
                    if (!exists) {
                        targetSchedule.schedule[targetDayOfWeek].push(newLessonInstance);
                    }
                });
                await putData('lessonSchedules', targetSchedule);
            }

            showMessage(`${lessonsToDuplicate.length} lessen gekopieerd voor ${numberOfWeeks} weken!`, 'success');
            copyLessonModal.classList.remove('active');
            renderLessonSchedule(); // Herlaad de huidige week
        });
    }

    // Open Kopieer Week Modal
    if (copyWeekBtn) {
        copyWeekBtn.addEventListener('click', () => {
            if (Object.keys(currentLessonSchedule).length === 0) {
                showMessage('De huidige week is leeg. Er is niets om te kopiëren.', 'warning');
                return;
            }
            copyWeekModal.classList.add('active');
        });
    }

    // Sluit Kopieer Week Modal
    if (copyWeekModalCloseBtn) {
        copyWeekModalCloseBtn.addEventListener('click', () => {
            copyWeekModal.classList.remove('active');
        });
    }

    // Bevestig Kopiëren Week
    if (confirmCopyWeekBtn) {
        confirmCopyWeekBtn.addEventListener('click', async () => {
            const numberOfWeeks = parseInt(copyWeekTargetWeeks.value) || 0;
            if (numberOfWeeks <= 0) {
                showMessage('Voer een geldig aantal weken in om te kopiëren.', 'warning');
                return;
            }

            for (let i = 1; i <= numberOfWeeks; i++) { // Start bij 1, want huidige week is week 0
                const targetWeekNumber = currentWeekNumber + i;
                const newWeekSchedule = {};

                for (const dayOfWeek in currentLessonSchedule) {
                    if (currentLessonSchedule[dayOfWeek]) {
                        newWeekSchedule[dayOfWeek] = currentLessonSchedule[dayOfWeek].map(lesson => ({
                            ...lesson,
                            id: generateUniqueId() // Geef elke gekopieerde les een nieuwe ID
                        }));
                    }
                }
                await putData('lessonSchedules', { id: `week-${targetWeekNumber}`, schedule: newWeekSchedule, lastUpdated: new Date().toISOString() });
            }

            showMessage(`Huidige week gekopieerd naar de volgende ${numberOfWeeks} weken!`, 'success');
            copyWeekModal.classList.remove('active');
            renderLessonSchedule(); // Herlaad de huidige week
        });
    }


    // --- Initialisatie ---
    loadAvailableLessons();
    renderLessonSchedule();
}
