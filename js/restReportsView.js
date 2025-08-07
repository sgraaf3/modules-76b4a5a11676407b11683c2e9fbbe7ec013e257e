// Bestand: js/restReportsView.js
// Bevat logica voor geavanceerde rapportagemogelijkheden en diepgaande analyses voor rustmetingen.

import { getAllData, getData } from '../database.js';
import { showNotification } from './notifications.js';

// Functie om een gedetailleerd rapport te genereren en te downloaden voor rustmetingen
async function generateRestReport(session) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = 10;

    let reportContent = `
--- REST MEASUREMENT REPORT ---
Date: ${session.date || 'Unknown'}
Measurement Type: ${session.type || 'Resting'}

--- OVERVIEW ---
Duration: ${session.totalDuration || session.duration * 60 || '--'} seconds
Average Heart Rate: ${session.avgHr || '--'} BPM
Calories Burned: ${session.caloriesBurned || '--'} kcal

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
        reportContent += `RMSSD data not available or invalid. Ensure proper measurement.\n`;
    }

    if (session.sdnn) {
        reportContent += `SDNN: ${session.sdnn.toFixed(2)} MS\n`;
        reportContent += `  - Explanation: SDNN represents the overall variability of heart rate over a period. It reflects both sympathetic and parasympathetic nervous system activity.\n`;
        reportContent += `  - Interpretation: `;
        const sdnn = parseFloat(session.sdnn);
        if (sdnn >= 100) {
            reportContent += `Very high overall HRV, indicating excellent adaptability and resilience.\n`;
        } else if (sdnn >= 50) {
            reportContent += `Good overall HRV, suggesting a healthy and adaptable cardiovascular system.\n`;
        } else {
            reportContent += `Lower overall HRV, which can be a sign of chronic stress, overtraining, or underlying health issues.\n`;
        }
    }

    if (session.avgBreathRate) {
        reportContent += `Breathing Rate: ${session.avgBreathRate.toFixed(1)} BPM\n`;
        reportContent += `  - Explanation: Your breathing rate indicates how many breaths you take per minute. A lower resting breathing rate often correlates with better cardiovascular health and relaxation.\n`;
        reportContent += `  - Interpretation: `;
        const avgBreathRate = parseFloat(session.avgBreathRate);
        if (avgBreathRate >= 16) {
            reportContent += `Elevated breathing rate. This could be due to stress, anxiety, or poor breathing habits.\n`;
            reportContent += `  - Improvement: Practice diaphragmatic breathing exercises, mindfulness, and stress reduction techniques.\n`;
        } else if (avgBreathRate >= 12) {
            reportContent += `Normal breathing rate. Consistent, calm breathing is beneficial for overall health.\n`;
            reportContent += `  - Improvement: Continue to be mindful of your breathing, especially during stressful situations.\n`;
        } else if (avgBreathRate >= 8) {
            reportContent += `Optimal breathing rate. This indicates good respiratory efficiency and a relaxed state.\n`;
            reportContent += `  - Improvement: Maintain your current breathing patterns and consider advanced breathing techniques for performance enhancement.\n`;
        } else {
            reportContent += `Very low breathing rate. While often good, extremely low rates might warrant professional consultation if accompanied by other symptoms.\n`;
            reportContent += `  - Improvement: Ensure adequate oxygen intake and consult a specialist if concerned.\n`;
        }
    }

    if (session.vlfPower || session.lfPower || session.hfPower) {
        reportContent += `VLF Power: ${session.vlfPower ? session.vlfPower.toFixed(2) : '--'}\n`;
        reportContent += `LF Power: ${session.lfPower ? session.lfPower.toFixed(2) : '--'}\n`;
        reportContent += `HF Power: ${session.hfPower ? session.hfPower.toFixed(2) : '--'}\n`;
    }

    reportContent += `\nRaw HR Data Points: ${session.rawHrData ? session.rawHrData.length : 0}\n`;
    reportContent += `Raw RR Data Points: ${session.rawRrData ? session.rawRrData.length : 0}\n`;
    reportContent += `\n--- End of Report ---`;

    doc.text(reportContent, 10, yPos);
    yPos += reportContent.split('\n').length * 5; // Estimate line height;

    // Capture and add charts (assuming canvas elements exist in the HTML for these)
    const chartsToCapture = [
        { id: 'restHrChart', title: 'Heart Rate Chart' },
        { id: 'restRrHistogramChart', title: 'RR Histogram Chart' },
        { id: 'restPoincarePlotChart', title: 'Poincaré Plot Chart' },
        { id: 'restPowerSpectrumChart', title: 'Power Spectrum Chart' }
    ];

    for (const chartInfo of chartsToCapture) {
        const canvas = document.getElementById(chartInfo.id);
        if (canvas) {
            const originalDisplay = canvas.style.display;
            canvas.style.display = 'block';
            try {
                const img = await html2canvas(canvas);
                const imgData = img.toDataURL('image/png');
                
                if (yPos + 100 > doc.internal.pageSize.height - 20) {
                    doc.addPage();
                    yPos = 10;
                }

                doc.text(chartInfo.title, 10, yPos);
                yPos += 7;
                doc.addImage(imgData, 'PNG', 10, yPos, 180, 90);
                yPos += 100;
            } catch (error) {
                console.error(`Error capturing chart ${chartInfo.id}:`, error);
            } finally {
                canvas.style.display = originalDisplay;
            }
        }
    }

    doc.save(`rest_report_${session.date || 'unknown'}.pdf`);
    showNotification('Rustrapport succesvol gedownload!', 'success');
}

export async function initRestReportsView() {
    console.log("Rust Rapporten View geïnitialiseerd.");

    const restSessionReportsList = document.getElementById('restSessionReportsList');
    const downloadRestPdfBtn = document.getElementById('downloadRestPdfBtn');
    
    async function loadRestSessionReports() {
        const freeSessions = await getAllData('restSessionsFree');
        const advancedSessions = await getAllData('restSessionsAdvanced');

        // Combine and deduplicate sessions based on date or a unique ID if available
        const allRestSessionsMap = new Map();
        freeSessions.forEach(session => allRestSessionsMap.set(session.date, { ...session, source: 'free' }));
        advancedSessions.forEach(session => allRestSessionsMap.set(session.date, { ...allRestSessionsMap.get(session.date), ...session, source: 'advanced' }));

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
            reportCard.className = 'data-card';
            reportCard.innerHTML = `
                <div class="card-header"><h3>Rustmeting van ${session.date || 'Onbekend'} (${session.type || 'N/A'})</h3></div>
                <div class="sub-value">Duur: ${session.duration || '--'} min, Gem. HR: ${session.avgHr || '--'} BPM</div>
                <div class="sub-value">RMSSD: ${rmssdValue} MS</div>
                <div class="flex justify-end mt-2">
                    <button class="text-blue-400 hover:text-blue-300 text-sm" data-action="view-detailed-rest-report" data-date="${session.date}">Bekijk Rapport</button>
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
                    showNotification(`Sessie van ${sessionDate} niet gevonden.`, 'error');
                }
            });
        });
    }

    await loadRestSessionReports();

    // Initialize charts for the rest reports view if needed, similar to trainingReportsView
    // For now, we assume charts are generated on the fly for the PDF.
}
