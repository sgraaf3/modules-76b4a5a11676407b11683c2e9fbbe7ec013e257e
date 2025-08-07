export  function initScheduleBuilderView() {

// Functie om een unieke ID te genereren
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Functie om een bericht te tonen
function showMessage(message, type = 'info') {
    const msgBox = document.getElementById('message-box');
    msgBox.textContent = message;
    msgBox.className = `message-box show bg-${type === 'error' ? 'red' : type === 'success' ? 'green' : 'gray'}-700`;
    setTimeout(() => {
        msgBox.classList.remove('show');
    }, 3000);
}

// --- Tab Navigatie Logica ---
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(`tab-${button.dataset.tab}`).classList.add('active');

        // Laad opgeslagen items wanneer van tabblad wordt gewisseld
        loadSavedDays();
        loadSavedWeeks();
        loadSavedBloks();
        loadCustomMeasurements(); 
    });
});

// --- Drag & Drop Logica ---
let draggedItemData = null; // Slaat de data van het gesleepte item op

document.querySelectorAll('.drag-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
        draggedItemData = {
            type: e.target.dataset.type,
            name: e.target.dataset.name,
            icon: e.target.dataset.icon,
            id: e.target.dataset.id || generateUniqueId(), // Gebruik bestaande ID of genereer een nieuwe
            content: e.target.dataset.content ? JSON.parse(e.target.dataset.content) : null, // Voor geneste items
            zoneColor: e.target.dataset.zoneColor || '', // Voor HR zone kleur
            duration: e.target.dataset.duration || null, // Voor initiële duur bij kopiëren
            progressionEnabled: e.target.dataset.progressionEnabled === 'true', // Voor initiële progressie bij kopiëren
            progressionValue: e.target.dataset.progressionValue || null, // Voor initiële progressie waarde bij kopiëren
            // Specifiek voor aangepaste metingen
            customMeasurementType: e.target.dataset.customMeasurementType || null,
            customMeasurementDefinition: e.target.dataset.customMeasurementDefinition ? JSON.parse(e.target.dataset.customMeasurementDefinition) : null,
            customMeasurementDescription: e.target.dataset.customMeasurementDescription || null,
            customMeasurementGoals: e.target.dataset.customMeasurementGoals || null
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(draggedItemData));
        e.dataTransfer.effectAllowed = 'move';
    });
});

