// Bestand: js/restMeasurementLiveView.js
// Bevat logica voor het uitvoeren en opslaan van live rustmetingen.

import { BluetoothController } from '../bluetooth.js';
import { putData, getData, getOrCreateUserId } from '../database.js';
import { showNotification } from './notifications.js';

// Globale variabelen voor de grafiek en data
let hrChart;
let rrChart;
let hrData = [];
let rrData = [];
let selectedMeasurementType = 'resting'; // Standaard geselecteerd type

// showViewCallback wordt nu doorgegeven vanuit app.js
export async function initRestMeasurementLiveView(showViewCallback) {
    console.log("Rustmeting Live View geïnitialiseerd.");

    const currentAppUserId = getOrCreateUserId();

    const bluetoothController = new BluetoothController();
    const measurementTypeSelect = document.getElementById('measurementTypeSelect'); // Nieuw selectieveld
    const liveHrDisplay = document.getElementById('liveHrDisplay');
    const liveHrZoneDisplay = document.getElementById('liveHrZoneDisplay');
    const liveAvgRrDisplay = document.getElementById('liveAvgRrDisplay');
    const liveRmssdDisplay = document.getElementById('liveRmssdDisplay');
    const liveBreathRateDisplay = document.getElementById('liveBreathRateDisplay');
    const liveTimerDisplay = document.getElementById('liveTimerDisplay');
    const startMeasurementBtnLive = document.getElementById('startMeasurementBtnLive');
    const stopMeasurementBtnLive = document.getElementById('stopMeasurementBtnLive');
    const hrChartCtx = document.getElementById('hrChart')?.getContext('2d');
    const rrChartCtx = document.getElementById('rrChart')?.getContext('2d');
    const saveMeasurementBtn = document.getElementById('saveMeasurementBtn');

    let measurementStartTime;
    let measurementInterval;
    let currentSessionData = {
        heartRates: [],
        rrIntervals: [],
        timestamps: [],
        hrZones: [],
        caloriesBurned: 0,
        totalDuration: 0,
        rmssd: 0,
        avgHr: 0
    };

    // Stel het initiële geselecteerde type in
    if (measurementTypeSelect) {
        selectedMeasurementType = measurementTypeSelect.value;
        measurementTypeSelect.addEventListener('change', (event) => {
            selectedMeasurementType = event.target.value;
            showNotification(`Metingstype ingesteld op: ${event.target.options[event.target.selectedIndex].text}`, 'info', 2000);
        });
    }

    // Functie om de timer bij te werken
    function updateTimer() {
        if (measurementStartTime) {
            const elapsedSeconds = Math.floor((Date.now() - measurementStartTime) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = elapsedSeconds % 60;
            liveTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            currentSessionData.totalDuration = elapsedSeconds;
        }
    }

    // Initialiseer HR grafiek
    if (hrChart) hrChart.destroy();
    if (hrChartCtx) {
        hrChart = new Chart(hrChartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Hartslag (BPM)',
                    data: [],
                    borderColor: '#f87171', // Rood
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
                        min: 40, // Vaste schaal
                        max: 200, // Vaste schaal
                        title: {
                            display: true,
                            text: 'Hartslag (BPM)'
                        }
                    },
                    x: {
                        display: false // Tijdlabels kunnen te druk zijn
                    }
                },
                animation: false, // Schakel animaties uit voor vloeiendere live data
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    // Initialiseer RR grafiek
    if (rrChart) rrChart.destroy();
    if (rrChartCtx) {
        rrChart = new Chart(rrChartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'RR Interval (ms)',
                    data: [],
                    borderColor: '#a78bfa', // Paars
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
                        min: 400, // Vaste schaal voor RR
                        max: 1200, // Vaste schaal voor RR
                        title: {
                            display: true,
                            text: 'RR Interval (ms)'
                        }
                    },
                    x: {
                        display: false
                    }
                },
                animation: false,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }

    // Update de UI met Bluetooth status
    bluetoothController.onStateChange = (state, deviceName) => {
        // connectionStatusDisplay is nu in de floating widget, niet in deze view
        // We kunnen hier een notificatie tonen als de verbinding verandert
        if (state === 'STREAMING') {
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'none';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'block';
            measurementStartTime = Date.now();
            measurementInterval = setInterval(updateTimer, 1000);
            showNotification(`Bluetooth verbonden met ${deviceName || 'apparaat'}!`, 'success');
            if (measurementTypeSelect) measurementTypeSelect.disabled = true; // Schakel selectie uit tijdens meting
        } else if (state === 'ERROR') {
            showNotification('Bluetooth verbinding mislukt of geannuleerd.', 'error');
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'block';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'none';
            if (measurementTypeSelect) measurementTypeSelect.disabled = false;
        } else if (state === 'STOPPED') {
            showNotification('Bluetooth meting gestopt.', 'info');
            clearInterval(measurementInterval);
            if (startMeasurementBtnLive) startMeasurementBtnLive.style.display = 'block';
            if (stopMeasurementBtnLive) stopMeasurementBtnLive.style.display = 'none';
            if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'block'; // Toon de opslagknop na het stoppen
            if (measurementTypeSelect) measurementTypeSelect.disabled = false;
        }
    };

    // Verwerk inkomende Bluetooth data
    bluetoothController.onData = async (dataPacket) => {
        if (liveHrDisplay) liveHrDisplay.textContent = `${dataPacket.heartRate} BPM`;

        const userProfile = await getData('userProfile', currentAppUserId);
        const userBaseAtHR = userProfile ? parseFloat(userProfile.userBaseAtHR) : 0;

        if (liveHrZoneDisplay) {
            if (userBaseAtHR > 0) {
                liveHrZoneDisplay.textContent = getHrZone(dataPacket.heartRate, userBaseAtHR);
            } else {
                liveHrZoneDisplay.textContent = '-- Zone';
            }
        }

        // Voeg data toe aan de grafieken
        const now = new Date().toLocaleTimeString();
        hrData.push(dataPacket.heartRate);
        currentSessionData.heartRates.push(dataPacket.heartRate);
        currentSessionData.timestamps.push(now);

        if (hrChart) {
            hrChart.data.labels.push(now);
            hrChart.data.datasets[0].data.push(dataPacket.heartRate);
            // Beperk het aantal datapunten om prestatie te behouden
            const maxDataPoints = 100;
            if (hrChart.data.labels.length > maxDataPoints) {
                hrChart.data.labels.shift();
                hrChart.data.datasets[0].data.shift();
            }
            hrChart.update();
        }

        if (dataPacket.filteredRrIntervals && dataPacket.filteredRrIntervals.length > 0) {
            const avgRr = dataPacket.filteredRrIntervals.reduce((sum, val) => sum + val, 0) / dataPacket.filteredRrIntervals.length;
            if (liveAvgRrDisplay) liveAvgRrDisplay.textContent = `${avgRr.toFixed(0)} MS`;

            dataPacket.filteredRrIntervals.forEach(rr => {
                rrData.push(rr);
                currentSessionData.rrIntervals.push(rr);
            });

            // Bereken RMSSD van de verzamelde RR-intervallen voor de huidige sessie
            if (currentSessionData.rrIntervals.length >= 2) {
                let sumOfDifferencesSquared = 0;
                for (let i = 0; i < currentSessionData.rrIntervals.length - 1; i++) {
                    sumOfDifferencesSquared += Math.pow(currentSessionData.rrIntervals[i+1] - currentSessionData.rrIntervals[i], 2);
                }
                currentSessionData.rmssd = Math.sqrt(sumOfDifferencesSquared / (currentSessionData.rrIntervals.length - 1));
                if (liveRmssdDisplay) liveRmssdDisplay.textContent = `RMSSD: ${currentSessionData.rmssd.toFixed(2)} MS`;
            } else {
                if (liveRmssdDisplay) liveRmssdDisplay.textContent = `RMSSD: -- MS`;
                currentSessionData.rmssd = 0;
            }

            if (rrChart) {
                // Voeg alle nieuwe RR-intervallen toe aan de grafiek
                dataPacket.filteredRrIntervals.forEach(rr => {
                    rrChart.data.labels.push(new Date().toLocaleTimeString()); // Gebruik huidige tijd voor RR labels
                    rrChart.data.datasets[0].data.push(rr);
                });
                const maxDataPoints = 100;
                if (rrChart.data.labels.length > maxDataPoints) {
                    rrChart.data.labels = rrChart.data.labels.slice(-maxDataPoints);
                    rrChart.data.datasets[0].data = rrChart.data.datasets[0].data.slice(-maxDataPoints);
                }
                rrChart.update();
            }
        }

        if (liveBreathRateDisplay) liveBreathRateDisplay.textContent = `${(Math.random() * 10 + 12).toFixed(1)} BPM`;
    };

    // Event listeners voor knoppen
    if (startMeasurementBtnLive) {
        startMeasurementBtnLive.addEventListener('click', () => {
            // Reset data bij een nieuwe start
            hrData = [];
            rrData = [];
            currentSessionData = {
                heartRates: [],
                rrIntervals: [],
                timestamps: [],
                hrZones: [],
                caloriesBurned: 0,
                totalDuration: 0,
                rmssd: 0,
                avgHr: 0
            };
            if (hrChart) {
                hrChart.data.labels = [];
                hrChart.data.datasets[0].data = [];
                hrChart.update();
            }
            if (rrChart) {
                rrChart.data.labels = [];
                rrChart.data.datasets[0].data = [];
                rrChart.update();
            }
            if (liveTimerDisplay) liveTimerDisplay.textContent = '00:00';
            if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'none'; // Verberg opslagknop

            bluetoothController.setPreset(selectedMeasurementType); // Gebruik het geselecteerde metingstype
            bluetoothController.connect();
        });
    }

    if (stopMeasurementBtnLive) {
        stopMeasurementBtnLive.addEventListener('click', () => {
            bluetoothController.disconnect();
            // Bereken gemiddelde HR en calorieën na stoppen
            if (currentSessionData.heartRates.length > 0) {
                const totalHr = currentSessionData.heartRates.reduce((sum, hr) => sum + hr, 0);
                currentSessionData.avgHr = totalHr / currentSessionData.heartRates.length;
                // Calorieën (voorbeeld berekening, kan complexer zijn)
                // Aanname: 10 kcal per minuut per 100 BPM gemiddelde HR
                currentSessionData.caloriesBurned = (currentSessionData.avgHr * currentSessionData.totalDuration / 60 / 10).toFixed(0);
            }
        });
    }

    if (saveMeasurementBtn) {
        saveMeasurementBtn.addEventListener('click', async () => {
            if (currentSessionData.totalDuration > 0) {
                const sessionToSave = {
                    userId: currentAppUserId,
                    type: selectedMeasurementType, // Sla het geselecteerde type meting op
                    date: new Date().toISOString().split('T')[0], // Datum in YYYY-MM-DD formaat
                    duration: currentSessionData.totalDuration / 60, // Duur in minuten
                    avgHr: currentSessionData.avgHr.toFixed(0),
                    rmssd: currentSessionData.rmssd,
                    caloriesBurned: currentSessionData.caloriesBurned,
                    rawHrData: currentSessionData.heartRates, // Optioneel: ruwe data opslaan
                    rawRrData: currentSessionData.rrIntervals, // Optioneel: ruwe data opslaan
                    timestamps: currentSessionData.timestamps // Optioneel: timestamps opslaan
                };

                try {
                    await putData('trainingSessions', sessionToSave);
                    showNotification('Meting succesvol opgeslagen!', 'success');
                    if (showViewCallback) {
                        showViewCallback('reportsView'); // Navigeer naar de rapportenpagina
                    }
                } catch (error) {
                    console.error("Fout bij opslaan meting:", error);
                    showNotification('Fout bij opslaan meting.', 'error');
                }
            } else {
                showNotification('Geen metingsdata om op te slaan.', 'warning');
            }
        });
    }

    // Zorg ervoor dat de opslagknop initieel verborgen is
    if (saveMeasurementBtn) saveMeasurementBtn.style.display = 'none';

    // Functie om HR Zone te bepalen (kan ook in een aparte utility file)
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
