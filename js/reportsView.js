// Bestand: js/views/reportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses.

import { getAllData } from '../database.js';
import { showNotification } from './notifications.js';

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

    const togglePerformanceChartCheckbox = document.getElementById('togglePerformanceChart');
    const performanceChartContainer = document.getElementById('performanceChartContainer');
    const toggleHrvChartCheckbox = document.getElementById('toggleHrvChart');
    const hrvChartContainer = document.getElementById('hrvChartContainer');

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
            const rmssdValue = (typeof session.rmssd === 'number' && !isNaN(session.rmssd)) ? session.rmssd.toFixed(2) : '--'; // Robuuste controle
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

    // Functie om algemene prestatieoverzichten te berekenen en weer te geven
    async function loadPerformanceOverview() {
        const trainingSessions = await getAllData('trainingSessions');
        const userProfiles = await getAllData('userProfile');

        const totalDuration = trainingSessions.reduce((sum, session) => sum + (parseFloat(session.duration) || 0), 0);
        const avgDuration = trainingSessions.length > 0 ? (totalDuration / trainingSessions.length).toFixed(0) : '--';
        if (avgTrainingDurationDisplay) avgTrainingDurationDisplay.textContent = `${avgDuration} min`;

        const totalRestHr = userProfiles.reduce((sum, profile) => sum + (parseFloat(profile.userRestHR) || 0), 0);
        const avgRestHr = userProfiles.length > 0 ? (totalRestHr / userProfiles.length).toFixed(0) : '--';
        if (avgRestHrDisplay) avgRestHrDisplay.textContent = `${avgRestHr} BPM`;

        const totalCalories = trainingSessions.reduce((sum, session) => sum + (parseFloat(session.caloriesBurned || 0)), 0);
        if (totalCaloriesBurnedDisplay) totalCaloriesBurnedDisplay.textContent = `${totalCalories.toFixed(0)} kcal`;
    }

    // Functie om de prestatie trendgrafiek te initialiseren/updaten
    function initPerformanceTrendChart() {
        if (performanceTrendChart) {
            performanceTrendChart.destroy();
        }
        if (performanceTrendChartCtx) {
            performanceTrendChart = new Chart(performanceTrendChartCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                        label: 'Gemiddelde Prestatie Score',
                        data: [70, 72, 75, 73, 78, 80, 82], // Voorbeelddata
                        borderColor: '#60a5fa',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 60, // Vaste minimumwaarde
                            max: 100, // Vaste maximumwaarde
                            title: {
                                display: true,
                                text: 'Score'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    }

    // Functie om de HRV herstel trendgrafiek te initialiseren/updaten
    async function initHrvRecoveryTrendChart() {
        if (hrvRecoveryTrendChart) {
            hrvRecoveryTrendChart.destroy();
        }
        if (hrvRecoveryTrendChartCtx) {
            const trainingSessions = await getAllData('trainingSessions');
            const hrvData = trainingSessions
                .filter(session => typeof session.rmssd === 'number' && !isNaN(session.rmssd) && session.date) // Filter op geldige nummers
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const labels = hrvData.map(session => new Date(session.date).toLocaleDateString());
            const rmssdValues = hrvData.map(session => session.rmssd);

            hrvRecoveryTrendChart = new Chart(hrvRecoveryTrendChartCtx, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'], // Fallback labels
                    datasets: [{
                        label: 'Gemiddelde RMSSD (HRV)',
                        data: rmssdValues.length > 0 ? rmssdValues : [40, 42, 38, 45, 41, 48], // Fallback data
                        borderColor: '#4ade80',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 20,
                            max: 80,
                            title: {
                                display: true,
                                text: 'RMSSD (ms)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    }

    // Initialiseer checkboxes en hun event listeners
    if (togglePerformanceChartCheckbox) {
        togglePerformanceChartCheckbox.addEventListener('change', () => {
            if (togglePerformanceChartCheckbox.checked) {
                performanceChartContainer.style.display = 'block';
                initPerformanceTrendChart();
            } else {
                performanceChartContainer.style.display = 'none';
                if (performanceTrendChart) {
                    performanceTrendChart.destroy();
                }
            }
        });
        if (togglePerformanceChartCheckbox.checked) {
            initPerformanceTrendChart();
        } else {
            performanceChartContainer.style.display = 'none';
        }
    }

    if (toggleHrvChartCheckbox) {
        toggleHrvChartCheckbox.addEventListener('change', async () => {
            if (toggleHrvChartCheckbox.checked) {
                hrvChartContainer.style.display = 'block';
                await initHrvRecoveryTrendChart();
            } else {
                hrvChartContainer.style.display = 'none';
                if (hrvRecoveryTrendChart) {
                    hrvRecoveryTrendChart.destroy();
                }
            }
        });
        if (toggleHrvChartCheckbox.checked) {
            await initHrvRecoveryTrendChart();
        } else {
            hrvChartContainer.style.display = 'none';
        }
    }

    // PDF generatie functionaliteit
    if (downloadPdfBtn) {
        // Controleer of jsPDF en html2canvas geladen zijn
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            console.error("jsPDF of html2canvas is niet geladen. Zorg ervoor dat de scripts in index.html staan.");
            showNotification("Fout: PDF-export bibliotheken niet geladen. Controleer index.html.", "error");
            downloadPdfBtn.disabled = true; // Schakel de knop uit
        } else {
            downloadPdfBtn.addEventListener('click', async () => {
                showNotification("Rapport wordt voorbereid voor PDF-export...", "info", 3000);
                const element = document.querySelector('.p-4'); // Selecteer de hoofdinhoud van de view

                // Tijdelijk de navigatie en widgets verbergen voor een schonere PDF
                const topNav = document.querySelector('.top-nav');
                const bottomNav = document.querySelector('.bottom-nav');
                const bluetoothWidget = document.getElementById('bluetoothWidget');
                const openBluetoothWidgetBtn = document.getElementById('openBluetoothWidget');

                if (topNav) topNav.style.display = 'none';
                if (bottomNav) bottomNav.style.display = 'none';
                if (bluetoothWidget) bluetoothWidget.style.display = 'none';
                if (openBluetoothWidgetBtn) openBluetoothWidgetBtn.style.display = 'none';

                try {
                    const canvas = await html2canvas(element, {
                        scale: 2,
                        useCORS: true,
                        logging: false
                    });

                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                    const imgWidth = 210;
                    const pageHeight = 297;
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft >= 0) {
                        position = heightLeft - imgHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }

                    pdf.save('rapport_voortgang.pdf');
                    showNotification("Rapport succesvol geëxporteerd als PDF!", "success");

                } catch (error) {
                    console.error("Fout bij het genereren van de PDF:", error);
                    showNotification("Fout bij het genereren van de PDF. Controleer de console voor details.", "error");
                } finally {
                    // Zorg ervoor dat de verborgen elementen weer zichtbaar worden
                    if (topNav) topNav.style.display = 'flex';
                    if (bottomNav) bottomNav.style.display = 'flex';
                    if (bluetoothWidget) bluetoothWidget.style.display = 'flex';
                    if (openBluetoothWidgetBtn) openBluetoothWidgetBtn.style.display = 'flex';
                }
            });
        }
    }

    // Functie om de individuele hartslag trendgrafiek te initialiseren/updaten
    async function initIndividualHrChart() {
        if (individualHrChart) {
            individualHrChart.destroy();
        }
        const individualHrChartCtx = document.getElementById('individualHrChart')?.getContext('2d');
        if (individualHrChartCtx) {
            const trainingSessions = await getAllData('trainingSessions');
            const hrData = trainingSessions
                .filter(session => typeof session.avgHr === 'number' && !isNaN(session.avgHr) && session.date)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const labels = hrData.map(session => new Date(session.date).toLocaleDateString());
            const avgHrValues = hrData.map(session => session.avgHr);

            individualHrChart = new Chart(individualHrChartCtx, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Geen data'],
                    datasets: [{
                        label: 'Gemiddelde Hartslag (BPM)',
                        data: avgHrValues.length > 0 ? avgHrValues : [0],
                        borderColor: '#facc15',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Hartslag (BPM)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    }

    // Functie om de individuele HRV trendgrafiek te initialiseren/updaten
    async function initIndividualHrvChart() {
        if (individualHrvChart) {
            individualHrvChart.destroy();
        }
        const individualHrvChartCtx = document.getElementById('individualHrvChart')?.getContext('2d');
        if (individualHrvChartCtx) {
            const trainingSessions = await getAllData('trainingSessions');
            const hrvData = trainingSessions
                .filter(session => typeof session.rmssd === 'number' && !isNaN(session.rmssd) && session.date)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const labels = hrvData.map(session => new Date(session.date).toLocaleDateString());
            const rmssdValues = hrvData.map(session => session.rmssd);

            individualHrvChart = new Chart(individualHrvChartCtx, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Geen data'],
                    datasets: [{
                        label: 'RMSSD (MS)',
                        data: rmssdValues.length > 0 ? rmssdValues : [0],
                        borderColor: '#34d399',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'RMSSD (MS)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        }
                    }
                }
            });
        }
    }

    // Initialiseer checkboxes en hun event listeners voor individuele grafieken
    if (toggleIndividualHrChartCheckbox) {
        toggleIndividualHrChartCheckbox.addEventListener('change', async () => {
            if (toggleIndividualHrChartCheckbox.checked) {
                individualHrChartContainer.style.display = 'block';
                await initIndividualHrChart();
            } else {
                individualHrChartContainer.style.display = 'none';
                if (individualHrChart) {
                    individualHrChart.destroy();
                }
            }
        });
        // Initial state
        if (toggleIndividualHrChartCheckbox.checked) {
            individualHrChartContainer.style.display = 'block';
        } else {
            individualHrChartContainer.style.display = 'none';
        }
    }

    if (toggleIndividualHrvChartCheckbox) {
        toggleIndividualHrvChartCheckbox.addEventListener('change', async () => {
            if (toggleIndividualHrvChartCheckbox.checked) {
                individualHrvChartContainer.style.display = 'block';
                await initIndividualHrvChart();
            } else {
                individualHrvChartContainer.style.display = 'none';
                if (individualHrvChart) {
                    individualHrvChart.destroy();
                }
            }
        });
        // Initial state
        if (toggleIndividualHrvChartCheckbox.checked) {
            individualHrvChartContainer.style.display = 'block';
        } else {
            individualHrvChartContainer.style.display = 'none';
        }
    }

    // Roep algemene laadfuncties aan
    await loadSessionReports();
    await loadPerformanceOverview();
}