document.querySelectorAll('.drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        zone.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    });

    zone.addEventListener('dragleave', (e) => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const dropZoneId = zone.id; 
        const dropZoneClasses = zone.classList; 

        // Validatie van drop-actie
        let isValidDrop = false;
        let expectedTypes = [];

        if (dropZoneId === 'day-drop-zone') { 
            expectedTypes = ['hr-zone', 'rest-day', 'training-measurement', 'rest-measurement-free', 'rest-measurement-base', 'document-link', 'custom-training-measurement', 'custom-rest-measurement'];
            if (expectedTypes.includes(data.type)) {
                isValidDrop = true;
            }
        } else if (dropZoneClasses.contains('day-slot')) {
            expectedTypes = ['day'];
            if (data.type === 'day') {
                isValidDrop = true;
            }
        } else if (dropZoneClasses.contains('week-slot')) {
            expectedTypes = ['week'];
            if (data.type === 'week') {
                isValidDrop = true;
            }
        } else if (dropZoneId === 'blok-drop-zone') {
            expectedTypes = ['week'];
            if (data.type === 'week') { 
                isValidDrop = true;
            }
        } else if (dropZoneId === 'custom-training-zones-drop-zone') { 
            expectedTypes = ['hr-zone'];
            if (data.type === 'hr-zone') {
                isValidDrop = true;
            }
        }

        if (!isValidDrop) {
            let specificMessage = `Kan '${data.name}' (type: ${data.type}) niet slepen naar deze zone.`;
            if (expectedTypes.length > 0) {
                specificMessage += ` Deze zone accepteert alleen: ${expectedTypes.map(t => t.replace(/-/g, ' ')).join(', ')}.`;
            }
            showMessage(specificMessage, 'error');
            console.error("Ongeldige drop poging:", { draggedType: data.type, targetId: dropZoneId, targetClasses: Array.from(dropZoneClasses) });
            return;
        }

        // Verwijder placeholder tekst indien aanwezig
        const placeholder = zone.querySelector('p.text-gray-400');
        if (placeholder) {
            placeholder.remove();
        }

        // Maak het gedropte item aan
        const droppedItem = document.createElement('div');
        droppedItem.dataset.id = data.id;
        droppedItem.dataset.type = data.type;
        droppedItem.dataset.name = data.name;
        if (data.content) {
            droppedItem.dataset.content = JSON.stringify(data.content);
        }
        if (data.zoneColor) droppedItem.dataset.zoneColor = data.zoneColor;
        if (data.documentName) droppedItem.dataset.documentName = data.documentName;
        if (data.customMeasurementType) droppedItem.dataset.customMeasurementType = data.customMeasurementType;
        if (data.customMeasurementDefinition) droppedItem.dataset.customMeasurementDefinition = JSON.stringify(data.customMeasurementDefinition);
        if (data.customMeasurementDescription) droppedItem.dataset.customMeasurementDescription = data.customMeasurementDescription;
        if (data.customMeasurementGoals) droppedItem.dataset.customMeasurementGoals = data.customMeasurementGoals;


        let innerHtmlContent = `<span><i class="${data.icon} mr-2 ${data.zoneColor || ''}"></i>${data.name}</span>`;
        
        if (dropZoneId === 'day-drop-zone') { // Items gesleept naar de Dag tijdlijn
            droppedItem.className = `timeline-item flex items-center p-2 mb-1 rounded-md bg-gray-700`;
            
            const rect = zone.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            droppedItem.style.top = `${relativeY}px`;
            droppedItem.style.left = '0';
            droppedItem.style.width = '100%';
            droppedItem.style.position = 'absolute';

            if (data.type === 'hr-zone') {
                innerHtmlContent += `
                    <div class="flex items-center space-x-2 ml-auto">
                        <input type="number" placeholder="Minuten" class="w-20 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-duration-input value="${data.duration || ''}">
                        <label class="flex items-center text-sm text-gray-300">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" data-progression-checkbox ${data.progressionEnabled ? 'checked' : ''}>
                            <span class="ml-1">Wekelijks toenemen?</span>
                        </label>
                        <input type="number" placeholder="Minuten" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-progression-value-input value="${data.progressionValue || ''}" ${!data.progressionEnabled ? 'disabled' : ''}>
                            <input type="text" placeholder="Notities" class="w-24 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-notes-input value="${data.notes || ''}">
                    </div>
                `;
                droppedItem.classList.add('hr-zone-bar');
            } else if (data.type === 'document-link') {
                if (!data.documentName) { 
                    const docName = prompt('Voer de naam/ID van het document in:');
                    data.documentName = docName || 'Onbekend Document';
                }
                droppedItem.dataset.documentName = data.documentName;
                innerHtmlContent += `<span class="ml-2 text-gray-400">(${data.documentName})</span>`;
            } else if (data.type === 'custom-training-measurement' && data.customMeasurementDefinition) {
                const totalDuration = data.customMeasurementDefinition.reduce((sum, item) => sum + (item.duration || 0), 0);
                innerHtmlContent += `<span class="ml-2 text-gray-400">(${totalDuration} min)</span>`;
            } else if (data.type === 'custom-rest-measurement' && data.customMeasurementDescription) {
                 innerHtmlContent += `<span class="ml-2 text-gray-400">(${data.customMeasurementDescription.substring(0, 20)}...)</span>`;
            } else if (['strength-exercise', 'recovery-activity', 'coordination-activity', 'flexibility-activity', 'speed-activity', 'nutrition-activity'].includes(data.type)) {
                // Determine initial display based on data.inputType
                const timeDisplay = data.inputType === 'reps_sets' ? 'display:none;' : 'display:flex;';
                const repsSetsDisplay = data.inputType === 'time' || !data.inputType ? 'display:none;' : 'display:flex;';

                innerHtmlContent += `
                    <div class="flex items-center space-x-2 ml-auto w-full md:w-auto flex-wrap">
                        <select class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-input-type-select>
                            <option value="time" ${data.inputType === 'time' ? 'selected' : ''}>Tijd (min)</option>
                            <option value="reps_sets" ${data.inputType === 'reps_sets' ? 'selected' : ''}>Reps & Sets</option>
                        </select>
                        <div class="flex items-center space-x-1 mt-1" data-time-inputs style="${timeDisplay}">
                            <input type="number" placeholder="Duur" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-duration-input value="${data.duration || ''}">
                            <input type="number" placeholder="Min" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-time-input value="${data.minTime || ''}">
                            <input type="number" placeholder="Max" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-time-input value="${data.maxTime || ''}">
                        </div>
                        <div class="flex items-center space-x-1 mt-1" data-reps-sets-inputs style="${repsSetsDisplay}">
                            <input type="number" placeholder="Reps" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-reps-input value="${data.reps || ''}">
                            <input type="number" placeholder="Sets" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-sets-input value="${data.sets || ''}">
                            <input type="number" placeholder="Min R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-reps-input value="${data.minReps || ''}">
                            <input type="number" placeholder="Max R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-reps-input value="${data.maxReps || ''}">
                            <input type="number" placeholder="Min S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-sets-input value="${data.minSets || ''}">
                            <input type="number" placeholder="Max S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-sets-input value="${data.maxSets || ''}">
                        </div>
                        <label class="flex items-center text-sm text-gray-300 mt-1">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" data-progression-checkbox ${data.progressionEnabled ? 'checked' : ''}>
                            <span class="ml-1">Wekelijks toenemen?</span>
                        </label>
                        <input type="number" placeholder="Waarde" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-progression-value-input value="${data.progressionValue || ''}" ${!data.progressionEnabled ? 'disabled' : ''}>
                        <input type="text" placeholder="Notities" class="w-24 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-notes-input value="${data.notes || ''}">
                    </div>
                `;
            }
            innerHtmlContent += `<button class="remove-btn"><i class="fas fa-times"></i></button>`;
            droppedItem.innerHTML = innerHtmlContent;
            zone.appendChild(droppedItem);

            // Event listeners for dynamic inputs
            const inputTypeSelect = droppedItem.querySelector('[data-input-type-select]');
            const timeInputsDiv = droppedItem.querySelector('[data-time-inputs]');
            const repsSetsInputsDiv = droppedItem.querySelector('[data-reps-sets-inputs]');
            const progressionCheckbox = droppedItem.querySelector('[data-progression-checkbox]');
            const progressionValueInput = droppedItem.querySelector('[data-progression-value-input]');

            if (inputTypeSelect) {
                inputTypeSelect.addEventListener('change', () => {
                    if (inputTypeSelect.value === 'time') {
                        if (timeInputsDiv) timeInputsDiv.style.display = 'flex';
                        if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'none';
                    } else {
                        if (timeInputsDiv) timeInputsDiv.style.display = 'none';
                        if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'flex';
                    }
                });
                inputTypeSelect.dispatchEvent(new Event('change')); // Trigger initial display
            }
            if (progressionCheckbox && progressionValueInput) {
                progressionCheckbox.addEventListener('change', () => {
                    progressionValueInput.disabled = !progressionCheckbox.checked;
                    if (!progressionCheckbox.checked) {
                        progressionValueInput.value = '';
                    }
                });
            }


        } else if (dropZoneId === 'custom-training-zones-drop-zone') { // Items gesleept naar Custom Training Builder
             droppedItem.className = 'dropped-item flex items-center p-2 mb-1 rounded-md bg-gray-700';
             innerHtmlContent += `
                <div class="flex items-center space-x-2 ml-auto w-full md:w-auto flex-wrap">
                    <select class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-input-type-select>
                        <option value="time" ${data.inputType === 'time' ? 'selected' : ''}>Tijd (min)</option>
                        <option value="reps_sets" ${data.inputType === 'reps_sets' ? 'selected' : ''}>Reps & Sets</option>
                    </select>
                    <div class="flex items-center space-x-1 mt-1" data-time-inputs style="${data.inputType === 'reps_sets' ? 'display:none;' : ''}">
                        <input type="number" placeholder="Duur" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-duration-input value="${data.duration || ''}">
                        <input type="number" placeholder="Min" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-time-input value="${data.minTime || ''}">
                        <input type="number" placeholder="Max" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-time-input value="${data.maxTime || ''}">
                    </div>
                    <div class="flex items-center space-x-1 mt-1" data-reps-sets-inputs style="${data.inputType === 'time' || !data.inputType ? 'display:none;' : ''}">
                        <input type="number" placeholder="Reps" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-reps-input value="${data.reps || ''}">
                        <input type="number" placeholder="Sets" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-sets-input value="${data.sets || ''}">
                        <input type="number" placeholder="Min R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-reps-input value="${data.minReps || ''}">
                        <input type="number" placeholder="Max R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-reps-input value="${data.maxReps || ''}">
                        <input type="number" placeholder="Min S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-sets-input value="${data.minSets || ''}">
                        <input type="number" placeholder="Max S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-sets-input value="${data.maxSets || ''}">
                    </div>
                    <label class="flex items-center text-sm text-gray-300 mt-1">
                        <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" data-progression-checkbox ${data.progressionEnabled ? 'checked' : ''}>
                        <span class="ml-1">Wekelijks toenemen?</span>
                    </label>
                    <input type="number" placeholder="Waarde" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-progression-value-input value="${data.progressionValue || ''}" ${!data.progressionEnabled ? 'disabled' : ''}>
                    <input type="text" placeholder="Notities" class="w-24 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-notes-input value="${data.notes || ''}">
                </div>
            `;
            innerHtmlContent += `<button class="remove-btn"><i class="fas fa-times"></i></button>`;
            droppedItem.innerHTML = innerHtmlContent;
            zone.appendChild(droppedItem);

            // Event listeners for new inputs
            const inputTypeSelect = droppedItem.querySelector('[data-input-type-select]');
            const timeInputsDiv = droppedItem.querySelector('[data-time-inputs]');
            const repsSetsInputsDiv = droppedItem.querySelector('[data-reps-sets-inputs]');
            const progressionCheckbox = droppedItem.querySelector('[data-progression-checkbox]');
            const progressionValueInput = droppedItem.querySelector('[data-progression-value-input]');

            if (inputTypeSelect) {
                inputTypeSelect.addEventListener('change', () => {
                    if (inputTypeSelect.value === 'time') {
                        if (timeInputsDiv) timeInputsDiv.style.display = 'flex';
                        if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'none';
                    } else {
                        if (timeInputsDiv) timeInputsDiv.style.display = 'none';
                        if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'flex';
                    }
                });
                inputTypeSelect.dispatchEvent(new Event('change')); // Trigger initial display
            }
            if (progressionCheckbox && progressionValueInput) {
                progressionCheckbox.addEventListener('change', () => {
                    progressionValueInput.disabled = !progressionCheckbox.checked;
                    if (!progressionCheckbox.checked) {
                        progressionValueInput.value = '';
                    }
                });
            }


        } else { // Voor week-slot, blok-drop-zone (niet-tijdlijn weergaven)
            droppedItem.className = 'dropped-item flex items-center justify-between p-2 mb-2 rounded-md bg-gray-700';
            if (data.type === 'week' && dropZoneId === 'blok-drop-zone') { // Alleen voor weken in blok
                innerHtmlContent += `
                    <div class="flex items-center space-x-2 ml-auto">
                        <span class="text-sm text-gray-300">Herhalingen:</span>
                        <input type="number" value="1" min="1" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-repetitions-input>
                            </div>
                `;
            }
            innerHtmlContent += `<button class="remove-btn"><i class="fas fa-times"></i></button>`;
            droppedItem.innerHTML = innerHtmlContent;
            zone.innerHTML = ''; 
            zone.appendChild(droppedItem);
        }
        
        // Voeg event listener toe voor verwijderen (voor alle dropped items)
        droppedItem.querySelector('.remove-btn').addEventListener('click', () => {
            droppedItem.remove();
            // Voeg placeholder terug als de zone leeg is
            if (zone.children.length === 0) {
                const newPlaceholder = document.createElement('p');
                newPlaceholder.className = 'text-gray-400 text-center text-sm';
                if (dropZoneId === 'day-drop-zone' || dropZoneId === 'custom-training-zones-drop-zone') { 
                    newPlaceholder.textContent = 'Sleep HR zones of oefeningen hierheen om de training te definiëren.';
                } else if (dropZoneClasses.contains('day-slot')) {
                    newPlaceholder.textContent = 'Sleep dag hier';
                } else if (dropZoneClasses.contains('week-slot')) {
                    newPlaceholder.textContent = 'Sleep week hier';
                } else if (dropZoneId === 'blok-drop-zone') {
                    newPlaceholder.textContent = 'Sleep weken hierheen om het blok te configureren.';
                }
                zone.appendChild(newPlaceholder);
            }
        });

        showMessage(`${data.name} toegevoegd!`, 'success');
    });
});

