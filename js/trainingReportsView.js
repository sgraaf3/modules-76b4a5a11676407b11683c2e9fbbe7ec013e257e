// Bestand: js/views/reportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses.

import { getAllData } from '../database.js';
import { showNotification } from './notifications.js';

import { initIndividualHrChart, initIndividualHrvChart, initBreathRateChart } from './reports/regularReports.js';
import { initSleepTrendChart, initSportActivitiesTrendChart } from './reports/afterReports.js';

// Functie om een gedetailleerd rapport te genereren en te downloaden
async function generateTrainingReport(session) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = 10;

    let reportContent = `
--- TRAINING REPORT ---
Date: ${session.date || 'Unknown'}
Measurement Type: Training Session

--- OVERVIEW ---
Duration: ${session.duration || '--'} minutes
Average Heart Rate: ${session.avgHr || '--'} BPM
  - Explanation: Your average heart rate during this session indicates the intensity of your workout. Higher values mean more intense effort.
  - Interpretation: `;
    const avgHr = parseFloat(session.avgHr);
    if (avgHr > 150) {
        reportContent += `This was a high-intensity session. Great for improving cardiovascular fitness and endurance.
  - Improvement: Ensure adequate recovery after such intense efforts. Listen to your body and don't overtrain.
`;
    } else if (avgHr > 120) {
        reportContent += `This was a moderate-intensity session. Ideal for building aerobic base and improving stamina.
  - Improvement: Consistency is key. Aim for regular moderate-intensity workouts. Consider varying intensity for optimal results.
`;
    } else if (avgHr > 90) {
        reportContent += `This was a low-intensity session, suitable for active recovery or warm-up/cool-down. Good for promoting blood flow and recovery.
  - Improvement: Incorporate these sessions for recovery or as part of a varied training plan. If this was meant to be intense, consider increasing effort.
`;
    } else {
        reportContent += `Very low heart rate, likely indicating a very light activity or rest. Ensure your heart rate monitor was functioning correctly.
  - Improvement: If this was a workout, assess your effort level or equipment. If it was a rest period, this is a good sign of relaxation.
`;
    }

    reportContent += `
--- HRV ANALYSIS ---
RMSSD: ${session.rmssd ? session.rmssd.toFixed(2) : '--'} MS
  - Explanation: RMSSD reflects the beat-to-beat variance in heart rate, primarily indicating parasympathetic nervous system activity. Higher values generally suggest better recovery and readiness.
  - Interpretation: `;
    const rmssd = parseFloat(session.rmssd);
    if (rmssd >= 70) {
        reportContent += `Excellent recovery and high parasympathetic activity. You are likely well-rested and ready for intense activity.
  - Improvement: Maintain healthy habits, ensure adequate sleep, and manage stress effectively.
`;
    } else if (rmssd >= 50) {
        reportContent += `Good recovery. Your body is responding well to training and stress. Continue with your current recovery strategies.
  - Improvement: Focus on consistent sleep, balanced nutrition, and active recovery.
`;
    } else if (rmssd >= 30) {
        reportContent += `Moderate recovery. You might be experiencing some fatigue or stress. Consider light activity or active recovery.
  - Improvement: Prioritize rest, reduce training intensity, and incorporate stress-reduction techniques.
`;
    } else if (rmssd > 0) {
        reportContent += `Low recovery. This may indicate significant fatigue, stress, or illness. Consider taking a rest day or consulting a professional.
  - Improvement: Complete rest, stress management, and re-evaluation of training load are crucial.
`;
    } else {
        reportContent += `RMSSD data not available or invalid. Ensure proper measurement.
`;
    }

    reportContent += `
--- OTHER METRICS ---
Calories Burned: ${session.caloriesBurned || '--'} kcal
Raw HR Data Points: ${session.rawHrData ? session.rawHrData.length : 0}
Raw RR Data Points: ${session.rawRrData ? session.rawRrData.length : 0}

--- End of Report ---`;

    doc.text(reportContent, 10, yPos);
    yPos += reportContent.split('\n').length * 5; // Estimate line height;

    // Capture and add charts
    const chartsToCapture = [
        { id: 'individualHrChart', title: 'Individual HR Chart' },
        { id: 'individualHrvChart', title: 'Individual HRV Chart' },
        { id: 'breathRateChart', title: 'Breath Rate Chart' }
    ];

    for (const chartInfo of chartsToCapture) {
        const canvas = document.getElementById(chartInfo.id);
        if (canvas) {
            // Temporarily make chart visible for html2canvas if it's hidden
            const originalDisplay = canvas.style.display;
            canvas.style.display = 'block';
            try {
                const img = await html2canvas(canvas);
                const imgData = img.toDataURL('image/png');
                
                // Add a new page if content exceeds current page
                if (yPos + 100 > doc.internal.pageSize.height - 20) { // 100 for image height + margin, 20 for bottom margin
                    doc.addPage();
                    yPos = 10; // Reset y position for new page
                }

                doc.text(chartInfo.title, 10, yPos);
                yPos += 7; // Space for title
                doc.addImage(imgData, 'PNG', 10, yPos, 180, 90); // Adjust width and height as needed
                yPos += 100; // Space after image
            } catch (error) {
                console.error(`Error capturing chart ${chartInfo.id}:`, error);
            } finally {
                canvas.style.display = originalDisplay; // Restore original display
            }
        }
    }

    doc.save(`training_report_${session.date || 'unknown'}.pdf`);
    showNotification('Rapport succesvol gedownload!', 'success');
}

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
            button.addEventListener('click', async (event) => {
                const sessionId = parseInt(event.target.dataset.id);
                const session = trainingSessions.find(s => s.id === sessionId);
                if (session) {
                    await generateTrainingReport(session);
                } else {
                    showNotification(`Sessie met ID ${sessionId} niet gevonden.`, 'error');
                }
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