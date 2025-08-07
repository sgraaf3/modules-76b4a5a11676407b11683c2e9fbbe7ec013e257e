import { BluetoothController } from '../bluetooth.js';

let trainingHrChart;
const bluetoothController = new BluetoothController();

export function initTrainingView() {
    console.log("Training View geïnitialiseerd.");
    const trainingHrCtx = document.getElementById('trainingHrChart')?.getContext('2d');
    if (trainingHrCtx) {
        if (trainingHrChart) {
            trainingHrChart.destroy();
        }
        trainingHrChart = new Chart(trainingHrCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Live Hartslag',
                    data: [],
                    borderColor: '#f87171',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    bluetoothController.onData = (dataPacket) => {
        if (trainingHrChart) {
            const chart = trainingHrChart;
            const label = new Date().toLocaleTimeString();
            chart.data.labels.push(label);
            chart.data.datasets[0].data.push(dataPacket.heartRate);
            if (chart.data.labels.length > 30) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.update();
        }

        document.getElementById('currentTrainingHrDisplay').textContent = `${dataPacket.heartRate} BPM`;
        // Implement logic to calculate and display HR zone and average HR
    };

    // Removed automatic Bluetooth connection to prevent requestDevice() chooser error.
    // Bluetooth connection should be initiated by a user gesture (e.g., a button click).
    // if (!bluetoothController.isConnected()) {
    //     bluetoothController.connect();
    // }
}

export function resetTrainingHrChart() {
    if (trainingHrChart) {
        trainingHrChart.destroy();
        trainingHrChart = null;
    }
    if (bluetoothController.isConnected()) {
        bluetoothController.disconnect();
    }
    console.log("Training HR-grafiek gereset.");
}