// --- Hulpfunctie om dropzones te vullen bij kopiëren en laden ---
function populateDropZone(dropZoneElement, contentData, targetType) {
    dropZoneElement.innerHTML = ''; // Maak de dropzone leeg
    if (!contentData || (Array.isArray(contentData) && contentData.length === 0 && dropZoneElement.id !== 'blok-drop-zone')) { // targetType 'object' is for week/month slots
         const newPlaceholder = document.createElement('p');
         newPlaceholder.className = 'text-gray-400 text-center text-sm';
         if (dropZoneElement.id === 'day-drop-zone' || dropZoneElement.id === 'custom-training-zones-drop-zone') {
            newPlaceholder.textContent = 'Sleep HR zones of oefeningen hierheen om de training te definiëren.';
         } else if (dropZoneElement.classList.contains('day-slot')) {
            newPlaceholder.textContent = 'Sleep dag hier';
         } else if (dropZoneElement.classList.contains('week-slot')) {
            newPlaceholder.textContent = 'Sleep week hier';
         } else if (dropZoneElement.id === 'blok-drop-zone') {
            newPlaceholder.textContent = 'Sleep weken hierheen om het blok te configureren.';
         }
         dropZoneElement.appendChild(newPlaceholder);
         return;
    }

    if (Array.isArray(contentData)) { // Voor Dag (array van activiteiten) of Custom Training (array van zones)
        contentData.forEach(item => {
            const droppedItem = document.createElement('div');
            droppedItem.dataset.id = item.id || generateUniqueId();
            droppedItem.dataset.type = item.type;
            droppedItem.dataset.name = item.name;
            droppedItem.dataset.icon = item.icon;
            if (item.zoneColor) droppedItem.dataset.zoneColor = item.zoneColor;
            if (item.content) droppedItem.dataset.content = JSON.stringify(item.content); 
            if (item.documentName) droppedItem.dataset.documentName = item.documentName;
            if (item.customMeasurementType) droppedItem.dataset.customMeasurementType = item.customMeasurementType;
            if (item.customMeasurementDefinition) droppedItem.dataset.customMeasurementDefinition = JSON.stringify(item.customMeasurementDefinition);
            if (item.customMeasurementDescription) droppedItem.dataset.customMeasurementDescription = item.customMeasurementDescription;
            if (item.customMeasurementGoals) droppedItem.dataset.customMeasurementGoals = item.customMeasurementGoals;

            // Load new fields
            if (item.inputType) droppedItem.dataset.inputType = item.inputType;
            if (item.reps) droppedItem.dataset.reps = item.reps;
            if (item.sets) droppedItem.dataset.sets = item.sets;
            if (item.minReps) droppedItem.dataset.minReps = item.minReps;
            if (item.maxReps) droppedItem.dataset.maxReps = item.maxReps;
            if (item.minSets) droppedItem.dataset.minSets = item.minSets;
            if (item.maxSets) droppedItem.dataset.maxSets = item.maxSets;
            if (item.minTime) droppedItem.dataset.minTime = item.minTime;
            if (item.maxTime) droppedItem.dataset.maxTime = item.maxTime;
            if (item.notes) droppedItem.dataset.notes = item.notes;


            let innerHtmlContent = `<span><i class="${item.icon} mr-2 ${item.zoneColor || ''}"></i>${item.name}</span>`;
            
            if (item.type === 'hr-zone') {
                droppedItem.className = `timeline-item flex items-center p-2 mb-1 rounded-md bg-gray-700 hr-zone-bar`;
                innerHtmlContent += `
                    <div class="flex items-center space-x-2 ml-auto">
                        <input type="number" placeholder="Minuten" class="w-20 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-duration-input value="${item.duration || ''}">
                        <label class="flex items-center text-sm text-gray-300">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" data-progression-checkbox ${item.progressionEnabled ? 'checked' : ''}>
                            <span class="ml-1">Wekelijks toenemen?</span>
                        </label>
                        <input type="number" placeholder="Minuten" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-progression-value-input value="${item.progressionValue || ''}" ${!item.progressionEnabled ? 'disabled' : ''}>
                        <input type="text" placeholder="Notities" class="w-24 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-notes-input value="${item.notes || ''}">
                    </div>
                `;
            } else {
                droppedItem.className = 'timeline-item flex items-center p-2 mb-1 rounded-md bg-gray-700';
                if (item.type === 'document-link') {
                    innerHtmlContent += `<span class="ml-2 text-gray-400">(${item.documentName || 'Onbekend Document'})</span>`;
                } else if (item.type === 'custom-training-measurement') {
                    const totalDuration = item.customMeasurementDefinition ? item.customMeasurementDefinition.reduce((sum, subItem) => sum + (subItem.duration || 0), 0) : 0;
                    innerHtmlContent += `<span class="ml-2 text-gray-400">(${totalDuration} min)</span>`;
                } else if (item.type === 'custom-rest-measurement') {
                    innerHtmlContent += `<span class="ml-2 text-gray-400">(${item.customMeasurementDescription ? item.customMeasurementDescription.substring(0, 20) + '...' : 'Geen beschrijving'})</span>`;
                } else if (['strength-exercise', 'recovery-activity', 'coordination-activity', 'flexibility-activity', 'speed-activity', 'nutrition-activity'].includes(item.type)) {
                    innerHtmlContent += `
                        <div class="flex items-center space-x-2 ml-auto w-full md:w-auto flex-wrap">
                            <select class="p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-input-type-select>
                                <option value="time" ${item.inputType === 'time' ? 'selected' : ''}>Tijd (min)</option>
                                <option value="reps_sets" ${item.inputType === 'reps_sets' ? 'selected' : ''}>Reps & Sets</option>
                            </select>
                            <div class="flex items-center space-x-1 mt-1" data-time-inputs style="${item.inputType === 'reps_sets' ? 'display:none;' : ''}">
                                <input type="number" placeholder="Duur" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-duration-input value="${item.duration || ''}">
                                <input type="number" placeholder="Min" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-time-input value="${item.minTime || ''}">
                                <input type="number" placeholder="Max" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-time-input value="${item.maxTime || ''}">
                            </div>
                            <div class="flex items-center space-x-1 mt-1" data-reps-sets-inputs style="${item.inputType === 'time' || !item.inputType ? 'display:none;' : ''}">
                                <input type="number" placeholder="Reps" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-reps-input value="${item.reps || ''}">
                                <input type="number" placeholder="Sets" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-sets-input value="${item.sets || ''}">
                                <input type="number" placeholder="Min R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-reps-input value="${item.minReps || ''}">
                                <input type="number" placeholder="Max R" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-reps-input value="${item.maxReps || ''}">
                                <input type="number" placeholder="Min S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-min-sets-input value="${item.minSets || ''}">
                                <input type="number" placeholder="Max S" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-max-sets-input value="${item.maxSets || ''}">
                            </div>
                            <label class="flex items-center text-sm text-gray-300 mt-1">
                                <input type="checkbox" class="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" data-progression-checkbox ${item.progressionEnabled ? 'checked' : ''}>
                                <span class="ml-1">Wekelijks toenemen?</span>
                            </label>
                            <input type="number" placeholder="Waarde" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-progression-value-input value="${item.progressionValue || ''}" ${!item.progressionEnabled ? 'disabled' : ''}>
                            <input type="text" placeholder="Notities" class="w-24 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm mt-1" data-notes-input value="${item.notes || ''}">
                        </div>
                    `;
                }
            }
            innerHtmlContent += `<button class="remove-btn"><i class="fas fa-times"></i></button>`;
            droppedItem.innerHTML = innerHtmlContent;
            
            // Set position for loaded items in day-drop-zone
            if (dropZoneElement.id === 'day-drop-zone') {
                droppedItem.style.top = `${item.topPosition || 0}px`;
                droppedItem.style.left = '0';
                droppedItem.style.width = '100%';
                droppedItem.style.position = 'absolute';
            }

            dropZoneElement.appendChild(droppedItem);

            // Event listeners for loaded items
            if (item.type === 'hr-zone' || ['strength-exercise', 'recovery-activity', 'coordination-activity', 'flexibility-activity', 'speed-activity', 'nutrition-activity'].includes(item.type)) {
                const inputTypeSelect = droppedItem.querySelector('[data-input-type-select]');
                const timeInputsDiv = droppedItem.querySelector('[data-time-inputs]');
                const repsSetsInputsDiv = droppedItem.querySelector('[data-reps-sets-inputs]');
                const progressionCheckbox = droppedItem.querySelector('[data-progression-checkbox]');
                const progressionValueInput = droppedItem.querySelector('[data-progression-value-input]');

                if (inputTypeSelect) {
                    inputTypeSelect.addEventListener('change', () => {
                        if (inputTypeSelect.value === 'time') {
                            if (timeInputsDiv) timeInputsDiv.style.display = 'flex';
                            if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'none';
                        } else {
                            if (timeInputsDiv) timeInputsDiv.style.display = 'none';
                            if (repsSetsInputsDiv) repsSetsInputsDiv.style.display = 'flex';
                        }
                    });
                    inputTypeSelect.dispatchEvent(new Event('change')); // Trigger initial display
                }
                if (progressionCheckbox && progressionValueInput) {
                    progressionCheckbox.addEventListener('change', () => {
                        progressionValueInput.disabled = !progressionCheckbox.checked;
                        if (!progressionCheckbox.checked) {
                            progressionValueInput.value = '';
                        }
                    });
                }
            }
            droppedItem.querySelector('.remove-btn').addEventListener('click', () => {
                droppedItem.remove();
                if (dropZoneElement.children.length === 0) {
                    const newPlaceholder = document.createElement('p');
                    newPlaceholder.className = 'text-gray-400 text-center text-sm';
                    newPlaceholder.textContent = 'Sleep HR zones of oefeningen hierheen om de training te definiëren.';
                    dropZoneElement.appendChild(newPlaceholder);
                }
            });
        });
    } else if (contentData && typeof contentData === 'object' && targetType === 'object') { // Voor Week (object met dagen), Maand (object met weken)
        for (const key in contentData) {
            const slot = dropZoneElement.querySelector(`[data-${dropZoneElement.classList.contains('day-slot') ? 'day-of-week' : 'week-number'}="${key}"]`);
            if (slot) {
                slot.innerHTML = ''; // Clear placeholder
                if (contentData[key]) {
                    const item = contentData[key];
                    const droppedItem = document.createElement('div');
                    droppedItem.className = 'dropped-item flex flex-col p-2 mb-1 rounded-md bg-gray-700';
                    droppedItem.dataset.id = item.id;
                    droppedItem.dataset.type = item.type;
                    droppedItem.dataset.name = item.name;
                    droppedItem.dataset.icon = item.icon;
                    droppedItem.dataset.content = JSON.stringify(item.content); // Recursief voor geneste content

                    // Samenvatting voor dag/week in kalenderweergave
                    let summaryHtml = '';
                    if (item.type === 'day' && item.content && Array.isArray(item.content)) {
                        const hrZonesSummary = item.content.filter(act => act.type === 'hr-zone').map(hrz => `${hrz.name} (${hrz.duration} min)`).join(', ');
                        const otherActivities = item.content.filter(act => act.type !== 'hr-zone').map(act => act.name).join(', ');
                        summaryHtml = `<div class="text-xs text-gray-400 mt-1">${hrZonesSummary}${otherActivities ? (hrZonesSummary ? '; ' : '') + otherActivities : ''}</div>`;
                    } else if (item.type === 'week' && item.content && typeof item.content === 'object') {
                        const daysCount = Object.values(item.content).filter(d => d !== null).length;
                        summaryHtml = `<div class="text-xs text-gray-400 mt-1">${daysCount} dagen geconfigureerd</div>`;
                    }

                    droppedItem.innerHTML = `
                        <span><i class="${item.icon} mr-2"></i>${item.name}</span>
                        ${summaryHtml}
                        <button class="remove-btn absolute top-1 right-1"><i class="fas fa-times"></i></button>
                    `;
                    slot.appendChild(droppedItem);

                    droppedItem.querySelector('.remove-btn').addEventListener('click', () => {
                        droppedItem.remove();
                        const newPlaceholder = document.createElement('p');
                        newPlaceholder.className = 'text-gray-400 text-center text-sm';
                        newPlaceholder.textContent = slot.classList.contains('day-slot') ? 'Sleep dag hier' : 'Sleep week hier';
                        slot.appendChild(newPlaceholder);
                    });
                } else {
                    const newPlaceholder = document.createElement('p');
                    newPlaceholder.className = 'text-gray-400 text-center text-sm';
                    newPlaceholder.textContent = slot.classList.contains('day-slot') ? 'Sleep dag hier' : 'Sleep week hier';
                    slot.appendChild(newPlaceholder);
                }
            }
        }
    } else if (dropZoneElement.id === 'blok-drop-zone') { // Voor Blok (array van maanden)
         if (contentData.length === 0) {
             const newPlaceholder = document.createElement('p');
             newPlaceholder.className = 'text-gray-400 text-center';
             newPlaceholder.textContent = 'Sleep weken hierheen om het blok te configureren.';
             dropZoneElement.appendChild(newPlaceholder);
             return;
        }
        contentData.forEach(item => {
            const droppedItem = document.createElement('div');
            droppedItem.className = 'dropped-item flex flex-col p-3 rounded-md bg-gray-700';
            droppedItem.dataset.id = item.id;
            droppedItem.dataset.type = item.type;
            droppedItem.dataset.name = item.name;
            droppedItem.dataset.icon = item.icon;
            droppedItem.dataset.content = JSON.stringify(item.content);
            if (item.repetitions) droppedItem.dataset.repetitions = item.repetitions; // Load repetitions

            droppedItem.innerHTML = `
                <div class="flex items-center justify-between w-full">
                    <span><i class="${item.icon} mr-2 text-cyan-300"></i>${item.name}</span>
                    <div class="flex items-center space-x-2 ml-auto">
                        <span class="text-sm text-gray-300">Herhalingen:</span>
                        <input type="number" value="${item.repetitions || 1}" min="1" class="w-16 p-1 rounded-md bg-gray-800 border border-gray-600 text-gray-200 text-sm" data-repetitions-input>
                    </div>
                    <button class="remove-btn"><i class="fas fa-times"></i></button>
                </div>
                <div class="text-xs text-gray-300 mt-2">
                    ${Object.keys(item.content).filter(day => item.content[day]).map(day => `<span class="inline-block bg-gray-800 rounded-full px-2 py-1 text-xs font-semibold text-gray-300 mr-1 mb-1">${item.content[day].name}</span>`).join('')}
                </div>
            `;
            dropZoneElement.appendChild(droppedItem);

            droppedItem.querySelector('.remove-btn').addEventListener('click', () => {
                droppedItem.remove();
                if (dropZoneElement.children.length === 0) {
                    const newPlaceholder = document.createElement('p');
                    newPlaceholder.className = 'text-gray-400 text-center';
                    newPlaceholder.textContent = 'Sleep weken hierheen om het blok te configureren.';
                    dropZoneElement.appendChild(newPlaceholder);
                }
            });
        });
    }
}


