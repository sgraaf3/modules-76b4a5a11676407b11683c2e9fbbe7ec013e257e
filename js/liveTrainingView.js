// Bestand: js/liveTrainingView.js
// Bevat logica voor het uitvoeren en opslaan van live trainingsmetingen, inclusief uitgebreide statistieken en grafieken.

import { BluetoothController } from '../bluetooth.js';
import { putData, getData, getOrCreateUserId } from '../database.js';
import { showNotification } from './notifications.js';

// Chart instances
let hrCombinedChart; // Nieuwe naam voor de gecombineerde HR/RR/Breath grafiek
let rrChart; // Dit blijft een aparte RR grafiek (ongeschaald)
let rrHistogramChart;
let poincarePlotChart;
let powerSpectrumChart;

// Data buffers for charts and calculations
let hrDataBuffer = [];
let rrIntervalsBuffer = []; // Stores all filtered RR intervals for analysis
let breathRateBuffer = []; // Buffer for breath rate data
let timestampsBuffer = [];

// Session data for saving
let currentSessionData = {
    userId: '',
    type: 'training', // Default, will be set by selection
    date: '',
    duration: 0, // in seconds
    avgHr: 0,
    maxHr: 0,
    minHr: 0,
    rmssd: 0,
    sdnn: 0,
    pnn50: 0,
    lfHfRatio: 0,
    vlfPower: 0, // Nieuw
    lfPower: 0,  // Nieuw
    hfPower: 0,  // Nieuw
    caloriesBurned: 0,
    hrZonesTime: { // Time spent in each HR zone (in seconds)
        'Resting': 0,
        'Warmup': 0,
        'Endurance 1': 0,
        'Endurance 2': 0,
        'Endurance 3': 0,
        'Intensive 1': 0,
        'Intensive 2': 0,
        'Cooldown': 0,
        // Nieuwe zones voor HRV-gebaseerde rust
        'Relaxed': 0,
        'Rest': 0,
        'Active Low': 0,
        'Active High': 0,
        'Transition Zone': 0
    },
    rpe: null, // Rate of Perceived Exertion
    wellnessScores: { recovery: '--', strain: '--', sleep: '--', conditioning: '--' }, // Placeholders
    intensityScore: '--', // Placeholder
    breathData: { lastCycle: '--', avgTotalCycles: '--', currentBf: '--' }, // Placeholders
    rawHrData: [], // Full HR data for session
    rawRrData: [], // Full filtered RR data for session
    rawBreathData: [], // Full breath data for session
    timestamps: [] // Full timestamps for session
};

let measurementStartTime;
let measurementInterval;
let hrZoneInterval; // Interval to update HR zone times

