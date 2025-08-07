import { BluetoothController } from '../bluetooth.js';

const bluetoothController = new BluetoothController();

export function initRestMeasurementLiveView() {
    console.log("Rust & Herstel Meting View geïnitialiseerd.");

    const startMeasurementBtn = document.getElementById('startMeasurementBtn');
    const stopMeasurementBtn = document.getElementById('stopMeasurementBtn');

    if (startMeasurementBtn) {
        startMeasurementBtn.addEventListener('click', () => {
            bluetoothController.setPreset('resting');
            bluetoothController.connect();
        });
    }

    if (stopMeasurementBtn) {
        stopMeasurementBtn.addEventListener('click', () => {
            bluetoothController.disconnect();
        });
    }

    bluetoothController.onData = (dataPacket) => {
        // Update UI elements with live data
        document.getElementById('liveHrDisplay').textContent = `${dataPacket.heartRate} BPM`;
        // Add logic to update other UI elements as needed
    };
}