// --- Opslaan en Laden van Schema's (via localStorage) ---

// Dagen
const currentDayNameInput = document.getElementById('current-day-name');
const dayDropZone = document.getElementById('day-drop-zone'); // Correcte ID
const saveDayBtn = document.getElementById('save-day-btn');
const savedDaysList = document.getElementById('saved-days-list');

saveDayBtn.addEventListener('click', () => {
    const dayName = currentDayNameInput.value.trim();
    if (!dayName) {
        showMessage('Geef de dag een naam.', 'error');
        return;
    }

    const activities = [];
    let hasError = false; 
    dayDropZone.querySelectorAll('.timeline-item').forEach(item => {
        const activity = {
            type: item.dataset.type,
            name: item.dataset.name,
            icon: item.querySelector('i').className,
            zoneColor: item.dataset.zoneColor || '',
            topPosition: parseFloat(item.style.top) || 0 
        };
        if (item.dataset.type === 'hr-zone') {
            const durationInput = item.querySelector('[data-duration-input]');
            const progressionCheckbox = item.querySelector('[data-progression-checkbox]');
            const progressionValueInput = item.querySelector('[data-progression-value-input]');

            const duration = parseInt(durationInput.value);
            if (isNaN(duration) || duration <= 0) {
                hasError = true;
                showMessage('Vul een geldige duur (in minuten) in voor alle hartslagzones.', 'error');
                return; 
            }
            activity.duration = duration;
            activity.progressionEnabled = progressionCheckbox.checked;
            activity.progressionValue = progressionCheckbox.checked ? parseInt(progressionValueInput.value) : null; 
            if (activity.progressionEnabled && (isNaN(activity.progressionValue) || activity.progressionValue <= 0)) {
                hasError = true;
                showMessage('Vul een geldige toename waarde (in minuten) in voor wekelijkse toename.', 'error');
                return;
            }
        } else if (item.dataset.type === 'document-link') {
            activity.documentName = item.dataset.documentName;
        } else if (item.dataset.type === 'custom-training-measurement') {
            activity.customMeasurementType = item.dataset.customMeasurementType;
            activity.customMeasurementDefinition = JSON.parse(item.dataset.customMeasurementDefinition);
        } else if (item.dataset.type === 'custom-rest-measurement') {
            activity.customMeasurementType = item.dataset.customMeasurementType;
            activity.customMeasurementDescription = item.dataset.customMeasurementDescription;
            activity.customMeasurementGoals = item.dataset.customMeasurementGoals;
        }
        activities.push(activity);
    });

    if (hasError) {
        return; 
    }

    if (activities.length === 0) {
        showMessage('Voeg activiteiten toe aan de dag.', 'error');
        return;
    }

    activities.sort((a, b) => a.topPosition - b.topPosition);

    const dayId = generateUniqueId();
    const newDay = { id: dayId, name: dayName, activities: activities };

    let savedDays = JSON.parse(localStorage.getItem('cardioDays') || '[]');
    savedDays.push(newDay);
    localStorage.setItem('cardioDays', JSON.stringify(savedDays));

    showMessage('Dag opgeslagen!', 'success');
    currentDayNameInput.value = '';
    dayDropZone.innerHTML = '<p class="text-gray-400 text-center">Sleep hartslagzones, rust, metingen of documenten hierheen om de dag te configureren.</p>';
    loadSavedDays(); 
});

