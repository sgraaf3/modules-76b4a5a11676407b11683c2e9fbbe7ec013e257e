// Bestand: js/views/reportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses.

import { getAllData } from '../database.js';
import { showNotification } from './notifications.js';

import { initIndividualHrChart, initIndividualHrvChart, initBreathRateChart } from './reports/regularReports.js';
import { initSleepTrendChart, initSportActivitiesTrendChart } from './reports/afterReports.js';

export async function initTrainingReportsView() {
    console.log("Training Rapporten View geïnitialiseerd.");

    const sessionReportsList = document.getElementById('sessionReportsList');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    
    // Functie om sessierapporten te laden en weer te geven
    async function loadSessionReports() {
        const trainingSessions = await getAllData('trainingSessions');
        sessionReportsList.innerHTML = '';

        if (trainingSessions.length === 0) {
            sessionReportsList.innerHTML = '<p class="text-gray-400">Geen sessierapporten gevonden.</p>';
            return;
        }

        trainingSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        trainingSessions.forEach(session => {
            const rmssdValue = (typeof session.rmssd === 'number' && !isNaN(session.rmssd)) ? session.rmssd.toFixed(2) : '--';
            const reportCard = document.createElement('div');
            reportCard.className = 'data-card';
            reportCard.innerHTML = `
                <div class="card-header"><h3>Sessie van ${session.date || 'Onbekend'}</h3></div>
                <div class="sub-value">Duur: ${session.duration || '--'} min, Gem. HR: ${session.avgHr || '--'} BPM</div>
                <div class="sub-value">RMSSD: ${rmssdValue} MS</div>
                <div class="flex justify-end mt-2">
                    <button class="text-blue-400 hover:text-blue-300 text-sm" data-action="view-detailed-report" data-id="${session.id}">Bekijk Rapport</button>
                </div>
            `;
            sessionReportsList.appendChild(reportCard);
        });

        sessionReportsList.querySelectorAll('[data-action="view-detailed-report"]').forEach(button => {
            button.addEventListener('click', (event) => {
                const sessionId = parseInt(event.target.dataset.id);
                showNotification(`Gedetailleerd rapport voor sessie ${sessionId} bekijken (functionaliteit nog te implementeren).`, 'info');
            });
        });
    }

    // Roep alle laadfuncties aan bij initialisatie
    await loadSessionReports();
    await initIndividualHrChart();
    await initIndividualHrvChart();
    await initBreathRateChart();
    await initSleepTrendChart(); // Ensure sleep data is processed
    await initSportActivitiesTrendChart(); // Ensure sport activities data is processed
}