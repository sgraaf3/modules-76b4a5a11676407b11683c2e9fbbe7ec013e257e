// Bestand: js/views/reportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses.

import { getAllData } from '../database.js';

let performanceTrendChart;
let hrvRecoveryTrendChart;

export async function initReportsView() {
    console.log("Rapporten & Voortgang View geïnitialiseerd.");

    const sessionReportsList = document.getElementById('sessionReportsList');
    const avgTrainingDurationDisplay = document.getElementById('avgTrainingDuration');
    const avgRestHrDisplay = document.getElementById('avgRestHr');
    const totalCaloriesBurnedDisplay = document.getElementById('totalCaloriesBurned');
    const performanceTrendChartCtx = document.getElementById('performanceTrendChart')?.getContext('2d');
    const hrvRecoveryTrendChartCtx = document.getElementById('hrvRecoveryTrendChart')?.getContext('2d');

    // Functie om sessierapporten te laden en weer te geven
    async function loadSessionReports() {
        const trainingSessions = await getAllData('trainingSessions'); // Aanname: 'trainingSessions' store bestaat
        sessionReportsList.innerHTML = '';

        if (trainingSessions.length === 0) {
            sessionReportsList.innerHTML = '<p class="text-gray-400">Geen sessierapporten gevonden.</p>';
            return;
        }

        trainingSessions.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sorteer op datum

        trainingSessions.forEach(session => {
            const reportCard = document.createElement('div');
            reportCard.className = 'data-card';
            reportCard.innerHTML = `
                <div class="card-header"><h3>Sessie van ${session.date || 'Onbekend'}</h3></div>
                <div class="sub-value">Duur: ${session.duration || '--'} min, Gem. HR: ${session.avgHr || '--'} BPM</div>
                <div class="flex justify-end mt-2">
                    <button class="text-blue-400 hover:text-blue-300 text-sm" data-action="view-detailed-report" data-id="${session.id}">Bekijk Rapport</button>
                </div>
            `;
            sessionReportsList.appendChild(reportCard);
        });

        // Event listener voor 'Bekijk Rapport' knoppen
        sessionReportsList.querySelectorAll('[data-action="view-detailed-report"]').forEach(button => {
            button.addEventListener('click', (event) => {
                const sessionId = parseInt(event.target.dataset.id);
                alert(`Gedetailleerd rapport voor sessie ${sessionId} bekijken (functionaliteit nog te implementeren).`);
                // Hier zou je logica kunnen toevoegen om een modale weergave te openen
                // met de details van de geselecteerde trainingssessie.
            });
        });
    }

    // Functie om algemene prestatieoverzichten te berekenen en weer te geven
    async function loadPerformanceOverview() {
        const trainingSessions = await getAllData('trainingSessions'); // Haal alle trainingssessies op
        const userProfiles = await getAllData('userProfile'); // Haal alle gebruikersprofielen op

        // Gemiddelde Training Duur
        const totalDuration = trainingSessions.reduce((sum, session) => sum + (parseFloat(session.duration) || 0), 0);
        const avgDuration = trainingSessions.length > 0 ? (totalDuration / trainingSessions.length).toFixed(0) : '--';
        if (avgTrainingDurationDisplay) avgTrainingDurationDisplay.textContent = `${avgDuration} min`;

        // Gemiddelde Rust HR (van gebruikersprofielen)
        const totalRestHr = userProfiles.reduce((sum, profile) => sum + (parseFloat(profile.userRestHR) || 0), 0);
        const avgRestHr = userProfiles.length > 0 ? (totalRestHr / userProfiles.length).toFixed(0) : '--';
        if (avgRestHrDisplay) avgRestHrDisplay.textContent = `${avgRestHr} BPM`;

        // Totale Calorieën Verbrand (placeholder, vereist calorieberekening per sessie)
        // Voor nu, een simpele som van een placeholder veld of een vaste waarde
        const totalCalories = trainingSessions.reduce((sum, session) => sum + (parseFloat(session.caloriesBurned || 0)), 0); // Aanname: 'caloriesBurned' veld
        if (totalCaloriesBurnedDisplay) totalCaloriesBurnedDisplay.textContent = `${totalCalories.toFixed(0)} kcal`;
    }

    // Functie om de prestatie trendgrafiek te initialiseren/updaten
    function initPerformanceTrendChart() {
        if (performanceTrendChart) {
            performanceTrendChart.destroy(); // Vernietig bestaande grafiek instantie
        }
        if (performanceTrendChartCtx) {
            performanceTrendChart = new Chart(performanceTrendChartCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                        label: 'Gemiddelde Prestatie Score',
                        data: [70, 72, 75, 73, 78, 80, 82],
                        borderColor: '#60a5fa',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // Functie om de HRV herstel trendgrafiek te initialiseren/updaten
    function initHrvRecoveryTrendChart() {
        if (hrvRecoveryTrendChart) {
            hrvRecoveryTrendChart.destroy(); // Vernietig bestaande grafiek instantie
        }
        if (hrvRecoveryTrendChartCtx) {
            hrvRecoveryTrendChart = new Chart(hrvRecoveryTrendChartCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                    datasets: [{
                        label: 'Gemiddelde RMSSD (HRV)',
                        data: [40, 42, 38, 45, 41, 48],
                        borderColor: '#4ade80',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // Roep alle laad- en initialisatiefuncties aan
    await loadSessionReports();
    await loadPerformanceOverview();
    initPerformanceTrendChart();
    initHrvRecoveryTrendChart();
}