function loadSavedDays() {
    savedDaysList.innerHTML = '';
    const savedDays = JSON.parse(localStorage.getItem('cardioDays') || '[]');
    if (savedDays.length === 0) {
        savedDaysList.innerHTML = '<p class="text-gray-400 col-span-full">Nog geen dagen opgeslagen.</p>';
        return;
    }

    savedDays.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'drag-item bg-gray-600 p-3 rounded-md shadow flex flex-col cursor-grab';
        dayCard.setAttribute('draggable', 'true');
        dayCard.dataset.type = 'day';
        dayCard.dataset.id = day.id;
        dayCard.dataset.name = day.name;
        dayCard.dataset.icon = 'fas fa-calendar-day'; 
        dayCard.dataset.content = JSON.stringify(day.activities); 

        dayCard.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span><i class="${dayCard.dataset.icon} mr-2 text-blue-300"></i>${day.name}</span>
                <button class="remove-saved-item-btn text-red-400 hover:text-red-300" data-id="${day.id}" data-list="cardioDays"><i class="fas fa-times"></i></button>
            </div>
            <div class="text-xs text-gray-300 mt-2">
                ${day.activities.map(act => {
                    let activityText = `<span class="inline-block bg-gray-800 rounded-full px-2 py-1 text-xs font-semibold text-gray-300 mr-1 mb-1"><i class="${act.icon.split(' ')[1]} mr-1 ${act.zoneColor || ''}"></i>${act.name}`;
                    if (act.type === 'hr-zone') {
                        if (act.duration) {
                            activityText += ` (${act.duration} min)`;
                        }
                        if (act.progressionEnabled && act.progressionValue) {
                            activityText += ` (+${act.progressionValue} min)`; 
                        }
                    } else if (act.type === 'document-link') {
                        activityText += ` (${act.documentName || 'Onbekend'})`;
                    } else if (act.type === 'custom-training-measurement') {
                        const totalDuration = act.customMeasurementDefinition ? act.customMeasurementDefinition.reduce((sum, subItem) => sum + (subItem.duration || 0), 0) : 0;
                        activityText += ` (${totalDuration} min)`;
                    } else if (act.type === 'custom-rest-measurement') {
                        activityText += ` (Aangepaste Rust)`;
                    }
                    activityText += `</span>`;
                    return activityText;
                }).join('')}
            </div>
        `;
        savedDaysList.appendChild(dayCard);
    });
    addRemoveListenersToSavedItems();
}

// Weken
const currentWeekNameInput = document.getElementById('current-week-name');
const weekDaySlots = document.querySelectorAll('.day-slot'); 
const saveWeekBtn = document.getElementById('save-week-btn');
const savedWeeksList = document.getElementById('saved-weeks-list');

saveWeekBtn.addEventListener('click', () => {
    const weekName = currentWeekNameInput.value.trim();
    if (!weekName) {
        showMessage('Geef de week een naam.', 'error');
        return;
    }

    const daysInWeek = {};
    let isEmptyWeek = true;
    weekDaySlots.forEach(slot => {
        const dayOfWeek = slot.dataset.dayOfWeek;
        const droppedDay = slot.querySelector('.dropped-item');
        if (droppedDay) {
            daysInWeek[dayOfWeek] = {
                id: droppedDay.dataset.id,
                name: droppedDay.dataset.name,
                icon: droppedDay.dataset.icon,
                content: JSON.parse(droppedDay.dataset.content)
            };
            isEmptyWeek = false;
        } else {
            daysInWeek[dayOfWeek] = null; 
        }
    });

    if (isEmptyWeek) {
        showMessage('Voeg dagen toe aan de week.', 'error');
        return;
    }

    const weekId = generateUniqueId();
    const newWeek = { id: weekId, name: weekName, days: daysInWeek };

    let savedWeeks = JSON.parse(localStorage.getItem('cardioWeeks') || '[]');
    savedWeeks.push(newWeek);
    localStorage.setItem('cardioWeeks', JSON.stringify(savedWeeks));

    showMessage('Week opgeslagen!', 'success');
    currentWeekNameInput.value = '';
    weekDaySlots.forEach(slot => {
        slot.innerHTML = '<p class="text-gray-400 text-center text-sm">Sleep dag hier</p>';
    });
    loadSavedWeeks();
});

function loadSavedWeeks() {
    savedWeeksList.innerHTML = '';
    const savedWeeks = JSON.parse(localStorage.getItem('cardioWeeks') || '[]');
    if (savedWeeks.length === 0) {
        savedWeeksList.innerHTML = '<p class="text-gray-400 col-span-full">Nog geen weken opgeslagen.</p>';
        return;
    }

    savedWeeks.forEach(week => {
        const weekCard = document.createElement('div');
        weekCard.className = 'drag-item bg-gray-600 p-3 rounded-md shadow flex flex-col cursor-grab';
        weekCard.setAttribute('draggable', 'true');
        weekCard.dataset.type = 'week';
        weekCard.dataset.id = week.id;
        weekCard.dataset.name = week.name;
        weekCard.dataset.icon = 'fas fa-calendar-week'; 
        weekCard.dataset.content = JSON.stringify(week.days); 

        const configuredDays = Object.values(week.days).filter(day => day !== null).map(day => day.name);
        const summaryText = configuredDays.length > 0 ? configuredDays.join(', ') : 'Geen dagen geconfigureerd';

        weekCard.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span><i class="${weekCard.dataset.icon} mr-2 text-purple-300"></i>${week.name}</span>
                <button class="remove-saved-item-btn text-red-400 hover:text-red-300" data-id="${week.id}" data-list="cardioWeeks"><i class="fas fa-times"></i></button>
            </div>
            <div class="text-xs text-gray-300 mt-2">
                ${summaryText}
            </div>
        `;
        savedWeeksList.appendChild(weekCard);
    });
    addRemoveListenersToSavedItems();
}

