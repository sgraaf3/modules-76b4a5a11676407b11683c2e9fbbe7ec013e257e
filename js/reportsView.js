// Bestand: js/views/reportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses.

import { getAllData, getData } from '../database.js';
import { showNotification } from './notifications.js';

let performanceTrendChart;
let hrvRecoveryTrendChart;
let individualHrChart;
let individualHrvChart;
let biometricsTrendChart; // Nieuwe chart
let sportActivitiesTrendChart; // Nieuwe chart
let financeTrendChart; // Nieuwe chart
let sleepTrendChart; // Nieuwe chart

export async function initReportsView() {
    console.log("Rapporten & Voortgang View geïnitialiseerd.");

    const sessionReportsList = document.getElementById('sessionReportsList');
    const avgTrainingDurationDisplay = document.getElementById('avgTrainingDuration');
    const avgRestHrDisplay = document.getElementById('avgRestHr');
    const totalCaloriesBurnedDisplay = document.getElementById('totalCaloriesBurned');

    const performanceTrendChartCtx = document.getElementById('performanceTrendChart')?.getContext('2d');
    const hrvRecoveryTrendChartCtx = document.getElementById('hrvRecoveryTrendChart')?.getContext('2d');
    const individualHrChartCtx = document.getElementById('individualHrChart')?.getContext('2d');
    const individualHrvChartCtx = document.getElementById('individualHrvChart')?.getContext('2d');
    const biometricsTrendChartCtx = document.getElementById('biometricsTrendChart')?.getContext('2d'); // Nieuw
    const sportActivitiesTrendChartCtx = document.getElementById('sportActivitiesTrendChart')?.getContext('2d'); // Nieuw
    const financeTrendChartCtx = document.getElementById('financeTrendChart')?.getContext('2d'); // Nieuw
    const sleepTrendChartCtx = document.getElementById('sleepTrendChart')?.getContext('2d'); // Nieuw

    const togglePerformanceChartCheckbox = document.getElementById('togglePerformanceChart');
    const performanceChartContainer = document.getElementById('performanceChartContainer');
    const toggleHrvChartCheckbox = document.getElementById('toggleHrvChart');
    const hrvChartContainer = document.getElementById('hrvChartContainer');
    const toggleIndividualHrChartCheckbox = document.getElementById('toggleIndividualHrChart');
    const individualHrChartContainer = document.getElementById('individualHrChartContainer');
    const toggleIndividualHrvChartCheckbox = document.getElementById('toggleIndividualHrvChart');
    const individualHrvChartContainer = document.getElementById('individualHrvChartContainer');
    const toggleBiometricsChartCheckbox = document.getElementById('toggleBiometricsChart'); // Nieuw
    const biometricsChartContainer = document.getElementById('biometricsChartContainer'); // Nieuw
    const toggleSportActivitiesChartCheckbox = document.getElementById('toggleSportActivitiesChart'); // Nieuw
    const sportActivitiesChartContainer = document.getElementById('sportActivitiesChartContainer'); // Nieuw
    const toggleFinanceChartCheckbox = document.getElementById('toggleFinanceChart'); // Nieuw
    const financeChartContainer = document.getElementById('financeChartContainer'); // Nieuw
    const toggleSleepChartCheckbox = document.getElementById('toggleSleepChart'); // Nieuw
    const sleepChartContainer = document.getElementById('sleepChartContainer'); // Nieuw


    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    // Helper function to get data from the last month
    function filterDataLastMonth(data, dateField) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return data.filter(item => new Date(item[dateField]) >= oneMonthAgo);
    }

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
            const hrvData = filterDataLastMonth(trainingSessions, 'date')
                .filter(session => typeof session.rmssd === 'number' && !isNaN(session.rmssd));

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

    // Functie om de individuele hartslag trendgrafiek te initialiseren/updaten
    async function initIndividualHrChart() {
        if (individualHrChart) {
            individualHrChart.destroy();
        }
        if (individualHrChartCtx) {
            const trainingSessions = await getAllData('trainingSessions');
            const hrDataFiltered = filterDataLastMonth(trainingSessions, 'date')
                .filter(session => typeof session.avgHr === 'number' && !isNaN(session.avgHr));

            const labels = hrDataFiltered.map(session => new Date(session.date).toLocaleDateString());
            const avgHrValues = hrDataFiltered.map(session => session.avgHr);

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
        if (individualHrvChartCtx) {
            const trainingSessions = await getAllData('trainingSessions');
            const hrvDataFiltered = filterDataLastMonth(trainingSessions, 'date')
                .filter(session => typeof session.rmssd === 'number' && !isNaN(session.rmssd));

            const labels = hrvDataFiltered.map(session => new Date(session.date).toLocaleDateString());
            const rmssdValues = hrvDataFiltered.map(session => session.rmssd);

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

    // NIEUWE FUNCTIE: Biometrie Trendgrafiek
    async function initBiometricsTrendChart() {
        if (biometricsTrendChart) {
            biometricsTrendChart.destroy();
        }
        if (biometricsTrendChartCtx) {
            // Opmerking: Voor echte biometrie trends is een geschiedenis van userProfile data nodig.
            // Momenteel slaat userProfile alleen de meest recente data op.
            // Voor deze implementatie simuleren we data of gebruiken we de laatst bekende.
            // In een productieomgeving zou je een 'userBiometricsHistory' store nodig hebben.
            const userProfiles = await getAllData('userProfile');
            const biometricsData = filterDataLastMonth(userProfiles, 'lastUpdated') // Aanname: 'lastUpdated' veld
                .filter(profile => typeof profile.userWeight === 'number' && !isNaN(profile.userWeight) &&
                                   typeof profile.userFatPercentage === 'number' && !isNaN(profile.userFatPercentage));

            const labels = biometricsData.map(profile => new Date(profile.lastUpdated || profile.dateCreated || new Date()).toLocaleDateString());
            const weights = biometricsData.map(profile => profile.userWeight);
            const fatPercentages = biometricsData.map(profile => profile.userFatPercentage);

            biometricsTrendChart = new Chart(biometricsTrendChartCtx, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Geen data'],
                    datasets: [
                        {
                            label: 'Gewicht (kg)',
                            data: weights.length > 0 ? weights : [0],
                            borderColor: '#c084fc',
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Vetpercentage (%)',
                            data: fatPercentages.length > 0 ? fatPercentages : [0],
                            borderColor: '#facc15',
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Waarde'
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

    // NIEUWE FUNCTIE: Sportactiviteiten Trendgrafiek
    async function initSportActivitiesTrendChart() {
        if (sportActivitiesTrendChart) {
            sportActivitiesTrendChart.destroy();
        }
        if (sportActivitiesTrendChartCtx) {
            const sportActivities = await getAllData('sportData'); // Aanname: 'sportData' store
            const activitiesLastMonth = filterDataLastMonth(sportActivities, 'sportDate');

            // Aggregeer activiteiten per dag of week
            const aggregatedData = {};
            activitiesLastMonth.forEach(activity => {
                const date = new Date(activity.sportDate).toISOString().split('T')[0]; // Dag
                aggregatedData[date] = (aggregatedData[date] || 0) + (parseFloat(activity.sportDuration) || 0);
            });

            const labels = Object.keys(aggregatedData).sort();
            const data = labels.map(date => aggregatedData[date]);

            sportActivitiesTrendChart = new Chart(sportActivitiesTrendChartCtx, {
                type: 'bar', // Kan ook line zijn afhankelijk van voorkeur
                data: {
                    labels: labels.length > 0 ? labels : ['Geen data'],
                    datasets: [{
                        label: 'Totale Sportduur (min/dag)',
                        data: data.length > 0 ? data : [0],
                        backgroundColor: '#2dd4bf',
                        borderColor: '#2dd4bf',
                        borderWidth: 1
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
                                text: 'Duur (min)'
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

    // NIEUWE FUNCTIE: Financiële Overzicht Trends
    async function initFinanceTrendChart() {
        if (financeTrendChart) {
            financeTrendChart.destroy();
        }
        if (financeTrendChartCtx) {
            const transactions = await getAllData('finance');
            const transactionsLastMonth = filterDataLastMonth(transactions, 'date');

            const aggregatedIncome = {};
            const aggregatedExpense = {};

            transactionsLastMonth.forEach(trans => {
                const date = new Date(trans.date).toISOString().split('T')[0];
                if (trans.type === 'income') {
                    aggregatedIncome[date] = (aggregatedIncome[date] || 0) + (parseFloat(trans.amount) || 0);
                } else if (trans.type === 'expense') {
                    aggregatedExpense[date] = (aggregatedExpense[date] || 0) + (parseFloat(trans.amount) || 0);
                }
            });

            const allDates = [...new Set([...Object.keys(aggregatedIncome), ...Object.keys(aggregatedExpense)])].sort();
            const incomeData = allDates.map(date => aggregatedIncome[date] || 0);
            const expenseData = allDates.map(date => aggregatedExpense[date] || 0);

            financeTrendChart = new Chart(financeTrendChartCtx, {
                type: 'line',
                data: {
                    labels: allDates.length > 0 ? allDates : ['Geen data'],
                    datasets: [
                        {
                            label: 'Inkomen (€)',
                            data: incomeData.length > 0 ? incomeData : [0],
                            borderColor: '#34d399',
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Uitgaven (€)',
                            data: expenseData.length > 0 ? expenseData : [0],
                            borderColor: '#ef4444',
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Bedrag (€)'
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

    // NIEUWE FUNCTIE: Slaap Progressie
    async function initSleepTrendChart() {
        if (sleepTrendChart) {
            sleepTrendChart.destroy();
        }
        if (sleepTrendChartCtx) {
            // Opmerking: Voor slaapdata is een 'sleepData' store nodig met dagelijkse/wekelijkse logs.
            // Voor nu gebruiken we placeholder data of de laatst bekende.
            const sleepData = await getAllData('sleepData'); // Aanname: 'sleepData' store
            const sleepDataLastMonth = filterDataLastMonth(sleepData, 'date'); // Aanname: 'date' veld

            const labels = sleepDataLastMonth.map(item => new Date(item.date).toLocaleDateString());
            const sleepScores = sleepDataLastMonth.map(item => parseFloat(item.score) || 0); // Aanname: 'score' veld

            sleepTrendChart = new Chart(sleepTrendChartCtx, {
                type: 'line',
                data: {
                    labels: labels.length > 0 ? labels : ['Geen data'],
                    datasets: [{
                        label: 'Gemiddelde Slaapscore',
                        data: sleepScores.length > 0 ? sleepScores : [0],
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
                            beginAtZero: true,
                            min: 0,
                            max: 10, // Aanname: slaapscore van 0-10
                            title: {
                                display: true,
                                text: 'Slaapscore'
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
        if (toggleIndividualHrvChartCheckbox.checked) {
            individualHrvChartContainer.style.display = 'block';
        } else {
            individualHrvChartContainer.style.display = 'none';
        }
    }

    // NIEUWE CHECKBOX LISTENERS
    if (toggleBiometricsChartCheckbox) {
        toggleBiometricsChartCheckbox.addEventListener('change', async () => {
            if (toggleBiometricsChartCheckbox.checked) {
                biometricsChartContainer.style.display = 'block';
                await initBiometricsTrendChart();
            } else {
                biometricsChartContainer.style.display = 'none';
                if (biometricsTrendChart) {
                    biometricsTrendChart.destroy();
                }
            }
        });
        if (toggleBiometricsChartCheckbox.checked) {
            biometricsChartContainer.style.display = 'block';
            await initBiometricsTrendChart();
        } else {
            biometricsChartContainer.style.display = 'none';
        }
    }

    if (toggleSportActivitiesChartCheckbox) {
        toggleSportActivitiesChartCheckbox.addEventListener('change', async () => {
            if (toggleSportActivitiesChartCheckbox.checked) {
                sportActivitiesChartContainer.style.display = 'block';
                await initSportActivitiesTrendChart();
            } else {
                sportActivitiesChartContainer.style.display = 'none';
                if (sportActivitiesTrendChart) {
                    sportActivitiesTrendChart.destroy();
                }
            }
        });
        if (toggleSportActivitiesChartCheckbox.checked) {
            sportActivitiesChartContainer.style.display = 'block';
            await initSportActivitiesTrendChart();
        } else {
            sportActivitiesChartContainer.style.display = 'none';
        }
    }

    if (toggleFinanceChartCheckbox) {
        toggleFinanceChartCheckbox.addEventListener('change', async () => {
            if (toggleFinanceChartCheckbox.checked) {
                financeChartContainer.style.display = 'block';
                await initFinanceTrendChart();
            } else {
                financeChartContainer.style.display = 'none';
                if (financeTrendChart) {
                    financeTrendChart.destroy();
                }
            }
        });
        if (toggleFinanceChartCheckbox.checked) {
            financeChartContainer.style.display = 'block';
            await initFinanceTrendChart();
        } else {
            financeChartContainer.style.display = 'none';
        }
    }

    if (toggleSleepChartCheckbox) {
        toggleSleepChartCheckbox.addEventListener('change', async () => {
            if (toggleSleepChartCheckbox.checked) {
                sleepChartContainer.style.display = 'block';
                await initSleepTrendChart();
            } else {
                sleepChartContainer.style.display = 'none';
                if (sleepTrendChart) {
                    sleepTrendChart.destroy();
                }
            }
        });
        if (toggleSleepChartCheckbox.checked) {
            sleepChartContainer.style.display = 'block';
            await initSleepTrendChart();
        } else {
            sleepChartContainer.style.display = 'none';
        }
    }

    // PDF generatie functionaliteit (ongewijzigd)
    if (downloadPdfBtn) {
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            console.error("jsPDF of html2canvas is niet geladen. Zorg ervoor dat de scripts in index.html staan.");
            showNotification("Fout: PDF-export bibliotheken niet geladen. Controleer index.html.", "error");
            downloadPdfBtn.disabled = true;
        } else {
            downloadPdfBtn.addEventListener('click', async () => {
                showNotification("Rapport wordt voorbereid voor PDF-export...", "info", 3000);
                const element = document.querySelector('.p-4');

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
                    if (topNav) topNav.style.display = 'flex';
                    if (bottomNav) bottomNav.style.display = 'flex';
                    if (bluetoothWidget) bluetoothWidget.style.display = 'flex';
                    if (openBluetoothWidgetBtn) openBluetoothWidgetBtn.style.display = 'flex';
                }
            });
        }
    }

    // Roep algemene laadfuncties aan
    await loadSessionReports();
    await loadPerformanceOverview();
}