// Bestand: js/views/memberSpecificprogressView.js
// Bevat logica voor het weergeven van gebruikersprogressie en gedetailleerde grafieken.

import { getData, getUserRole } from '../database.js'; // Let op het relatieve pad

let userProgressMainChart;
let currentDetailedChart; // Houd de gedetailleerde grafiek bij

export async function initMemberSpecificprogressView() {
    console.log("User Progressie View geïnitialiseerd.");
    const userProgressView = document.getElementById('memberSpecificprogressView');
    if (!userProgressView) {
        console.error("Element with ID 'memberSpecificprogressView' not found.");
        return;
    }
    // Voorkom dubbele initialisatie van grafieken als de view opnieuw wordt geladen zonder refresh
    if (userProgressView.dataset.chartsInitialized) {
        // Indien al geïnitialiseerd, update dan alleen de data indien nodig.
        // Logica om de eigen profieldata te laden als de gebruiker geen 'member' is
        const currentUserRole = await getUserRole(window.getUserId());
        if (currentUserRole !== 'member') {
            // Hier zou de logica komen om de data van de ingelogde gebruiker te laden
            // Dit is een placeholder voor nu.
            console.log(`Gebruiker met rol '${currentUserRole}' bekijkt eigen voortgang.`);
        } else {
            console.log(`Lid bekijkt eigen voortgang.`);
        }
        return;
    }

    const userProgressMainCtx = document.getElementById('userProgressMainChart')?.getContext('2d');
    if (userProgressMainCtx) {
        userProgressMainChart = new Chart(userProgressMainCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [{
                    label: 'Algemene Progressie Score',
                    data: [65, 70, 72, 75, 78, 80],
                    borderColor: '#34d399',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    userProgressView.dataset.chartsInitialized = true; // Markeer als geïnitialiseerd

    // Logica om de eigen profieldata te laden als de gebruiker geen 'member' is
    const currentUserRole = await getUserRole(window.getUserId());
    if (currentUserRole !== 'member') {
        // Hier zou de logica komen om de data van de ingelogde gebruiker te laden
        // Dit is een placeholder voor nu.
        console.log(`Gebruiker met rol '${currentUserRole}' bekijkt eigen voortgang.`);
    } else {
        console.log(`Lid bekijkt eigen voortgang.`);
    }
}

// Deze functie is geëxporteerd zodat app.js deze kan aanroepen bij het laden van webGraphsView
export function showDetailedGraph(data) { // 'data' object kan hier worden doorgegeven, bijv. { graphType: 'hr' }
    console.log("Gedetailleerde Grafiek View geïnitialiseerd voor type:", data?.graphType);

    const detailedGraphChartCtx = document.getElementById('detailedGraphChart')?.getContext('2d');
    const webGraphsTitle = document.getElementById('webGraphsTitle');

    if (!detailedGraphChartCtx) return;

    if (currentDetailedChart) {
        currentDetailedChart.destroy(); // Vernietig de vorige grafiek instantie
    }

    let chartData = {};
    let title = '';
    const graphType = data?.graphType; // Haal graphType uit het doorgegeven data object

    switch (graphType) {
        case 'hr':
            title = 'Hartslag (HR) Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Gemiddelde HR',
                    data: [70, 68, 65, 67, 64, 62],
                    borderColor: '#60a5fa',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'hrv':
            title = 'HRV Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'RMSSD',
                    data: [40, 45, 42, 48, 46, 50],
                    borderColor: '#4ade80',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'biometrics':
            title = 'Biometrie Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Gewicht (kg)',
                        data: [75, 74, 73, 72, 71, 70],
                        borderColor: '#c084fc',
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Vet % ',
                        data: [20, 19.5, 19, 18.5, 18, 17.5],
                        borderColor: '#facc15',
                        tension: 0.4,
                        fill: false
                    }
                ]
            };
            break;
        case 'ratios':
            title = 'Verhoudingen Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Taille-Heup Ratio',
                    data: [0.85, 0.84, 0.83, 0.82, 0.81, 0.80],
                    borderColor: '#fb923c',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'cardiovascular':
            title = 'Cardiovasculaire Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'VO2 Max',
                    data: [45, 46, 47, 48, 49, 50],
                    borderColor: '#ef4444',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'strength':
            title = 'Kracht Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Max Deadlift (kg)',
                    data: [100, 105, 110, 115, 120, 125],
                    borderColor: '#f97316',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'coordination':
            title = 'Coördinatie Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Balans Score',
                    data: [70, 72, 75, 78, 80, 82],
                    borderColor: '#22d3ee',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        case 'flexibility':
            title = 'Flexibiliteit Progressie';
            chartData = {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Sit-and-Reach (cm)',
                    data: [30, 32, 35, 37, 39, 40],
                    borderColor: '#f472b6',
                    tension: 0.4,
                    fill: false
                }]
            };
            break;
        default:
            title = 'Gedetailleerde Grafieken';
            chartData = {
                labels: [],
                datasets: []
            };
    }

    webGraphsTitle.textContent = title;
    currentDetailedChart = new Chart(detailedGraphChartCtx, {
        type: 'line',
        data: chartData,
        options: { responsive: true, maintainAspectRatio: false }
    });
}