// Blokken
const currentBlokNameInput = document.getElementById('current-blok-name');
const currentBlokNotesInput = document.getElementById('current-blok-notes');
const blokDropZone = document.getElementById('blok-drop-zone');
const saveBlokBtn = document.getElementById('save-blok-btn');
const savedBloksList = document.getElementById('saved-bloks-list');

saveBlokBtn.addEventListener('click', () => {
    const blokName = currentBlokNameInput.value.trim();
    const blokNotes = currentBlokNotesInput.value.trim();
    if (!blokName) {
        showMessage('Geef het blok een naam.', 'error');
        return;
    }

    const weeksInBlok = [];
    let hasError = false;
    blokDropZone.querySelectorAll('.dropped-item').forEach(item => {
        const repetitionsInput = item.querySelector('[data-repetitions-input]');
        const repetitions = parseInt(repetitionsInput.value);
        if (isNaN(repetitions) || repetitions <= 0) {
            hasError = true;
            showMessage('Vul een geldig aantal herhalingen in voor elke week.', 'error');
            return;
        }

        weeksInBlok.push({
            weekId: item.dataset.id,
            name: item.dataset.name,
            icon: item.dataset.icon,
            content: JSON.parse(item.dataset.content), // Content is here the 'days' of the week
            repetitions: repetitions
        });
    });

    if (hasError) {
        return;
    }

    if (weeksInBlok.length === 0) {
        showMessage('Voeg weken toe aan het blok.', 'error');
        return;
    }

    if (weeksInBlok.length > 53) { // Max 53 weeks in a block
        showMessage('Een blok kan maximaal 53 weken bevatten.', 'error');
        return;
    }

    const blokId = generateUniqueId();
    const newBlok = { 
        id: blokId, 
        name: blokName, 
        weeks: weeksInBlok,
        notes: blokNotes // Opslaan van notities
    }; 

    let savedBloks = JSON.parse(localStorage.getItem('cardioBloks') || '[]');
    savedBloks.push(newBlok);
    localStorage.setItem('cardioBloks', JSON.stringify(savedBloks));

    showMessage('Blok opgeslagen!', 'success');
    currentBlokNameInput.value = '';
    currentBlokNotesInput.value = ''; // Leeg notitieveld na opslaan
    blokDropZone.innerHTML = '<p class="text-gray-400 text-center">Sleep weken hierheen om het blok te configureren.</p>';
    loadSavedBloks();
});