// showViewCallback is passed from app.js for navigation
export async function initLiveTrainingView(showViewCallback) {
    console.log("Live Training View geïnitialiseerd.");

    const currentAppUserId = getOrCreateUserId();
    currentSessionData.userId = currentAppUserId; // Set user ID for the session

    const bluetoothController = new BluetoothController();

    // UI elements
    const measurementTypeSelect = document.getElementById('measurementTypeSelect');
    const liveHrDisplay = document.getElementById('liveHrDisplay');
    const liveHrZoneDisplay = document.getElementById('liveHrZoneDisplay');
    const liveAvgRrDisplay = document.getElementById('liveAvgRrDisplay');
    const liveRmssdDisplay = document.getElementById('liveRmssdDisplay');
    const liveBreathRateDisplay = document.getElementById('liveBreathRateDisplay');
    const liveTimerDisplay = document.getElementById('liveTimerDisplay');
    const startMeasurementBtnLive = document.getElementById('startMeasurementBtnLive');
    const stopMeasurementBtnLive = document.getElementById('stopMeasurementBtnLive');
    const saveMeasurementBtn = document.getElementById('saveMeasurementBtn');
    const inputRpe = document.getElementById('inputRpe');

    // Summary displays
    const summaryAvgHr = document.getElementById('summaryAvgHr');
    const summaryMaxHr = document.getElementById('summaryMaxHr');
    const summaryMinHr = document.getElementById('summaryMinHr');
    const summaryCurrentHr = document.getElementById('summaryCurrentHr');
    const hrvRecoveryStatus = document.getElementById('hrvRecoveryStatus');
    const summaryRmssd = document.getElementById('summaryRmssd');
    const summarySdnn = document.getElementById('summarySdnn');
    const summaryPnn50 = document.getElementById('summaryPnn50');
    const summaryLfHf = document.getElementById('summaryLfHf');
    const scoreRecovery = document.getElementById('scoreRecovery');
    const scoreStrain = document.getElementById('scoreStrain');
    const scoreSleep = document.getElementById('scoreSleep');
    const scoreConditioning = document.getElementById('scoreConditioning');
    const scoreIntensity = document.getElementById('scoreIntensity');
    const hrToAt = document.getElementById('hrToAt');
    const hrToRestHr = document.getElementById('hrToRestHr');
    const breathLastCycle = document.getElementById('breathLastCycle');
    const breathAvgTotalCycles = document.getElementById('breathAvgTotalCycles');
    const breathCurrentBf = document.getElementById('breathCurrentBf');

    // Chart contexts
    const hrCombinedChartCtx = document.getElementById('hrChart')?.getContext('2d'); // Gebruik hrChart voor de gecombineerde grafiek
    const rrChartCtx = document.getElementById('rrChart')?.getContext('2d'); // Aparte grafiek voor ongeschaalde RR
    const rrHistogramChartCtx = document.getElementById('rrHistogramChart')?.getContext('2d');
    const poincarePlotChartCtx = document.getElementById('poincarePlotChart')?.getContext('2d');
    const powerSpectrumChartCtx = document.getElementById('powerSpectrumChart')?.getContext('2d');

    // User profile data (for HR zones)
    let userProfile = await getData('userProfile', currentAppUserId);
    let userBaseAtHR = userProfile ? parseFloat(userProfile.userBaseAtHR) : 0;
    let userRestHR = userProfile ? parseFloat(userProfile.userRestHR) : 0;

    // --- Helper Functions ---

    // Formats seconds into MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    // Updates the timer display and total duration
    function updateTimer() {
        if (measurementStartTime) {
            const elapsedSeconds = Math.floor((Date.now() - measurementStartTime) / 1000);
            if (liveTimerDisplay) liveTimerDisplay.textContent = formatTime(elapsedSeconds);
            currentSessionData.duration = elapsedSeconds;
        }
    }

    // Updates time spent in each HR zone
    function updateHrZoneTimes() {
        if (hrDataBuffer.length > 0) {
            const currentHr = hrDataBuffer[hrDataBuffer.length - 1];
            let zone;

            // Logica: Als HR onder 65% van AT valt, gebruik RMSSD-gebaseerde zones
            if (userBaseAtHR > 0 && currentHr < (userBaseAtHR * 0.65)) {
                zone = getHrvBasedRestZone(currentSessionData.rmssd); // Gebruik de berekende RMSSD
            } else if (userBaseAtHR > 0) {
                zone = getHrZone(currentHr, userBaseAtHR); // Gebruik bestaande AT-gebaseerde zones
            } else {
                zone = 'Resting'; // Fallback als AT niet beschikbaar is
            }

            // Update de teller voor de huidige zone
            if (currentSessionData.hrZonesTime[zone] !== undefined) {
                currentSessionData.hrZonesTime[zone]++; // Increment by 1 second
            }

            // Update UI met null checks voor alle zones
            if (document.getElementById('zoneTimeResting')) document.getElementById('zoneTimeResting').textContent = formatTime(currentSessionData.hrZonesTime['Resting']);
            if (document.getElementById('zoneTimeWarmup')) document.getElementById('zoneTimeWarmup').textContent = formatTime(currentSessionData.hrZonesTime['Warmup']);
            if (document.getElementById('zoneTimeEndurance1')) document.getElementById('zoneTimeEndurance1').textContent = formatTime(currentSessionData.hrZonesTime['Endurance 1']);
            if (document.getElementById('zoneTimeEndurance2')) document.getElementById('zoneTimeEndurance2').textContent = formatTime(currentSessionData.hrZonesTime['Endurance 2']);
            if (document.getElementById('zoneTimeEndurance3')) document.getElementById('zoneTimeEndurance3').textContent = formatTime(currentSessionData.hrZonesTime['Endurance 3']);
            if (document.getElementById('zoneTimeIntensive1')) document.getElementById('zoneTimeIntensive1').textContent = formatTime(currentSessionData.hrZonesTime['Intensive 1']);
            if (document.getElementById('zoneTimeIntensive2')) document.getElementById('zoneTimeIntensive2').textContent = formatTime(currentSessionData.hrZonesTime['Intensive 2']);
            if (document.getElementById('zoneTimeCooldown')) document.getElementById('zoneTimeCooldown').textContent = formatTime(currentSessionData.hrZonesTime['Cooldown']);
            // Update UI voor de nieuwe HRV-gebaseerde zones
            if (document.getElementById('zoneTimeRelaxed')) document.getElementById('zoneTimeRelaxed').textContent = formatTime(currentSessionData.hrZonesTime['Relaxed'] || 0);
            if (document.getElementById('zoneTimeRest')) document.getElementById('zoneTimeRest').textContent = formatTime(currentSessionData.hrZonesTime['Rest'] || 0);
            if (document.getElementById('zoneTimeActiveLow')) document.getElementById('zoneTimeActiveLow').textContent = formatTime(currentSessionData.hrZonesTime['Active Low'] || 0);
            if (document.getElementById('zoneTimeActiveHigh')) document.getElementById('zoneTimeActiveHigh').textContent = formatTime(currentSessionData.hrZonesTime['Active High'] || 0);
            if (document.getElementById('zoneTimeTransitionZone')) document.getElementById('zoneTimeTransitionZone').textContent = formatTime(currentSessionData.hrZonesTime['Transition Zone'] || 0);
        }
    }

    // NIEUWE FUNCTIE: Bepaalt de HR-zone op basis van RMSSD
    function getHrvBasedRestZone(rmssd) {
        // Specifieke numerieke drempelwaarden voor RMSSD
        const RMSSD_RELAXED_THRESHOLD = 70;
        const RMSSD_REST_THRESHOLD = 50;
        const RMSSD_ACTIVE_LOW_THRESHOLD = 25;
        const RMSSD_ACTIVE_HIGH_THRESHOLD = 10;

        if (rmssd >= RMSSD_RELAXED_THRESHOLD) return 'Relaxed';
        if (rmssd >= RMSSD_REST_THRESHOLD) return 'Rest';
        if (rmssd >= RMSSD_ACTIVE_LOW_THRESHOLD) return 'Active Low';
        if (rmssd >= RMSSD_ACTIVE_HIGH_THRESHOLD) return 'Active High';
        return 'Transition Zone'; // RMSSD < 10
    }


    // Calculates HRV metrics (SDNN, pNN50)
    function calculateHrvMetrics(rrIntervals) {
        if (rrIntervals.length < 2) return { rmssd: 0, sdnn: 0, pnn50: 0 };

        let sumOfDifferencesSquared = 0;
        let nn50Count = 0; // Number of pairs of successive NNs that differ by more than 50 ms
        let previousRr = rrIntervals[0];

        for (let i = 1; i < rrIntervals.length; i++) {
            const currentRr = rrIntervals[i];
            sumOfDifferencesSquared += Math.pow(currentRr - previousRr, 2);
            if (Math.abs(currentRr - previousRr) > 50) {
                nn50Count++;
            }
            previousRr = currentRr;
        }

        const rmssd = Math.sqrt(sumOfDifferencesSquared / (rrIntervals.length - 1));
        const sdnn = Math.sqrt(rrIntervals.reduce((sum, val) => sum + Math.pow(val - (rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length), 2), 0) / (rrIntervals.length - 1));
        const pnn50 = (nn50Count / (rrIntervals.length - 1)) * 100;

        return { rmssd: rmssd, sdnn: sdnn, pnn50: pnn50 };
    }

    // Determines HRV Recovery Status based on RMSSD
    function getHrvRecoveryStatus(rmssd) {
        if (rmssd === 0) return '--';
        // Aangepaste zones voor herstelstatus op basis van RMSSD
        if (rmssd >= 50) return 'Uitstekend Herstel (RMSSD > 50)'; // Relaxed
        if (rmssd >= 25) return 'Goed Herstel (RMSSD 25-50)';    // Rest
        if (rmssd >= 10) return 'Redelijk Herstel (RMSSD 10-25)'; // Light Active
        if (rmssd < 10) return 'Beperkt Herstel (RMSSD < 10)';  // Active
        return '--';
    }

    // Updates all summary statistics in the UI
    function updateSummaryStatistics() {
        // HR Summary
        if (hrDataBuffer.length > 0) {
            const avgHr = hrDataBuffer.reduce((sum, hr) => sum + hr, 0) / hrDataBuffer.length;
            const maxHr = Math.max(...hrDataBuffer);
            const minHr = Math.min(...hrDataBuffer);
            const currentHr = hrDataBuffer[hrDataBuffer.length - 1];

            if (summaryAvgHr) summaryAvgHr.textContent = avgHr.toFixed(0);
            if (summaryMaxHr) summaryMaxHr.textContent = maxHr.toFixed(0);
            if (summaryMinHr) summaryMinHr.textContent = minHr.toFixed(0);
            if (summaryCurrentHr) summaryCurrentHr.textContent = currentHr.toFixed(0);

            currentSessionData.avgHr = avgHr;
            currentSessionData.maxHr = maxHr;
            currentSessionData.minHr = minHr;

            // Intensity Scores
            if (userBaseAtHR > 0 && hrToAt) {
                hrToAt.textContent = ((currentHr / userBaseAtHR) * 100).toFixed(0);
            }
            if (userRestHR > 0 && hrToRestHr) {
                hrToRestHr.textContent = ((currentHr / userRestHR) * 100).toFixed(0);
            }
        } else {
            if (summaryAvgHr) summaryAvgHr.textContent = '--';
            if (summaryMaxHr) summaryMaxHr.textContent = '--';
            if (summaryMinHr) summaryMinHr.textContent = '--';
            if (summaryCurrentHr) summaryCurrentHr.textContent = '--';
            if (hrToAt) hrToAt.textContent = '--';
            if (hrToRestHr) hrToRestHr.textContent = '--';
        }

        // HRV Summary
        if (rrIntervalsBuffer.length > 0) {
            const hrvMetrics = calculateHrvMetrics(rrIntervalsBuffer);
            if (summaryRmssd) summaryRmssd.textContent = hrvMetrics.rmssd.toFixed(2);
            if (summarySdnn) summarySdnn.textContent = hrvMetrics.sdnn.toFixed(2);
            if (summaryPnn50) summaryPnn50.textContent = hrvMetrics.pnn50.toFixed(2);
            if (hrvRecoveryStatus) hrvRecoveryStatus.textContent = getHrvRecoveryStatus(hrvMetrics.rmssd);

            currentSessionData.rmssd = hrvMetrics.rmssd;
            currentSessionData.sdnn = hrvMetrics.sdnn;
            currentSessionData.pnn50 = hrvMetrics.pnn50;

            // Simplified LF/HF Ratio and VLF/LF/HF Power (placeholders/heuristics)
            let vlf = 0;
            let lf = 0;
            let hf = 0;
            let lfHfRatio = 0;

            if (hrvMetrics.rmssd > 0) {
                // Heuristic for power distribution based on RMSSD
                if (hrvMetrics.rmssd > 40) { // High RMSSD, more parasympathetic activity
                    vlf = 10; lf = 30; hf = 60;
                } else if (hrvMetrics.rmssd < 20) { // Low RMSSD, more sympathetic activity / stress
                    vlf = 20; lf = 60; hf = 20;
                } else { // Balanced
                    vlf = 15; lf = 40; hf = 45;
                }
                // Simple ratio (avoid division by zero)
                lfHfRatio = (hf > 0) ? (lf / hf).toFixed(2) : '--';
            }
            if (summaryLfHf) summaryLfHf.textContent = lfHfRatio;
            currentSessionData.lfHfRatio = lfHfRatio;
            currentSessionData.vlfPower = vlf;
            currentSessionData.lfPower = lf;
            currentSessionData.hfPower = hf;

        } else {
            if (summaryRmssd) summaryRmssd.textContent = '--';
            if (summarySdnn) summarySdnn.textContent = '--';
            if (summaryPnn50) summaryPnn50.textContent = '--';
            if (summaryLfHf) summaryLfHf.textContent = '--';
            if (hrvRecoveryStatus) hrvRecoveryStatus.textContent = '--';
            currentSessionData.vlfPower = 0;
            currentSessionData.lfPower = 0;
            currentSessionData.hfPower = 0;
        }

        // Wellness Scores (Placeholders)
        if (scoreRecovery) scoreRecovery.textContent = '--';
        if (scoreStrain) scoreStrain.textContent = '--';
        if (scoreSleep) scoreSleep.textContent = '--';
        if (scoreConditioning) scoreConditioning.textContent = '--';
        currentSessionData.wellnessScores = { recovery: '--', strain: '--', sleep: '--', conditioning: '--' };

        // Intensity Score (Placeholder)
        if (scoreIntensity) scoreIntensity.textContent = '--';
        currentSessionData.intensityScore = '--';

        // Breath Data (Placeholders/Basic)
        if (breathLastCycle && liveBreathRateDisplay) breathLastCycle.textContent = liveBreathRateDisplay.textContent;
        if (breathAvgTotalCycles) breathAvgTotalCycles.textContent = '--';
        if (breathCurrentBf) breathCurrentBf.textContent = '--';
        currentSessionData.breathData = {
            lastCycle: liveBreathRateDisplay ? liveBreathRateDisplay.textContent : '--',
            avgTotalCycles: '--',
            currentBf: '--'
        };
    }


    // --- Chart Initializations ---

    // Combined HR, RR, Breath Chart (using hrChartCtx)
    if (hrCombinedChart) hrCombinedChart.destroy();
    if (hrCombinedChartCtx) {
        hrCombinedChart = new Chart(hrCombinedChartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Hartslag (BPM)',
                        data: [],
                        borderColor: '#f87171', // Rood
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y-hr-breath' // Linker Y-as
                    },
                    {
                        label: 'RR Interval (ms / 100)', // Geschaald label
                        data: [],
                        borderColor: '#a78bfa', // Paars
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y-rr' // Rechter Y-as
                    },
                    {
                        label: 'Ademhaling (BPM)',
                        data: [],
                        borderColor: '#4ade80', // Groen
                        tension: 0.4,
                        fill: false,
                        yAxisID: 'y-hr-breath' // Linker Y-as
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    'y-hr-breath': { // Linker Y-as voor HR en Ademhaling
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        min: 0,
                        max: 200, // Max voor HR/Ademhaling
                        title: { display: true, text: 'HR / Ademhaling (BPM)' }
                    },
                    'y-rr': { // Rechter Y-as voor geschaalde RR
                        type: 'linear',
                        position: 'right',
                        beginAtZero: false, // RR hoeft niet bij 0 te beginnen
                        min: 4, // 400ms / 100
                        max: 12, // 1200ms / 100
                        title: { display: true, text: 'RR (ms / 100)' },
                        grid: {
                            drawOnChartArea: false // Teken geen gridlijnen voor deze as om overlap te voorkomen
                        }
                    },
                    x: { display: false }
                },
                animation: false,
                plugins: { legend: { display: true } }
            }
        });
    }

    // Separate RR Chart (ongeschaald)
    if (rrChart) rrChart.destroy();
    if (rrChartCtx) {
        rrChart = new Chart(rrChartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'RR Interval (ms)',
                    data: [],
                    borderColor: '#a78bfa',
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
                        min: 400,
                        max: 1200,
                        title: { display: true, text: 'RR Interval (ms)' }
                    },
                    x: { display: false }
                },
                animation: false,
                plugins: { legend: { display: true } }
            }
        });
    }


    // RR Histogram Chart
    if (rrHistogramChart) rrHistogramChart.destroy();
    if (rrHistogramChartCtx) {
        rrHistogramChart = new Chart(rrHistogramChartCtx, {
            type: 'bar',
            data: {
                labels: [], // RR interval ranges
                datasets: [{
                    label: 'Frequentie',
                    data: [],
                    backgroundColor: '#4ade80', // Green
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'RR Interval (ms)' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Aantal' },
                        min: 0,
                        max: 50
                    }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    // Poincaré Plot Chart (Scatter Plot)
    if (poincarePlotChart) poincarePlotChart.destroy();
    if (poincarePlotChartCtx) {
        poincarePlotChart = new Chart(poincarePlotChartCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Poincaré Plot',
                    data: [], // { x: RR(n), y: RR(n+1) }
                    backgroundColor: '#facc15', // Yellow
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'RR(n) (ms)' },
                        min: 400,
                        max: 1200
                    },
                    y: {
                        title: { display: true, text: 'RR(n+1) (ms)' },
                        min: 400,
                        max: 1200
                    }
                },
                plugins: { legend: { display: true } }
            }
        });
    }

    // Power Spectrum Chart (Bar Graph - simplified representation of VLF, LF, HF)
    if (powerSpectrumChart) powerSpectrumChart.destroy();
    if (powerSpectrumChartCtx) {
        powerSpectrumChart = new Chart(powerSpectrumChartCtx, {
            type: 'bar',
            data: {
                labels: ['VLF (Very Low Freq)', 'LF (Low Freq)', 'HF (High Freq)'], // Drie frequentiebanden
                datasets: [{
                    label: 'Relatieve Kracht',
                    data: [0, 0, 0], // Placeholder data voor VLF, LF, HF
                    backgroundColor: ['#c084fc', '#22d3ee', '#f97316'] // Kleuren voor VLF, LF, HF
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Frequentieband' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Relatieve Kracht' },
                        min: 0,
                        max: 100 // Vaste max voor relatieve kracht
                    }
                },
                plugins: { legend: { display: true } }
            }
        });
    }


    // --- Bluetooth Data Handling ---

    bluetoothController.onStateChange = (state, deviceName) => {
        if (state === 'STREAMING') {
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'none';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'block';
            measurementStartTime = Date.now();
            measurementInterval = setInterval(updateTimer, 1000);
            hrZoneInterval = setInterval(updateHrZoneTimes, 1000);
            showNotification(`Bluetooth verbonden met ${deviceName || 'apparaat'}!`, 'success');
            if (measurementTypeSelect) measurementTypeSelect.disabled = true;
        } else if (state === 'ERROR') {
            showNotification('Bluetooth verbinding mislukt of geannuleerd.', 'error');
            clearInterval(measurementInterval);
            clearInterval(hrZoneInterval);
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'block';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'none';
            if (measurementTypeSelect) measurementTypeSelect.disabled = false;
        } else if (state === 'STOPPED') {
            showNotification('Bluetooth meting gestopt.', 'info');
            clearInterval(measurementInterval);
            clearInterval(hrZoneInterval);
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'block';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'none';
            if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'block';
            if (measurementTypeSelect) measurementTypeSelect.disabled = false;
            updateSummaryStatistics();
            updateHrvCharts();
            updatePowerSpectrumChart(); // Update power spectrum on stop
        }
    };

    bluetoothController.onData = async (dataPacket) => {
        const now = new Date().toLocaleTimeString();

        // Update HR data and charts
        if (dataPacket.heartRate) {
            if (liveHrDisplay) liveHrDisplay.textContent = `${dataPacket.heartRate} BPM`;
            hrDataBuffer.push(dataPacket.heartRate);
            timestampsBuffer.push(now);

            // Update HR zone display (live)
            if (userBaseAtHR > 0 && liveHrZoneDisplay) {
                const currentHr = dataPacket.heartRate;
                if (currentHr < (userBaseAtHR * 0.65)) {
                    // Use RMSSD-based zone if HR is below 65% of AT
                    liveHrZoneDisplay.textContent = getHrvBasedRestZone(currentSessionData.rmssd);
                } else {
                    // Use AT-based zone otherwise
                    liveHrZoneDisplay.textContent = getHrZone(currentHr, userBaseAtHR);
                }
            } else if (liveHrZoneDisplay) {
                liveHrZoneDisplay.textContent = '-- Zone';
            }
        }

        // Simulate breath rate if not from sensor
        const simulatedBreathRate = parseFloat((Math.random() * 10 + 12).toFixed(1));
        if (liveBreathRateDisplay) liveBreathRateDisplay.textContent = `${simulatedBreathRate} BPM`;
        breathRateBuffer.push(simulatedBreathRate);


        // Update RR data and HRV charts
        if (dataPacket.filteredRrIntervals && dataPacket.filteredRrIntervals.length > 0) {
            const avgRr = dataPacket.filteredRrIntervals.reduce((sum, val) => sum + val, 0) / dataPacket.filteredRrIntervals.length;
            if (liveAvgRrDisplay) liveAvgRrDisplay.textContent = `${avgRr.toFixed(0)} MS`;

            dataPacket.filteredRrIntervals.forEach(rr => {
                rrIntervalsBuffer.push(rr);
            });

            // Calculate and update RMSSD live
            if (rrIntervalsBuffer.length >= 2) {
                const hrvMetrics = calculateHrvMetrics(rrIntervalsBuffer);
                currentSessionData.rmssd = hrvMetrics.rmssd;
                currentSessionData.sdnn = hrvMetrics.sdnn;
                currentSessionData.pnn50 = hrvMetrics.pnn50;
                if (liveRmssdDisplay) liveRmssdDisplay.textContent = `RMSSD: ${currentSessionData.rmssd.toFixed(2)} MS`;
            } else {
                if (liveRmssdDisplay) liveRmssdDisplay.textContent = `RMSSD: -- MS`;
                currentSessionData.rmssd = 0;
            }

            // Update HRV charts (Histogram, Poincaré) live
            updateHrvCharts();
        }

        // Update Combined HR/RR/Breath chart
        if (hrCombinedChart) {
            hrCombinedChart.data.labels.push(now);
            hrCombinedChart.data.datasets[0].data.push(dataPacket.heartRate); // HR
            hrCombinedChart.data.datasets[1].data.push(dataPacket.filteredRrIntervals[0] ? dataPacket.filteredRrIntervals[0] / 100 : null); // Geschaalde RR
            hrCombinedChart.data.datasets[2].data.push(simulatedBreathRate); // Ademhaling
            const maxDataPoints = 100;
            if (hrCombinedChart.data.labels.length > maxDataPoints) {
                hrCombinedChart.data.labels.shift();
                hrCombinedChart.data.datasets[0].data.shift();
                hrCombinedChart.data.datasets[1].data.shift();
                hrCombinedChart.data.datasets[2].data.shift();
            }
            hrCombinedChart.update();
        }

        // Update separate RR chart (ongeschaald)
        if (rrChart && dataPacket.filteredRrIntervals && dataPacket.filteredRrIntervals.length > 0) {
            dataPacket.filteredRrIntervals.forEach(rr => {
                rrChart.data.labels.push(new Date().toLocaleTimeString());
                rrChart.data.datasets[0].data.push(rr);
            });
            const maxDataPoints = 100;
            if (rrChart.data.labels.length > maxDataPoints) {
                rrChart.data.labels = rrChart.data.labels.slice(-maxDataPoints);
                rrChart.data.datasets[0].data = rrChart.data.datasets[0].data.slice(-maxDataPoints);
            }
            rrChart.update();
        }

        // Update summary statistics live
        updateSummaryStatistics();
    };

    // Function to update HRV specific charts (Histogram, Poincaré)
    function updateHrvCharts() {
        if (rrIntervalsBuffer.length < 2) {
            if (rrHistogramChart) { rrHistogramChart.data.datasets[0].data = []; rrHistogramChart.update(); }
            if (poincarePlotChart) { poincarePlotChart.data.datasets[0].data = []; poincarePlotChart.update(); }
            return;
        }

        // Histogram
        if (rrHistogramChart) {
            const bins = {};
            rrIntervalsBuffer.forEach(rr => {
                const bin = Math.floor(rr / 10) * 10; // Bin every 10ms
                bins[bin] = (bins[bin] || 0) + 1;
            });
            const sortedBins = Object.keys(bins).sort((a, b) => parseInt(a) - parseInt(b));
            rrHistogramChart.data.labels = sortedBins.map(bin => `${bin}-${parseInt(bin) + 9}`);
            rrHistogramChart.data.datasets[0].data = sortedBins.map(bin => bins[bin]);
            rrHistogramChart.update();
        }

        // Poincaré Plot
        if (poincarePlotChart) {
            const poincareData = [];
            for (let i = 0; i < rrIntervalsBuffer.length - 1; i++) {
                poincareData.push({ x: rrIntervalsBuffer[i], y: rrIntervalsBuffer[i + 1] });
            }
            poincarePlotChart.data.datasets[0].data = poincareData;
            poincarePlotChart.update();
        }
    }

    // Function to update Power Spectrum Chart
    function updatePowerSpectrumChart() {
        if (powerSpectrumChart && currentSessionData.vlfPower !== undefined) {
            powerSpectrumChart.data.datasets[0].data = [
                currentSessionData.vlfPower,
                currentSessionData.lfPower,
                currentSessionData.hfPower
            ];
            powerSpectrumChart.update();
        }
    }


    // --- Event Listeners ---

    // Set initial measurement type
    if (measurementTypeSelect) {
        currentSessionData.type = measurementTypeSelect.value;
        measurementTypeSelect.addEventListener('change', (event) => {
            currentSessionData.type = event.target.value;
            showNotification(`Metingstype ingesteld op: ${event.target.options[event.target.selectedIndex].text}`, 'info', 2000);
        });
    }

    if (startMeasurementBtnLive) {
        startMeasurementBtnLive.addEventListener('click', () => {
            // Reset all data buffers and session data
            hrDataBuffer = [];
            rrIntervalsBuffer = [];
            breathRateBuffer = [];
            timestampsBuffer = [];
            currentSessionData = {
                userId: currentAppUserId,
                type: currentSessionData.type, // Keep selected type
                date: '',
                duration: 0,
                avgHr: 0,
                maxHr: 0,
                minHr: 0,
                rmssd: 0,
                sdnn: 0,
                pnn50: 0,
                lfHfRatio: 0,
                vlfPower: 0,
                lfPower: 0,
                hfPower: 0,
                caloriesBurned: 0,
                hrZonesTime: {
                    'Resting': 0, 'Warmup': 0, 'Endurance 1': 0, 'Endurance 2': 0, 'Endurance 3': 0,
                    'Intensive 1': 0, 'Intensive 2': 0, 'Cooldown': 0,
                    'Relaxed': 0, 'Rest': 0, 'Active Low': 0, 'Active High': 0, 'Transition Zone': 0
                },
                rpe: null,
                wellnessScores: { recovery: '--', strain: '--', sleep: '--', conditioning: '--' },
                intensityScore: '--',
                breathData: { lastCycle: '--', avgTotalCycles: '--', currentBf: '--' },
                rawHrData: [],
                rawRrData: [],
                rawBreathData: [],
                timestamps: []
            };

            // Reset UI elements
            if (liveTimerDisplay) liveTimerDisplay.textContent = '00:00';
            if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'none';
            if (inputRpe) inputRpe.value = ''; // Clear RPE input
            updateSummaryStatistics(); // Clear summary displays

            // Reset charts
            if (hrCombinedChart) { hrCombinedChart.data.labels = []; hrCombinedChart.data.datasets[0].data = []; hrCombinedChart.data.datasets[1].data = []; hrCombinedChart.data.datasets[2].data = []; hrCombinedChart.update(); }
            if (rrChart) { rrChart.data.labels = []; rrChart.data.datasets[0].data = []; rrChart.update(); }
            if (rrHistogramChart) { rrHistogramChart.data.labels = []; rrHistogramChart.data.datasets[0].data = []; rrHistogramChart.update(); }
            if (poincarePlotChart) { poincarePlotChart.data.datasets[0].data = []; poincarePlotChart.update(); }
            if (powerSpectrumChart) { powerSpectrumChart.data.datasets[0].data = [0,0,0]; powerSpectrumChart.update(); }


            bluetoothController.setPreset(currentSessionData.type); // Use the selected measurement type
            bluetoothController.connect();
        });
    }

    if (stopMeasurementBtnLive) {
        stopMeasurementBtnLive.addEventListener('click', () => {
            bluetoothController.disconnect();
            // Finalize calculations after stopping
            if (hrDataBuffer.length > 0) {
                currentSessionData.avgHr = hrDataBuffer.reduce((sum, hr) => sum + hr, 0) / hrDataBuffer.length;
                currentSessionData.maxHr = Math.max(...hrDataBuffer);
                currentSessionData.minHr = Math.min(...hrDataBuffer);
                currentSessionData.caloriesBurned = (currentSessionData.avgHr * currentSessionData.duration / 60 / 10).toFixed(0); // Example calculation
            }
            // Populate raw data for saving
            currentSessionData.rawHrData = [...hrDataBuffer];
            currentSessionData.rawRrData = [...rrIntervalsBuffer];
            currentSessionData.rawBreathData = [...breathRateBuffer]; // Opslaan van ademhalingsdata
            currentSessionData.timestamps = [...timestampsBuffer];

            updateSummaryStatistics(); // Final update of summaries
            updateHrvCharts(); // Final update of HRV charts
            updatePowerSpectrumChart(); // Final update of power spectrum
        });
    }

    if (saveMeasurementBtn) {
        saveMeasurementBtn.addEventListener('click', async () => {
            if (currentSessionData.duration > 0 && hrDataBuffer.length > 0) {
                // Capture RPE
                currentSessionData.rpe = inputRpe && inputRpe.value ? parseInt(inputRpe.value) : null;

                // Set date
                currentSessionData.date = new Date().toISOString().split('T')[0];

                try {
                    await putData('trainingSessions', currentSessionData);
                    showNotification('Meting succesvol opgeslagen!', 'success');
                    if (showViewCallback) {
                        showViewCallback('trainingReportsView'); // Navigate to reports page
                    }
                } catch (error) {
                    console.error("Fout bij opslaan meting:", error);
                    showNotification('Fout bij opslaan meting.', 'error');
                }
            } else {
                showNotification('Geen metingsdata om op te slaan. Start en stop een meting.', 'warning');
            }
        });
    }

    // Initial state: hide save button
    if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'none';

    // --- Helper for HR Zone Calculation (can be moved to a utility file if needed elsewhere) ---
    function getHrZone(currentHR, at) {
        if (currentHR >= at * 1.1) return 'Intensive 2';
        if (currentHR >= at * 1.05) return 'Intensive 1';
        if (currentHR >= at * 0.95) return 'Endurance 3';
        if (currentHR >= at * 0.85) return 'Endurance 2';
        if (currentHR >= at * 0.75) return 'Endurance 1';
        if (currentHR >= at * 0.7 + 5) return 'Cooldown';
        if (currentHR >= at * 0.7) return 'Warmup';
        return 'Resting';
    }
}
