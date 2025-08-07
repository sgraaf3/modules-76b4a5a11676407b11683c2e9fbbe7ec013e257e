// Bestand: js/trainingReportsView.js
// Added a comment to force cache refresh.
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses voor individuele trainingssessies.

import { getAllData, getData } from '../database.js';
import { showNotification } from './notifications.js';
import { Bodystandard, VO2, RuntimesVo2 } from '../rr_hr_hrv_engine.js';

// Globale variabelen om Chart.js instanties bij te houden
let sessionHrRrChart;
let sessionHrvChart;
let sessionBreathChart;

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
    if (currentHR = warmupHrThreshold) return 'Warmup';
    return getHrvBasedRestZone(rmssd);
}


// Functie om een gedetailleerd rapport te genereren en weer te geven
async function generateTrainingReport(session) {
    const detailedReportContainer = document.getElementById('detailedReportContainer');
    if (!detailedReportContainer) {
        console.error("Detailed report container not found.");
        showNotification("Fout: Rapport container niet gevonden.", "error");
        return;
    }

    // Haal gebruikersprofiel op voor context
    const userProfile = await getData('userProfile', session.userId);
    const userBaseAtHR = userProfile ? parseFloat(userProfile.userBaseAtHR) : 0;
    const userMaxHR = userProfile ? parseFloat(userProfile.userMaxHR) : 0;
    const userRestHR = userProfile ? parseFloat(userProfile.userRestHR) : 0;

    // Berekeningen voor uitleg
    const avgHr = parseFloat(session.avgHr) || 0;
    const rmssd = parseFloat(session.rmssd) || 0;
    const sdnn = parseFloat(session.sdnn) || 0;
    const avgBreathRate = parseFloat(session.avgBreathRate) || 0;
    const pnn50 = parseFloat(session.pnn50) || 0;
    const lfPower = parseFloat(session.lfPower) || 0;
    const hfPower = parseFloat(session.hfPower) || 0;
    const vlfPower = parseFloat(session.vlfPower) || 0;
    const lfHfRatio = (hfPower > 0) ? (lfPower / hfPower).toFixed(2) : '--';


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
        
        <!-- OPMERKING: Secties voor Biometrie en VO2 Max kunnen hier worden toegevoegd indien gewenst.
                     Deze vereisen dat de 'session' data ook deze metingen bevat. -->
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

export async function initRestReportsView() {
    console.log("Rust Rapporten View geïnitialiseerd.");

    const restSessionReportsList = document.getElementById('restSessionReportsList');
    const downloadRestPdfBtn = document.getElementById('downloadRestPdfBtn');
    const detailedRestReportContainer = document.getElementById('detailedRestReportContainer'); // Get the detailed report container

    async function loadRestSessionReports() {
        const freeSessions = await getAllData('restSessionsFree');
        const advancedSessions = await getAllData('restSessionsAdvanced');

        // Combine and deduplicate sessions based on date (assuming date is unique enough for a session)
        const allRestSessionsMap = new Map();
        freeSessions.forEach(session => allRestSessionsMap.set(session.date, { ...session, type: 'Free' }));
        advancedSessions.forEach(session => allRestSessionsMap.set(session.date, { ...allRestSessionsMap.get(session.date), ...session, type: 'Advanced' }));

        const allRestSessions = Array.from(allRestSessionsMap.values());

        restSessionReportsList.innerHTML = '';

        if (allRestSessions.length === 0) {
            restSessionReportsList.innerHTML = '<p class="text-gray-400">Geen rustmeting rapporten gevonden.</p>';
            return;
        }

        allRestSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        allRestSessions.forEach(session => {
            const rmssdValue = (typeof session.rmssd === 'number' && !isNaN(session.rmssd)) ? session.rmssd.toFixed(2) : '--';
            const reportCard = document.createElement('div');
            reportCard.className = 'data-card bg-gray-700 rounded-lg p-4 shadow-md';
            reportCard.innerHTML = `
                <div class="card-header mb-2"><h3>Rustmeting van ${session.date || 'Onbekend'} (${session.type || 'N/A'})</h3></div>
                <div class="sub-value text-gray-300">Duur: ${session.duration || '--'} min</div>
                <div class="sub-value text-gray-300">Gem. HR: ${session.avgHr || '--'} BPM</div>
                <div class="sub-value text-gray-300">RMSSD: ${rmssdValue} MS</div>
                <div class="flex justify-end mt-4">
                    <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 text-sm" data-action="view-detailed-rest-report" data-date="${session.date}">Bekijk Rapport</button>
                </div>
            `;
            restSessionReportsList.appendChild(reportCard);
        });

        restSessionReportsList.querySelectorAll('[data-action="view-detailed-rest-report"]').forEach(button => {
            button.addEventListener('click', async (event) => {
                const sessionDate = event.target.dataset.date;
                const session = allRestSessions.find(s => s.date === sessionDate);
                if (session) {
                    await generateRestReport(session);
                } else {
                    showNotification(`Sessie van ${sessionDate} niet gevonden.`, "error");
                }
            });
        });
    }

    if (downloadRestPdfBtn) {
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            downloadRestPdfBtn.disabled = true;
        } else {
            downloadRestPdfBtn.addEventListener('click', async () => {
                showNotification("Rapport wordt voorbereid voor PDF-export...", "info", 3000);
                const a4Container = document.querySelector('.a4-container');
                if (!a4Container) {
                    showNotification("Fout: A4-container niet gevonden.", "error");
                    return;
                }

                // Temporarily hide the session list and only show the detailed report if it's active
                const originalSessionListDisplay = restSessionReportsList.style.display;
                const originalDetailedReportDisplay = detailedReportContainer.style.display;
                restSessionReportsList.style.display = 'none';
                detailedReportContainer.style.display = 'block'; // Ensure it's visible for capture

                try {
                    // Re-render charts to ensure they are up-to-date and correctly rendered for capture
                    // This assumes that generateRestReport was called just before this,
                    // and the charts are already populated with the correct session data.
                    
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

                    pdf.save(`rust_rapport_${new Date().toISOString().split('T')[0]}.pdf`);
                    showNotification("Rapport succesvol geëxporteerd als PDF!", "success");

                } catch (error) {
                    console.error("Fout bij het genereren van de PDF:", error);
                    showNotification("Fout bij het genereren van de PDF. Controleer de console voor details.", "error");
                } finally {
                    // Restore original display styles
                    restSessionReportsList.style.display = originalSessionListDisplay;
                    detailedReportContainer.style.display = originalDetailedReportDisplay;
                }
            });
        }
    }

    // Roep alle laadfuncties aan bij initialisatie
    await loadRestSessionReports();
}