function loadSavedBloks() {
    savedBloksList.innerHTML = '';
    const savedBloks = JSON.parse(localStorage.getItem('cardioBloks') || '[]');
    if (savedBloks.length === 0) {
        savedBloksList.innerHTML = '<p class="text-gray-400 col-span-full">Nog geen blokken opgeslagen.</p>';
        return;
    }

    savedBloks.forEach(blok => {
        const blokCard = document.createElement('div');
        blokCard.className = 'dropped-item flex flex-col p-3 rounded-md bg-gray-700'; 
        blokCard.dataset.id = blok.id;
        blokCard.dataset.name = blok.name;
        blokCard.dataset.type = 'blok'; // Add type for consistency

        const configuredWeeksSummary = blok.weeks.map(week => `${week.name} (${week.repetitions}x)`).join(', ');
        const summaryText = configuredWeeksSummary || 'Geen weken geconfigureerd';
        const notesText = blok.notes ? `<div class="text-xs text-gray-400 mt-1">Notities: ${blok.notes.substring(0, 50)}${blok.notes.length > 50 ? '...' : ''}</div>` : '';


        blokCard.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span><i class="fas fa-layer-group mr-2 text-cyan-300"></i>${blok.name}</span>
                <button class="remove-saved-item-btn" data-id="${blok.id}" data-list="cardioBloks"><i class="fas fa-times"></i></button>
            </div>
            <div class="text-xs text-gray-300 mt-2">
                ${summaryText}
            </div>
            ${notesText}
        `;
        savedBloksList.appendChild(blokCard);
    });
    addRemoveListenersToSavedItems(); // Re-attach listeners for dynamically loaded items
}

// Functie voor het verwijderen van opgeslagen items (algemeen)
function addRemoveListenersToSavedItems() {
    document.querySelectorAll('.remove-saved-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const idToRemove = e.target.closest('button').dataset.id;
            const listName = e.target.closest('button').dataset.list;
            
            let savedItems = JSON.parse(localStorage.getItem(listName) || '[]');
            savedItems = savedItems.filter(item => item.id !== idToRemove);
            localStorage.setItem(listName, JSON.stringify(savedItems));
            
            showMessage('Item verwijderd!', 'info');
            // Herlaad de juiste lijst
            if (listName === 'cardioDays') loadSavedDays();
            if (listName === 'cardioWeeks') loadSavedWeeks();
            if (listName === 'cardioBloks') loadSavedBloks(); 
            if (listName === 'customMeasurements') loadCustomMeasurements(); // Voor aangepaste metingen
        });
    });
}

// Initieel laden van opgeslagen items
loadSavedDays();
loadSavedWeeks();
loadSavedBloks();
loadCustomMeasurements(); // Laad aangepaste metingen bij start

// --- Knoppen om nieuwe drag-items te maken (met kopieeroptie) ---
function createNewItem(type, namePrompt, listName, icon, color) {
    const copyOption = confirm(`Wil je kopiëren van een bestaande ${type}?`);
    let itemName = '';
    let contentToCopy = (type === 'day' || type === 'custom-training-measurement') ? [] : {}; 

    if (copyOption) {
        const itemIdToCopy = prompt(`Voer de ID in van de ${type} die je wilt kopiëren:`);
        if (itemIdToCopy) {
            const savedItems = JSON.parse(localStorage.getItem(`cardio${listName}`) || '[]');
            const itemToCopy = savedItems.find(item => item.id === itemIdToCopy);
            if (itemToCopy) {
                itemName = prompt(`${namePrompt} (kopie van "${itemToCopy.name}"):`);
                if (itemName) {
                    contentToCopy = JSON.parse(JSON.stringify(itemToCopy.activities || itemToCopy.days || itemToCopy.weeks || itemToCopy.customMeasurementDefinition));
                    // Specifieke kopie voor blok notes
                    if (type === 'block' && itemToCopy.notes) {
                        contentToCopy.notes = itemToCopy.notes;
                    }
                }
            } else {
                showMessage(`${type} met opgegeven ID niet gevonden.`, 'error');
                return;
            }
        } else {
            return; 
        }
    } else {
        itemName = prompt(namePrompt);
    }
    
    if (itemName) {
        const itemId = generateUniqueId();
        const newItemElement = document.createElement('div');
        newItemElement.className = 'drag-item';
        newItemElement.setAttribute('draggable', 'true');
        newItemElement.dataset.type = type;
        newItemElement.dataset.id = itemId;
        newItemElement.dataset.name = itemName;
        newItemElement.dataset.icon = icon;
        
        // Specifieke content voor custom measurements
        if (type === 'custom-training-measurement') {
            newItemElement.dataset.customMeasurementType = 'training';
            newItemElement.dataset.customMeasurementDefinition = JSON.stringify(contentToCopy);
            newItemElement.dataset.content = '[]'; // Custom training definition is not 'content' for day
        } else if (type === 'custom-rest-measurement') {
            newItemElement.dataset.customMeasurementType = 'rest';
            newItemElement.dataset.customMeasurementDescription = contentToCopy.customMeasurementDescription || '';
            newItemElement.dataset.customMeasurementGoals = contentToCopy.customMeasurementGoals || '';
            newItemElement.dataset.content = '[]'; // Custom rest definition is not 'content' for day
        } else {
            newItemElement.dataset.content = JSON.stringify(contentToCopy);
        }


        newItemElement.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span><i class="${icon} mr-2 ${color}"></i>${itemName}</span>
                <i class="fas fa-grip-vertical text-gray-400"></i>
            </div>
        `;
        document.getElementById('available-modules').appendChild(newItemElement);
        // Voeg dragstart listener toe aan het nieuwe element
        newItemElement.addEventListener('dragstart', (e) => {
            draggedItemData = {
                type: e.target.dataset.type,
                name: e.target.dataset.name,
                icon: e.target.dataset.icon,
                id: e.target.dataset.id,
                content: e.target.dataset.content ? JSON.parse(e.target.dataset.content) : null,
                zoneColor: e.target.dataset.zoneColor || '',
                duration: e.target.dataset.duration || null,
                progressionEnabled: e.target.dataset.progressionEnabled === 'true',
                progressionValue: e.target.dataset.progressionValue || null,
                customMeasurementType: e.target.dataset.customMeasurementType || null,
                customMeasurementDefinition: e.target.dataset.customMeasurementDefinition ? JSON.parse(e.target.dataset.customMeasurementDefinition) : null,
                customMeasurementDescription: e.target.dataset.customMeasurementDescription || null,
                customMeasurementGoals: e.target.dataset.customMeasurementGoals || null
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(draggedItemData));
            e.dataTransfer.effectAllowed = 'move';
        });
        showMessage(`Nieuwe ${type} '${itemName}' gemaakt!`, 'success');
    }
}

document.getElementById('create-day-btn').addEventListener('click', () => {
    createNewItem('day', 'Naam voor de nieuwe dag:', 'Days', 'fas fa-calendar-day', 'text-blue-300');
});

document.getElementById('create-week-btn').addEventListener('click', () => {
    createNewItem('week', 'Naam voor de nieuwe week:', 'Weeks', 'fas fa-calendar-week', 'text-purple-300');
});

document.getElementById('create-block-btn').addEventListener('click', () => { // Aangepaste ID
    createNewItem('block', 'Naam voor het nieuwe blok:', 'Bloks', 'fas fa-layer-group', 'text-cyan-300');
});

// Genereer tijdlabels voor de dagweergave
function generateTimeLabels() {
    const timeLabelsContainer = document.getElementById('day-time-labels');
    timeLabelsContainer.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        // Hele uren
        let label = document.createElement('div');
        label.className = 'time-slot-label';
        label.textContent = `${String(h).padStart(2, '0')}:00`;
        timeLabelsContainer.appendChild(label);
        // Halve uren
        label = document.createElement('div');
        label.className = 'time-slot-label';
        label.textContent = `${String(h).padStart(2, '0')}:30`;
        timeLabelsContainer.appendChild(label);
    }
}

// Roep generateTimeLabels aan bij het laden van de pagina
document.addEventListener('DOMContentLoaded', generateTimeLabels);


// --- Form Builder Logica ---
const customTrainingZonesDropZone = document.getElementById('custom-training-zones-drop-zone');
const saveCustomTrainingBtn = document.getElementById('save-custom-training-btn');
const customTrainingNameInput = document.getElementById('custom-training-name');

const saveCustomRestBtn = document.getElementById('save-custom-rest-btn');
const customRestNameInput = document.getElementById('custom-rest-name');
const customRestDescriptionInput = document.getElementById('custom-rest-description');
const customRestGoalsInput = document.getElementById('custom-rest-goals');

const customMeasurementsList = document.getElementById('custom-measurements-list');

