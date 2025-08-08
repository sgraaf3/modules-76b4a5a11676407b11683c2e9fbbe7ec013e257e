// Bestand: js/views/popularityView.js
// Bevat logica voor het analyseren van populariteit van aanbod.

import { getAllData } from '../database.js';
import { showNotification } from './notifications.js';

let lessonPopularityChartInstance;
let programPopularityChartInstance;

export async function initPopularityView() {
    console.log("Populariteitssegmentatie View geïnitialiseerd.");

    const mostPopularLessonDisplay = document.getElementById('mostPopularLesson');
    const mostPopularProgramDisplay = document.getElementById('mostPopularProgram');
    const averageOccupancyDisplay = document.getElementById('averageOccupancy');
    const lessonPopularityChartCtx = document.getElementById('lessonPopularityChart')?.getContext('2d');
    const programPopularityChartCtx = document.getElementById('programPopularityChart')?.getContext('2d');
    const occupancyList = document.getElementById('occupancyList');

    async function loadPopularityData() {
        try {
            const lessons = await getAllData('lessons'); // Assuming 'lessons' store contains lesson data including bookings
            const assignedPrograms = await getAllData('assignedNutritionPrograms'); // Assuming this tracks program assignments

            // --- Les Populariteit ---
            const lessonBookings = {}; // { lessonId: count }
            const lessonNames = {}; // { lessonId: name }
            lessons.forEach(lesson => {
                lessonNames[lesson.id] = lesson.name;
                lessonBookings[lesson.id] = (lessonBookings[lesson.id] || 0) + (lesson.bookedBy ? 1 : 0); // Simple count for now
            });

            let mostPopularLesson = 'N/A';
            let maxBookings = 0;
            for (const id in lessonBookings) {
                if (lessonBookings[id] > maxBookings) {
                    maxBookings = lessonBookings[id];
                    mostPopularLesson = lessonNames[id];
                }
            }
            if (mostPopularLessonDisplay) mostPopularLessonDisplay.textContent = mostPopularLesson;

            // Render Lesson Popularity Chart
            if (lessonPopularityChartCtx) {
                if (lessonPopularityChartInstance) lessonPopularityChartInstance.destroy();
                const chartLabels = Object.values(lessonNames);
                const chartData = Object.values(lessonBookings);

                lessonPopularityChartInstance = new Chart(lessonPopularityChartCtx, {
                    type: 'bar',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Aantal Boekingen',
                            data: chartData,
                            backgroundColor: '#60a5fa',
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Boekingen' } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }

            // --- Programma Populariteit ---
            const programAssignments = {}; // { programId: count }
            const programNames = {}; // { programId: name }
            const nutritionPrograms = await getAllData('nutritionPrograms');
            nutritionPrograms.forEach(program => {
                programNames[program.id] = program.name;
            });

            assignedPrograms.forEach(assignment => {
                programAssignments[assignment.programId] = (programAssignments[assignment.programId] || 0) + 1;
            });

            let mostPopularProgram = 'N/A';
            let maxAssignments = 0;
            for (const id in programAssignments) {
                if (programAssignments[id] > maxAssignments) {
                    maxAssignments = programAssignments[id];
                    mostPopularProgram = programNames[id];
                }
            }
            if (mostPopularProgramDisplay) mostPopularProgramDisplay.textContent = mostPopularProgram;

            // Render Program Popularity Chart
            if (programPopularityChartCtx) {
                if (programPopularityChartInstance) programPopularityChartInstance.destroy();
                const chartLabels = Object.values(programNames);
                const chartData = Object.keys(programNames).map(id => programAssignments[id] || 0);

                programPopularityChartInstance = new Chart(programPopularityChartCtx, {
                    type: 'bar',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Aantal Toewijzingen',
                            data: chartData,
                            backgroundColor: '#4ade80',
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Toewijzingen' } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }

            // --- Bezettingsgraad per Les ---
            occupancyList.innerHTML = '';
            let totalOccupancyPercentage = 0;
            let lessonsWithCapacity = 0;

            if (lessons.length === 0) {
                occupancyList.innerHTML = '<p class="text-gray-400">Geen lesdata gevonden voor bezettingsgraad.</p>';
            } else {
                lessons.forEach(lesson => {
                    const currentBookings = lesson.bookedBy ? 1 : 0; // Assuming bookedBy indicates one booking
                    const capacity = lesson.capacity || 1; // Default capacity to 1 to avoid division by zero
                    const occupancyPercentage = (currentBookings / capacity) * 100;

                    if (capacity > 0) {
                        totalOccupancyPercentage += occupancyPercentage;
                        lessonsWithCapacity++;
                    }

                    const occupancyCard = document.createElement('div');
                    occupancyCard.className = 'data-card';
                    occupancyCard.innerHTML = `
                        <div class="card-header"><h3>${lesson.name}</h3></div>
                        <div class="sub-value">Boekingen: ${currentBookings} / ${capacity}</div>
                        <div class="main-value">${occupancyPercentage.toFixed(1)}%</div>
                    `;
                    occupancyList.appendChild(occupancyCard);
                });
            }

            const overallAverageOccupancy = lessonsWithCapacity > 0 ? (totalOccupancyPercentage / lessonsWithCapacity) : 0;
            if (averageOccupancyDisplay) averageOccupancyDisplay.textContent = `${overallAverageOccupancy.toFixed(1)}%`;

        } catch (error) {
            console.error("Fout bij laden populariteitsdata:", error);
            showNotification("Fout bij laden populariteitsdata.", "error");
        }
    }

    await loadPopularityData();
}