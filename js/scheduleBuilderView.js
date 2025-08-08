// Bestand: scheduleBuilderView.js
import { setupDragAndDrop } from './dragAndDropManager.js';
import { setupSaveButtons } from './scheduleDataManager.js';
import { setupFormBuilder, loadCustomMeasurements } from './formBuilder.js';
import { setupTabNavigation, generateTimeLabels, loadSavedDays, loadSavedWeeks, loadSavedBloks } from './viewRenderer.js';

export function initScheduleBuilderView() {
    console.log("Schedule Builder View geïnitialiseerd.");

    const dayDropZone = document.getElementById('day-drop-zone');
    const customTrainingZonesDropZone = document.getElementById('custom-training-zones-drop-zone');
    const weekDaySlots = document.querySelectorAll('.day-slot');
    const blokDropZone = document.getElementById('blok-drop-zone');

    // Setup alle modules
    setupDragAndDrop(dayDropZone, customTrainingZonesDropZone, weekDaySlots, blokDropZone);
    setupSaveButtons();
    setupFormBuilder();
    setupTabNavigation();

    // Initieel laden van de UI
    generateTimeLabels();
    loadSavedDays();
    loadSavedWeeks();
    loadSavedBloks();
    loadCustomMeasurements();

    document.getElementById('category-select').addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        document.querySelectorAll('.category-content').forEach(contentDiv => {
            if (contentDiv.id === `category-${selectedCategory}`) {
                contentDiv.classList.add('active');
            } else {
                contentDiv.classList.remove('active');
            }
        });
    });

    document.querySelector('.tab-button[data-tab="form-builder"]').click();
}