// Opslaan Aangepaste Training Meting
saveCustomTrainingBtn.addEventListener('click', () => {
    const trainingName = customTrainingNameInput.value.trim();
    if (!trainingName) {
        showMessage('Geef de aangepaste training een naam.', 'error');
        return;
    }

    const definition = [];
    let hasError = false;
    customTrainingZonesDropZone.querySelectorAll('.dropped-item').forEach(item => {
        const durationInput = item.querySelector('[data-duration-input]');
        const duration = parseInt(durationInput.value);
        if (isNaN(duration) || duration <= 0) {
            hasError = true;
            showMessage('Vul een geldige duur (in minuten) in voor alle HR zones in de training.', 'error');
            return;
        }
        definition.push({
            type: item.dataset.type,
            name: item.dataset.name,
            icon: item.querySelector('i').className,
            zoneColor: item.dataset.zoneColor || '',
            duration: duration
        });
    });

    if (hasError) {
        return;
    }
    if (definition.length === 0) {
        showMessage('Voeg HR zones toe aan de aangepaste training.', 'error');
        return;
    }

    const customId = generateUniqueId();
    const newCustomTraining = {
        id: customId,
        name: trainingName,
        type: 'custom-training-measurement',
        icon: 'fas fa-dumbbell', // Algemeen icoon voor training
        zoneColor: 'text-yellow-500', // Kleur voor aangepaste training
        customMeasurementType: 'training',
        customMeasurementDefinition: definition
    };

    let savedCustomMeasurements = JSON.parse(localStorage.getItem('customMeasurements') || '[]');
    savedCustomMeasurements.push(newCustomTraining);
    localStorage.setItem('customMeasurements', JSON.stringify(savedCustomMeasurements));

    showMessage('Aangepaste training opgeslagen!', 'success');
    customTrainingNameInput.value = '';
    customTrainingZonesDropZone.innerHTML = '<p class="text-gray-400 text-center text-sm">Sleep HR zones hierheen om de training te definiëren.</p>';
    loadCustomMeasurements();
});

// Opslaan Aangepaste Rust Meting
saveCustomRestBtn.addEventListener('click', () => {
    const restName = customRestNameInput.value.trim();
    const restDescription = customRestDescriptionInput.value.trim();
    const restGoals = customRestGoalsInput.value.trim();

    if (!restName) {
        showMessage('Geef de aangepaste rustmeting een naam.', 'error');
        return;
    }

    const customId = generateUniqueId();
    const newCustomRest = {
        id: customId,
        name: restName,
        type: 'custom-rest-measurement',
        icon: 'fas fa-moon', // Algemeen icoon voor rust
        zoneColor: 'text-blue-500', // Kleur voor aangepaste rust
        customMeasurementType: 'rest',
        customMeasurementDescription: restDescription,
        customMeasurementGoals: restGoals
    };

    let savedCustomMeasurements = JSON.parse(localStorage.getItem('customMeasurements') || '[]');
    savedCustomMeasurements.push(newCustomRest);
    localStorage.setItem('customMeasurements', JSON.stringify(savedCustomMeasurements));

    showMessage('Aangepaste rustmeting opgeslagen!', 'success');
    customRestNameInput.value = '';
    customRestDescriptionInput.value = '';
    customRestGoalsInput.value = '';
    loadCustomMeasurements();
});

// Laden Aangepaste Metingen naar zijbalk
function loadCustomMeasurements() {
    // Verwijder alleen de dynamisch toegevoegde aangepaste metingen, niet de hardgecodeerde HR-zones etc.
    document.querySelectorAll('#available-modules .drag-item[data-type^="custom-"]').forEach(item => item.remove());

    const savedCustomMeasurements = JSON.parse(localStorage.getItem('customMeasurements') || '[]');

    if (savedCustomMeasurements.length === 0) {
        customMeasurementsList.innerHTML = '<p class="text-gray-400 text-sm">Geen aangepaste metingen.</p>';
        return;
    } else {
        customMeasurementsList.innerHTML = ''; // Clear placeholder if items exist
    }

    savedCustomMeasurements.forEach(measurement => {
        const measurementItem = document.createElement('div');
        measurementItem.className = 'drag-item';
        measurementItem.setAttribute('draggable', 'true');
        measurementItem.dataset.type = measurement.type; // 'custom-training-measurement' of 'custom-rest-measurement'
        measurementItem.dataset.name = measurement.name;
        measurementItem.dataset.icon = measurement.icon;
        measurementItem.dataset.id = measurement.id;
        measurementItem.dataset.zoneColor = measurement.zoneColor || '';

        if (measurement.customMeasurementType === 'training') {
            measurementItem.dataset.customMeasurementType = 'training';
            measurementItem.dataset.customMeasurementDefinition = JSON.stringify(measurement.customMeasurementDefinition);
        } else if (measurement.customMeasurementType === 'rest') {
            measurementItem.dataset.customMeasurementType = 'rest';
            measurementItem.dataset.customMeasurementDescription = measurement.customMeasurementDescription;
            measurementItem.dataset.customMeasurementGoals = measurement.customMeasurementGoals;
        }

        measurementItem.innerHTML = `
            <span><i class="${measurement.icon} mr-2 ${measurement.zoneColor || ''}"></i>${measurement.name}</span>
            <button class="remove-saved-item-btn text-red-400 hover:text-red-300" data-id="${measurement.id}" data-list="customMeasurements"><i class="fas fa-times"></i></button>
        `;
        document.getElementById('available-modules').appendChild(measurementItem);
        
        // Voeg dragstart listener toe aan het nieuwe element
        measurementItem.addEventListener('dragstart', (e) => {
            draggedItemData = {
                type: e.target.dataset.type,
                name: e.target.dataset.name,
                icon: e.target.dataset.icon,
                id: e.target.dataset.id,
                content: e.target.dataset.content ? JSON.parse(e.target.dataset.content) : null,
                zoneColor: e.target.dataset.zoneColor || '',
                duration: e.target.dataset.duration || null,
                progressionEnabled: e.target.dataset.progressionEnabled === 'true',
                progressionValue: e.target.dataset.progressionValue || null,
                customMeasurementType: e.target.dataset.customMeasurementType || null,
                customMeasurementDefinition: e.target.dataset.customMeasurementDefinition ? JSON.parse(e.target.dataset.customMeasurementDefinition) : null,
                customMeasurementDescription: e.target.dataset.customMeasurementDescription || null,
                customMeasurementGoals: e.target.dataset.customMeasurementGoals || null
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(draggedItemData));
            e.dataTransfer.effectAllowed = 'move';
        });
    });
}

// Settings button click handler
document.getElementById('settings-btn').addEventListener('click', () => {
    showMessage('Globale instellingen functionaliteit komt hier (nog niet geïmplementeerd).', 'info');
});

// Categorie selectie logica
const categorySelect = document.getElementById('category-select');
const categoryContents = document.querySelectorAll('.category-content');

categorySelect.addEventListener('change', (e) => {
    const selectedCategory = e.target.value;
    categoryContents.forEach(contentDiv => {
        if (contentDiv.id === `category-${selectedCategory}`) {
            contentDiv.classList.add('active');
        } else {
            contentDiv.classList.remove('active');
        }
    });
});

// Initialiseer met de standaard geselecteerde categorie
document.addEventListener('DOMContentLoaded', () => {
    // Activeer de Form Builder tab bij het laden
    document.querySelector('.tab-button[data-tab="form-builder"]').click();

    const initialCategory = categorySelect.value;
    categoryContents.forEach(contentDiv => {
        if (contentDiv.id === `category-${initialCategory}`) {
            contentDiv.classList.add('active');
        } else {
            contentDiv.classList.remove('active');
        }
    });
});

}