// Bestand: js/trainingReportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses voor individuele trainingssessies.

import { getAllData, getData } from '../database.js';
import { showNotification } from './notifications.js';
import { Bodystandard, VO2, RuntimesVo2, HRVAnalyzer } from '../rr_hr_hrv_engine.js'; // BELANGRIJK: HRVAnalyzer toegevoegd

import { initIndividualHrChart, initIndividualHrvChart, initBreathRateChart } from './reports/regularReports.js';
import { initSleepTrendChart, initSportActivitiesTrendChart } from './reports/afterReports.js';

// Globale variabelen om Chart.js instanties bij te houden
let sessionHrRrChart;
let sessionHrvChart;
let sessionBreathChart;
// OPMERKING: De andere trendgrafiek variabelen (performanceTrendChart, hrvRecoveryTrendChart, etc.)
// zijn niet nodig in dit bestand, aangezien dit bestand zich richt op individuele sessierapporten.
// Ze zijn relevanter voor de dashboardReportsView.

// Helper function to format time from seconds to MM:SS
function formatTime(seconds) {
    if (isNaN(seconds)) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Helper function to determine HR Zone (copied from restMeasurementLiveView_2.js for consistency)
function getHrvBasedRestZone(rmssd) {
    if (rmssd >= 70) return 'Relaxed';
    if (rmssd >= 50) return 'Rest';
    if (rmssd >= 30) return 'Active Low';
    if (rmssd >= 10) return 'Active High';
    return 'Transition to sportzones';
}

function getHrZone(currentHR, at, rmssd) {
    const warmupHrThreshold = at * 0.65;
    if (currentHR >= at * 1.06) return 'Intensive 2';
    if (currentHR >= at * 1.01) return 'Intensive 1';
    if (currentHR >= at) return 'AT';
    if (currentHR >= at * 0.90) return 'Endurance 3';
    if (currentHR >= at * 0.80) return 'Endurance 2';
    if (currentHR >= at * 0.70) return 'Endurance 1';
    if (currentHR >= warmupHrThreshold + 5) return 'Cooldown';
    if (currentHR >= warmupHrThreshold) return 'Warmup';
    // If below warmup threshold, use HRV-based zones
    return getHrvBasedRestZone(rmssd);
}


// Functie om een gedetailleerd rapport te genereren en weer te geven
async function loadTrainingSessionReports(session) {
    const detailedReportContainer = document.getElementById('detailedReportContainer');
    if (!detailedReportContainer) {
        console.error("Detailed report container not found.");
        showNotification("Fout: Rapport container niet gevonden.", "error");
        return;
    }

    // Haal gebruikersprofiel op voor context
    const userId = session.userId; // De userId moet in de sessie data zitten
    const userProfile = await getData('userProfile', userId);
    const userBaseAtHR = userProfile ? parseFloat(userProfile.userBaseAtHR) : 0;
    const userMaxHR = userProfile ? parseFloat(userProfile.userMaxHR) : 0;
    const userRestHR = userProfile ? parseFloat(userProfile.userRestHR) : 0;

    // Berekeningen voor uitleg
    const avgHr = parseFloat(session.avgHr) || 0;
    const rmssd = parseFloat(session.rmssd) || 0;
    const sdnn = parseFloat(session.sdnn) || 0;
    const avgBreathRate = parseFloat(session.avgBreathRate) || 0;
    const pnn50 = parseFloat(session.pnn50) || 0; // Deze moet in de sessie opgeslagen zijn
    const lfPower = parseFloat(session.lfPower) || 0; // Deze moet in de sessie opgeslagen zijn
    const hfPower = parseFloat(session.hfPower) || 0; // Deze moet in de sessie opgeslagen zijn
    const vlfPower = parseFloat(session.vlfPower) || 0; // Deze moet in de sessie opgeslagen zijn
    const lfHfRatio = (hfPower > 0) ? (lfPower / hfPower).toFixed(2) : '--';

    // OPMERKING: Als pnn50, lfPower, hfPower, vlfPower niet direct in de session data zitten,
    // moeten we HRVAnalyzer hier opnieuw uitvoeren op session.rawRrData
    let hrvAnalyzerForReport = null;
    if (session.rawRrData && session.rawRrData.length >= 30) {
        hrvAnalyzerForReport = new HRVAnalyzer(session.rawRrData);
        // Overwrite met meer accurate waarden van de HRVAnalyzer
        rmssd = hrvAnalyzerForReport.rmssd;
        sdnn = hrvAnalyzerForReport.sdnn;
        pnn50 = hrvAnalyzerForReport.pnn50;
        lfPower = hrvAnalyzerForReport.frequency.lfPower;
        hfPower = hrvAnalyzerForReport.frequency.hfPower;
        vlfPower = hrvAnalyzerForReport.frequency.vlfPower;
        lfHfRatio = hrvAnalyzerForReport.frequency.lfHfRatio;
    }


    // Interpretatie teksten
    let hrInterpretation = `Je gemiddelde hartslag tijdens deze sessie was ${avgHr} BPM.`;
    if (userBaseAtHR > 0) {
        const hrPercentageOfAt = (avgHr / userBaseAtHR) * 100;
        hrInterpretation += ` Dit komt overeen met ${hrPercentageOfAt.toFixed(0)}% van je Anaerobe Drempel.`;
        if (hrPercentageOfAt > 95) hrInterpretation += ` Dit duidt op een zeer intensieve inspanning, ideaal voor het verbeteren van je maximale prestaties. Zorg voor voldoende herstel.`;
        else if (hrPercentageOfAt > 80) hrInterpretation += ` Dit was een intensieve training, goed voor het verhogen van je uithoudingsvermogen.`;
        else if (hrPercentageOfAt > 65) hrInterpretation += ` Dit was een training met matige intensiteit, perfect voor het opbouwen van je aerobe basis.`;
        else hrInterpretation += ` Dit was een lichte inspanning, geschikt voor warming-up, cooling-down of actief herstel.`;
    } else {
        hrInterpretation += ` Voer je Anaerobe Drempel (AT) in je profiel in voor een gepersonaliseerde interpretatie.`;
    }

    let hrvInterpretation = `Je RMSSD was ${rmssd.toFixed(2)} MS en je SDNN was ${sdnn.toFixed(2)} MS.`;
    if (rmssd >= 50) hrvInterpretation += ` Deze waarden duiden op uitstekend herstel en een gebalanceerd zenuwstelsel. Je bent waarschijnlijk goed uitgerust en klaar voor inspanning.`;
    else if (rmssd >= 25) hrvInterpretation += ` Deze waarden suggereren goed herstel. Je lichaam reageert goed op stress en training.`;
    else if (rmssd >= 10) hrvInterpretation += ` Deze waarden wijzen op redelijk herstel. Mogelijk ervaar je enige vermoeidheid of stress. Overweeg extra rust.`;
    else hrvInterpretation += ` Deze lage waarden kunnen duiden op aanzienlijke vermoeidheid, stress of ziekte. Volledige rust of overleg met een professional kan nodig zijn.`;

    let breathInterpretation = `Je gemiddelde ademhalingsfrequentie was ${avgBreathRate.toFixed(1)} BPM.`;
    if (avgBreathRate >= 8 && avgBreathRate <= 12) breathInterpretation += ` Dit is een optimale frequentie, wat duidt op efficiënte ademhaling en ontspanning.`;
    else if ((avgBreathRate >= 6 && avgBreathRate < 8) || (avgBreathRate > 12 && avgBreathRate <= 15)) breathInterpretation += ` Deze frequentie is acceptabel, maar er is ruimte voor verbetering in ademhalingsefficiëntie.`;
    else breathInterpretation += ` Deze frequentie is buiten het aanbevolen bereik. Dit kan duiden op stress, angst of onvoldoende ademhalingstechniek.`;

    let intensityInterpretation = `Je RPE (Rate of Perceived Exertion) was ${session.rpe || '--'}.`;
    if (userMaxHR > 0 && avgHr > 0) {
        const hrToMaxHr = (avgHr / userMaxHR) * 100;
        intensityInterpretation += ` Dit komt overeen met ${hrToMaxHr.toFixed(0)}% van je maximale hartslag.`;
        if (hrToMaxHr > 90) intensityInterpretation += ` Dit was een maximale inspanning.`;
        else if (hrToMaxHr > 75) intensityInterpretation += ` Dit was een zware training.`;
        else if (hrToMaxHr > 60) intensityInterpretation += ` Dit was een matige training.`;
    } else {
        intensityInterpretation += ` Voer je maximale hartslag in je profiel in voor een nauwkeurigere intensiteitsanalyse.`;
    }

    let poincareExplanation = `De Poincaré Plot visualiseert de variabiliteit tussen opeenvolgende RR-intervallen. Een meer verspreide, komeetachtige vorm duidt op hogere HRV en beter herstel. Een smallere, meer geconcentreerde plot kan wijzen op verminderde variabiliteit.`;
    let frequencyExplanation = `De frequentie-analyse splitst HRV op in verschillende componenten: VLF (zeer lage frequentie), LF (lage frequentie) en HF (hoge frequentie). HF is gerelateerd aan parasympathische activiteit (rust en vertering), LF aan zowel sympathische als parasympathische activiteit, en VLF aan langetermijnregulatie. Een hogere HF-component en een lagere LF/HF-ratio duiden vaak op een betere herstelstatus.`;

    // Biometrische en VO2 Max data en interpretatie
    let biometricsDataHtml = `
        <div>Gewicht: <span class="font-semibold">${userProfile.userWeight || '--'}</span> kg</div>
        <div>Vetpercentage: <span class="font-semibold">${userProfile.userFatPercentage || '--'}</span> %</div>
        <div>Spiermassa: <span class="font-semibold">${userProfile.userMuscleMass || '--'}</span> kg</div>
        <div>BMI: <span class="font-semibold">${userProfile.userWeight && userProfile.userHeight ? (userProfile.userWeight / Math.pow(userProfile.userHeight / 100, 2)).toFixed(1) : '--'}</span></div>
    `;
    let biometricsInterpretation = `Je biometrische gegevens tonen de samenstelling van je lichaam. Regelmatige metingen helpen je om veranderingen in gewicht, vet- en spiermassa te volgen en je doelen bij te stellen.`;

    let vo2MaxDataHtml = `
        <div>Vo2 Max: <span class="font-semibold">${userProfile.userVO2Max || '--'}</span></div>
        <div>3k: <span class="font-semibold">--</span></div>
        <div>5k: <span class="font-semibold">--</span></div>
        <div>10k: <span class="font-semibold">--</span></div>
    `;
    let vo2Interpretation = `VO2 Max is de maximale hoeveelheid zuurstof die je lichaam kan opnemen. Dit is een sterke indicator van je cardiovasculaire fitheid. Een hogere score duidt op een betere conditie.`;


    // Clear and show the detailed report container
    detailedReportContainer.innerHTML = '';
    detailedReportContainer.style.display = 'block';

    // Build the detailed report HTML
    detailedReportContainer.innerHTML = `
        <div class="report-header text-center mb-8">
            <h1 class="text-4xl font-extrabold text-white mb-2">Sessie Rapport</h1>
            <p class="text-xl text-gray-300">Overzicht van je trainingssessie van ${session.date || 'Onbekend'}.</p>
        </div>

        <div class="report-section mb-8">
            <h2 class="text-2xl font-bold text-gray-100 border-b-2 border-purple-500 pb-3 mb-6">Sessie Overzicht</h2>
            <div class="report-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                    <div class="card-header mb-2"><h3>Gemiddelde Hartslag</h3></div>
                    <div class="main-value text-white">${avgHr.toFixed(0)} BPM</div>
                </div>
                <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                    <div class="card-header mb-2"><h3>RMSSD (Herstel)</h3></div>
                    <div class="main-value text-white">${rmssd.toFixed(2)} MS</div>
                </div>
                <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                    <div class="card-header mb-2"><h3>Duur</h3></div>
                    <div class="main-value text-white">${session.duration || '--'} min</div>
                </div>
            </div>
        </div>

        <div class="report-section mb-8">
            <h2 class="text-2xl font-bold text-gray-100 border-b-2 border-purple-500 pb-3 mb-6">HR & RR Grafiek</h2>
            <div class="report-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="chart-container-full bg-gray-700 rounded-lg p-4 shadow-md" style="height: 300px;">
                        <canvas id="sessionHrRrChart"></canvas>
                    </div>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>HR Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed" id="hrInterpretation">${hrInterpretation}</div>
                    </div>
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>Intensiteit Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed" id="intensityInterpretation">${intensityInterpretation}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-section mb-8">
            <h2 class="text-2xl font-bold text-gray-100 border-b-2 border-purple-500 pb-3 mb-6">HRV & Ademhaling</h2>
            <div class="report-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="chart-container-full bg-gray-700 rounded-lg p-4 shadow-md" style="height: 300px;">
                        <canvas id="sessionHrvChart"></canvas>
                    </div>
                    <div class="chart-container-full bg-gray-700 rounded-lg p-4 shadow-md mt-6" style="height: 300px;">
                        <canvas id="sessionBreathChart"></canvas>
                    </div>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>HRV Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed" id="hrvInterpretation">${hrvInterpretation}</div>
                    </div>
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>Ademhaling Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed" id="breathInterpretation">${breathInterpretation}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="report-section mb-8">
            <h2 class="text-2xl font-bold text-gray-100 border-b-2 border-purple-500 pb-3 mb-6">Lichaamssamenstelling & VO2 Max</h2>
            <div class="report-content-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>Biometrische Data</h3></div>
                        <div class="grid grid-cols-2 gap-4 text-base text-gray-300">
                            ${biometricsDataHtml}
                        </div>
                    </div>
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md mt-6">
                        <div class="card-header mb-2"><h3>Vo2 Max & Geschatte Hardlooptijden</h3></div>
                        <div class="grid grid-cols-2 gap-4 text-base text-gray-300">
                            ${vo2MaxDataHtml}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col gap-6">
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>Biometrie Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed">${biometricsInterpretation}</div>
                    </div>
                    <div class="data-card bg-gray-700 rounded-lg p-4 shadow-md">
                        <div class="card-header mb-2"><h3>Vo2 Max Interpretatie</h3></div>
                        <div class="sub-value text-gray-300 text-base leading-relaxed">${vo2Interpretation}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize charts with session-specific data
    if (sessionHrRrChart) sessionHrRrChart.destroy();
    const sessionHrRrChartCtx = document.getElementById('sessionHrRrChart')?.getContext('2d');
    if (sessionHrRrChartCtx) {
        sessionHrRrChart = new Chart(sessionHrRrChartCtx, {
            type: 'line',
            data: {
                labels: session.timestamps || [],
                datasets: [
                    {
                        label: 'Hartslag (BPM)',
                        data: session.rawHrData || [],
                        borderColor: '#f87171',
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y-hr'
                    },
                    {
                        label: 'Ruwe RR Interval (ms)',
                        data: session.rawRrData || [], // Assuming rawRrData holds the actual RR intervals
                        borderColor: 'rgba(167, 139, 250, 0.5)', // Lichter paars voor achtergrond
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false,
                        yAxisID: 'y-rr',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    'y-hr': {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: false,
                        title: { display: true, text: 'Hartslag' }
                    },
                    'y-rr': {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: false,
                        title: { display: true, text: 'RR Interval (ms)' },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    if (sessionHrvChart) sessionHrvChart.destroy();
    const sessionHrvChartCtx = document.getElementById('sessionHrvChart')?.getContext('2d');
    if (sessionHrvChartCtx) {
        sessionHrvChart = new Chart(sessionHrvChartCtx, {
            type: 'bar',
            data: {
                labels: ['RMSSD', 'SDNN', 'pNN50'],
                datasets: [{
                    label: 'HRV Metrics',
                    data: [rmssd, sdnn, pnn50],
                    backgroundColor: ['#4ade80', '#2dd4bf', '#a78bfa'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Waarde' } }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    if (sessionBreathChart) sessionBreathChart.destroy();
    const sessionBreathChartCtx = document.getElementById('sessionBreathChart')?.getContext('2d');
    if (sessionBreathChartCtx) {
        sessionBreathChart = new Chart(sessionBreathChartCtx, {
            type: 'line',
            data: {
                labels: session.timestamps || [],
                datasets: [{
                    label: 'Ademhalingsfrequentie (BPM)',
                    data: session.rawBreathData || [],
                    borderColor: '#3b82f6',
                    tension: 0.4,
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'BPM' } }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    // OPMERKING: Poincaré Plot en Power Spectrum Charts voor gedetailleerd rapport
    // Deze grafieken vereisen specifieke data (freqs, psd) die momenteel niet in `session` objecten worden opgeslagen.
    // Om deze te renderen, moet de volledige HRVAnalyzer logica opnieuw worden uitgevoerd op `session.rawRrData`
    // of de berekende frequentiedomein data moet worden opgeslagen in de sessie.
    // Voor nu worden ze niet geïnitialiseerd.
    const sessionRestPoincarePlotChartCtx = document.getElementById('sessionRestPoincarePlotChart')?.getContext('2d');
    if (sessionRestPoincarePlotChartCtx) {
        // OPMERKING: Implementeer hier de Poincaré Plot initialisatie met session.rawRrData
        // Voorbeeld: new Chart(sessionRestPoincarePlotChartCtx, { type: 'scatter', ... });
    }

    const sessionRestPowerSpectrumChartCtx = document.getElementById('sessionRestPowerSpectrumChart')?.getContext('2d');
    if (sessionRestPowerSpectrumChartCtx) {
        // OPMERKING: Implementeer hier de Power Spectrum Chart initialisatie met session.vlfPower, lfPower, hfPower
        // Voorbeeld: new Chart(sessionRestPowerSpectrumChartCtx, { type: 'bar', ... });
    }
}

export async function initTrainingReportsView() {
    console.log("Training Rapporten View geïnitialiseerd.");

    const trainingSessionReportsList = document.getElementById('trainingSessionReportsList');
    const downloadTrainingPdfBtn = document.getElementById('downloadTrainingPdfBtn');
    const detailedTrainingReportContainer = document.getElementById('detailedTrainingReportContainer'); // Get the detailed report container

    async function loadTrainingSessionReports() {
        const freeSessions = await getAllData('trainingSessionsFree');
        const advancedSessions = await getAllData('trainingSessionsAdvanced');

        // Combine and deduplicate sessions based on date (assuming date is unique enough for a session)
        const allTrainingSessionsMap = new Map();
        freeSessions.forEach(session => allTrainingSessionsMap.set(session.date, { ...session, type: 'Free' }));
        advancedSessions.forEach(session => allTrainingSessionsMap.set(session.date, { ...allTrainingSessionsMap.get(session.date), ...session, type: 'Advanced' }));

        const allTrainingSessions = Array.from(allTrainingSessionsMap.values());

        trainingSessionReportsList.innerHTML = '';

        if (allTrainingSessions.length === 0) {
            trainingSessionReportsList.innerHTML = '<p class="text-gray-400">Geen trainingsrapporten gevonden.</p>';
            return;
        }

        allTrainingSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        allTrainingSessions.forEach(session => {
            const rmssdValue = (typeof session.rmssd === 'number' && !isNaN(session.rmssd)) ? session.rmssd.toFixed(2) : '--';
            const reportCard = document.createElement('div');
            reportCard.className = 'data-card bg-gray-700 rounded-lg p-4 shadow-md';
            reportCard.innerHTML = `
                <div class="card-header mb-2"><h3>Training van ${session.date || 'Onbekend'} (${session.type || 'N/A'})</h3></div>
                <div class="sub-value text-gray-300">Duur: ${session.duration || '--'} min</div>
                <div class="sub-value text-gray-300">Gem. HR: ${session.avgHr || '--'} BPM</div>
                <div class="sub-value text-gray-300">RMSSD: ${rmssdValue} MS</div>
                <div class="flex justify-end mt-4">
                    <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 text-sm" data-action="view-detailed-training-report" data-date="${session.date}">Bekijk Rapport</button>
                </div>
            `;
            trainingSessionReportsList.appendChild(reportCard);
        });

        trainingSessionReportsList.querySelectorAll('[data-action="view-detailed-training-report"]').forEach(button => {
            button.addEventListener('click', async (event) => {
                const sessionDate = event.target.dataset.date;
                const session = allTrainingSessions.find(s => s.date === sessionDate);
                if (session) {
                    await loadTrainingSessionReports(session);
                } else {
                    showNotification(`Sessie van ${sessionDate} niet gevonden.`, "error");
                }
            });
        });
    }

    if (downloadTrainingPdfBtn) {
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            downloadTrainingPdfBtn.disabled = true;
        } else {
            downloadTrainingPdfBtn.addEventListener('click', async () => {
                showNotification("Rapport wordt voorbereid voor PDF-export...", "info", 3000);
                const a4Container = document.querySelector('.a4-container');
                if (!a4Container) {
                    showNotification("Fout: A4-container niet gevonden.", "error");
                    return;
                }

                // Temporarily hide the session list and only show the detailed report if it's active
                const originalSessionListDisplay = trainingSessionReportsList.style.display;
                const originalDetailedReportDisplay = detailedTrainingReportContainer.style.display;
                trainingSessionReportsList.style.display = 'none';
                detailedTrainingReportContainer.style.display = 'block'; // Ensure it's visible for capture

                try {
                    // Inject styles for html2canvas
                    const style = document.createElement('style');
                    style.textContent = `
/* All styling is now direct CSS properties or Tailwind utility classes in the HTML. */
        /* No @apply directives here, as they require a build step. */

        body {
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
            background-color: #111827; /* bg-gray-900 */
            color: #e5e7eb; /* text-gray-200 */
            padding: 1rem; /* p-4 */
        }
        @media (min-width: 640px) { /* sm:p-8 */
            body {
                padding: 2rem;
            }
        }

        .app-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: #1f2937; /* bg-gray-800 */
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
            position: relative;
        }

        .app-section {
            display: none;
            flex-grow: 1;
            overflow-y: auto;
            padding-bottom: 80px; /* Space for bottom nav */
        }

        .app-section.active {
            display: block;
        }

        .top-nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background-color: #111827; /* bg-gray-900 */
            color: #e5e7eb;
            border-bottom: 1px solid #374151; /* border-gray-700 */
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .top-nav span {
            font-size: 1.25rem;
            font-weight: bold;
        }

        .icon-button {
            background: none;
            border: none;
            color: #9ca3af;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.5rem;
            transition: background-color 0.2s ease;
        }

        .icon-button:hover {
            background-color: #374151;
        }

        .dashboard-header {
            margin-bottom: 2rem; /* mb-8 */
            text-align: center;
        }
        @media (min-width: 768px) { /* md:mb-12 */
            .dashboard-header {
                margin-bottom: 3rem;
            }
        }

        .dashboard-header h1 {
            font-size: 1.875rem; /* text-3xl */
            line-height: 2.25rem; /* leading-9 */
            font-weight: 800; /* font-extrabold */
            color: #60a5fa; /* text-blue-400 */
            margin-bottom: 1.5rem; /* mb-6 */
        }
        @media (min-width: 640px) { /* sm:text-4xl */
            .dashboard-header h1 {
                font-size: 2.25rem;
                line-height: 2.5rem;
            }
        }

        .dashboard-header p {
            color: #9ca3af; /* text-gray-400 */
            margin-top: 0.5rem; /* mt-2 */
        }

        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(1, minmax(0, 1fr)); /* grid-cols-1 */
            gap: 1.5rem; /* gap-6 */
            max-width: 90rem; /* max-w-8xl */
            margin-left: auto;
            margin-right: auto;
        }
        @media (min-width: 640px) { /* sm:grid-cols-2 */
            .dashboard-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        @media (min-width: 1024px) { /* lg:grid-cols-3 */
            .dashboard-grid {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
        }
        @media (min-width: 1280px) { /* xl:grid-cols-4 */
            .dashboard-grid {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }
        }
        /* For 6 columns on very large screens */
        @media (min-width: 1536px) { /* 2xl:grid-cols-6 - assuming 2xl breakpoint for 6 columns */
            .dashboard-grid {
                grid-template-columns: repeat(6, minmax(0, 1fr));
            }
        }

        .dashboard-section-header {
            font-size: 1.25rem; /* text-xl */
            font-weight: 700; /* font-bold */
            color: #f9fafb; /* text-gray-100 */
            border-bottom: 1px solid #374151; /* border-b border-gray-700 */
            padding-bottom: 0.5rem; /* pb-2 */
            margin-bottom: 1rem; /* mb-4 */
            margin-top: 2rem; /* mt-8 */
        }

        .dashboard-widget-card {
            min-height: 10rem; /* Adjusted for dashboard widgets */
            position: relative;
            background: linear-gradient(135deg, rgba(55,65,81,1) 0%, rgba(17,24,39,1) 100%);
            padding: 2px;
            border-radius: 1rem; /* rounded-2xl */
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* shadow-xl */
            transition: transform 0.3s ease; /* transition duration-300 ease */
            cursor: pointer;
        }
        .dashboard-widget-card:hover {
            transform: scale(1.03); /* Slightly less aggressive hover */
        }

        .dashboard-widget-content {
            background-color: #111827; /* bg-gray-900 */
            padding: 1.5rem; /* p-6 */
            border-radius: 1rem; /* rounded-2xl */
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .dashboard-widget-content i {
            font-size: 3rem; /* Adjusted icon size for dashboard */
            margin-bottom: 0.75rem;
        }

        .dashboard-widget-content h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #e5e7eb;
        }

        /* Specific Font Awesome icon sizing and color */
        .fa-5xl {
            font-size: 5rem; /* 80px */
            line-height: 1;
        }
        .icon-blue { color: #60a5fa; }
        .icon-green { color: #4ade80; }
        .icon-red { color: #f87171; }
        .icon-purple { color: #c084fc; }
        .icon-yellow { color: #facc15; }
        .icon-cyan { color: #22d3ee; }
        .icon-indigo { color: #818cf8; }
        .icon-pink { color: #f472b6; }
        .icon-teal { color: #2dd4bf; }
        .icon-emerald { color: #34d399; }
        .icon-gray { color: #9ca3af; }
        .icon-orange { color: #f97316; }

        /* Animation for heartbeat icon */
        @keyframes heartbeat {
            0% { transform: scale(1); }
            15% { transform: scale(1.1); }
            30% { transform: scale(1); }
            45% { transform: scale(1.1); }
            60% { transform: scale(1); }
            100% { transform: scale(1); }
        }
        .heartbeat-icon {
            animation: heartbeat 1.5s infinite;
        }

        /* Modal Overlay for Pop-ups */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7); /* Dim the background */
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000; /* Above other content */
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease;
        }

        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .modal-content {
            background-color: #2c2c34; /* Match card background */
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.8);
            width: 90%;
            max-width: 380px; /* Max width for modal to fit phone design */
            max-height: 90vh; /* Max height for scrollable content */
            overflow-y: auto; /* Enable scrolling for modal content */
            display: flex;
            flex-direction: column;
            transform: scale(0.9);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            position: relative; /* For close button */
        }

        .modal-overlay.active .modal-content {
            transform: scale(1);
            opacity: 1;
        }

        .modal-close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #e74c3c; /* Danger color */
            color: white;
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2001;
            transition: background-color 0.2s ease;
        }
        .modal-close-btn:hover {
            background-color: #c0392b;
        }

        .modal-title {
            font-size: 1.5rem; /* text-2xl */
            font-weight: bold;
            color: #60a5fa; /* text-blue-400 */
            margin-bottom: 1rem;
            text-align: center;
        }

        .modal-body-text {
            font-size: 1rem; /* text-base */
            color: #e0e0e0;
            margin-bottom: 1rem;
        }

        .modal-button-group {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .modal-button-group button {
            background-color: #2563eb; /* bg-blue-600 */
            color: #ffffff; /* text-white */
            font-weight: bold;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            transition: background-color 0.2s ease;
        }
        .modal-button-group button:hover {
            background-color: #1d4ed8; /* hover:bg-blue-700 */
        }
        .modal-button-group .btn-secondary {
            background-color: #4b5563; /* bg-gray-600 */
        }
        .modal-button-group .btn-secondary:hover {
            background-color: #374151; /* hover:bg-gray-700 */
        }

        /* Styling for forms within modals/sections */
        .form-section-header {
            font-size: 1.125rem;
            font-weight: bold;
            color: #f9fafb;
            border-bottom: 1px solid #374151;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
            margin-top: 1.5rem;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(1, minmax(0, 1fr));
            gap: 1rem;
        }
        @media (min-width: 768px) {
            .form-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }
        .form-group {
            display: flex;
            flex-direction: column;
        }
        .form-group label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #9ca3af;
            margin-bottom: 0.25rem;
        }
        .form-group input, .form-group select, .form-group textarea {
            padding: 0.5rem;
            border-radius: 0.375rem;
            background-color: #374151;
            border: 1px solid #4b5563;
            color: #e5e7eb;
            font-size: 1rem;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none;
            border-color: #60a5fa;
            box-shadow: 0 0 0 1px #60a5fa;
        }
        .section-note {
            font-size: 0.875rem;
            color: #9ca3af;
            margin-top: 0.5rem;
            margin-bottom: 1rem;
        }

        /* Styling for data cards in live measurement */
        .data-card { /* Renamed from .live-measurement-content .data-card for broader use */
            background-color: #2c2c34;
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }
        .data-card .card-header h3 {
            font-size: 0.875rem;
            color: #9ca3af;
            margin: 0;
            font-weight: normal;
        }
        .data-card .main-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #e0e0e0;
            margin-bottom: 0.5rem;
        }
        .data-card .sub-value {
            font-size: 0.875rem;
            color: #9ca3af;
        }
        .data-card .mini-chart-container {
            width: 100%;
            height: 80px;
            margin-top: 0.5rem;
            position: relative;
        }
        .data-card .mini-chart-container canvas {
            position: absolute;
            width: 100% !important;
            height: 100% !important;
            left: 0;
            top: 0;
        }
        .data-card .circle-chart-container {
            width: 100px;
            height: 100px;
            margin: 0 auto;
            position: relative;
        }
        .data-card .circle-chart-container canvas {
            position: absolute;
            width: 100% !important;
            height: 100% !important;
            left: 0;
            top: 0;
        }
        .data-card .control-buttons {
            display: flex;
            justify-content: center;
            gap: 1rem;
            padding: 1rem;
            margin-top: auto;
        }
        .data-card .control-buttons button {
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s ease;
            flex: 1;
            max-width: 150px;
        }
        #startMeasurementBtnLive { background-color: #2ecc71; }
        #startMeasurementBtnLive:hover { background-color: #27ae60; }
        #stopMeasurementBtnLive { background-color: #e74c3c; }
        #stopMeasurementBtnLive:hover { background-color: #c0392b; }

        /* Styling for HR Data View */
        .hr-data-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
        }
        .hr-data-grid .chart-container-full {
            grid-column: 1 / -1;
            background-color: #2c2c34;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            height: 300px; /* Fixed height for full charts */
            position: relative;
        }
        .hr-data-grid .chart-container-full canvas {
            position: absolute;
            width: 100% !important;
            height: 100% !important;
            left: 0;
            top: 0;
        }
        .hr-data-grid .status-box {
            background-color: #2c2c34;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        .hr-data-grid .status-box h4 {
            font-size: 0.875rem;
            color: #9ca3af;
            margin-bottom: 0.25rem;
        }
        .hr-data-grid .status-box p {
            font-size: 1.25rem;
            font-weight: bold;
            color: #e0e0e0;
        }

        /* Styling for Testing View */
        .test-results-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .test-result-card {
            background-color: #2c2c24;
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            text-align: center;
        }
        .test-result-card h4 {
            font-size: 0.875rem;
            color: #9ca3af;
            margin-bottom: 0.25rem;
        }
        .test-result-card p {
            font-size: 1.25rem;
            font-weight: bold;
            color: #e0e0e0;
        }

        /* Styling for Nutrition View */
        .nutrition-program-card {
            background-color: #2c2c34;
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .nutrition-program-card h3 {
            font-size: 1rem;
            font-weight: bold;
            color: #e0e0e0;
            margin-bottom: 0.5rem;
        }
        .nutrition-program-card .sub-value {
            font-size: 0.875rem;
            color: #9ca3af;
        }
        .nutrition-program-card .flex button {
            font-size: 0.875rem;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
        }

        /* Floating Bluetooth Widget */
        .bluetooth-widget {
            position: fixed;
            bottom: 80px; /* Above bottom navigation */
            right: 20px;
            width: 250px;
            background-color: #2c2c34;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
            transform: translateX(100%);
            opacity: 0;
        }

        .bluetooth-widget.active {
            transform: translateX(0);
            opacity: 1;
        }

        .bluetooth-widget.hidden {
            display: none;
        }

        .bluetooth-widget-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background-color: #1a202c; /* Darker header */
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
            color: #e5e7eb;
            font-weight: bold;
        }

        .bluetooth-widget-content {
            padding: 15px;
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
        }

        .data-card-small {
            background-color: #111827;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .data-card-small .card-header h3 {
            font-size: 0.75rem;
            color: #9ca3af;
            margin-bottom: 5px;
        }

        .data-card-small .main-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #e0e0e0;
        }

        .data-card-small .sub-value {
            font-size: 0.7rem;
            color: #9ca3af;
        }

        .control-buttons-small {
            display: flex;
            justify-content: space-around;
            gap: 10px;
            margin-top: 10px;
        }

        .control-buttons-small button {
            padding: 8px 12px;
            border-radius: 6px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s ease;
            flex-grow: 1;
        }

        .control-buttons-small #startMeasurementBtnLive {
            background-color: #2ecc71;
        }

        .control-buttons-small #startMeasurementBtnLive:hover {
            background-color: #27ae60;
        }

        .control-buttons-small #stopMeasurementBtnLive {
            background-color: #e74c3c;
        }

        .control-buttons-small #stopMeasurementBtnLive:hover {
            background-color: #c0392b;
        }

        .floating-bluetooth-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #60a5fa; /* Blue color */
            color: white;
            border: none;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            transition: background-color 0.2s ease;
        }

        .floating-bluetooth-button:hover {
            background-color: #3b82f6;
        }

        .toggle-button {
            background: none;
            border: none;
            color: #e5e7eb;
            font-size: 1.2rem;
            cursor: pointer;
        }

        .toggle-button:hover {
            color: #9ca3af;
        }

        .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            display: flex;
            justify-content: space-around;
            align-items: center;
            background-color: #111827; /* bg-gray-900 */
            border-top: 1px solid #374151; /* border-gray-700 */
            padding: 1rem 0;
            z-index: 100;
        }

        .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 0.75rem;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.5rem;
            transition: color 0.2s ease, background-color 0.2s ease;
        }

        .bottom-nav-item:hover {
            color: #e5e7eb;
            background-color: #374151;
        }

        .bottom-nav-item.active {
            color: #60a5fa; /* text-blue-400 */
        }

        .bottom-nav-item i {
            font-size: 1.2rem;
            margin-bottom: 0.25rem;
        }
                    `;
                    a4Container.appendChild(style);

                    const canvas = await html2canvas(a4Container, {
                        scale: 2, // Increase scale for better quality
                        useCORS: true,
                        logging: false,
                        onclone: (clonedDoc) => {
                            clonedDoc.querySelectorAll('canvas').forEach(canvasEl => {
                                const rect = canvasEl.getBoundingClientRect();
                                canvasEl.width = rect.width;
                                canvasEl.height = rect.height;
                            });
                        }
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                    let heightLeft = pdfHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pdf.internal.pageSize.getHeight();

                    while (heightLeft >= 0) {
                        position = heightLeft - pdfHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                        heightLeft -= pdf.internal.pageSize.getHeight();
                    }

                    pdf.save(`training_rapport_${new Date().toISOString().split('T')[0]}.pdf`);
                    showNotification("Rapport succesvol geëxporteerd als PDF!", "success");

                } catch (error) {
                    console.error("Fout bij het genereren van de PDF:", error);
                    showNotification("Fout bij het genereren van de PDF. Controleer de console voor details.", "error");
                } finally {
                    // Herstel de oorspronkelijke weergavestijlen
                    trainingSessionReportsList.style.display = originalSessionListDisplay;
                    detailedTrainingReportContainer.style.display = originalDetailedReportDisplay;
                    if (style) {
                        style.remove();
                    }
                }
            });
        }
    }

    // Roep alle laadfuncties aan bij initialisatie
    await loadTrainingSessionReports();
}