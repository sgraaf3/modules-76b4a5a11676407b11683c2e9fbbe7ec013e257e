// Bestand: js/views/userProfileView.js
// Bevat de logica voor het gebruikersprofiel, inclusief opslaan, laden en berekeningen.

import { getData, putData } from '../database.js'; // Let op het relatieve pad naar database.js
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initUserProfileView() {
    console.log("Gebruikersprofiel View geïnitialiseerd.");

    const userProfileForm = document.getElementById('userProfileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const loadProfileBtn = document.getElementById('loadProfileBtn');
    // De "Terug naar Dashboard" knop wordt nu afgehandeld door app.js, dus geen lokale listener hier
    const userAtSportSelect = document.getElementById('userAtSport');
    const userBaselineHrvScoreInput = document.getElementById('userBaselineHrvScore');
    const calculatedEffectiveAtInput = document.getElementById('calculatedEffectiveEffectiveAt');

    if (userProfileForm) {
        saveProfileBtn.addEventListener('click', async () => {
            const userId = window.getUserId();
            const profileData = { id: userId };
            userProfileForm.querySelectorAll('input, select, textarea').forEach(input => {
                profileData[input.id] = input.value;
            });
            try {
                await putData('userProfile', profileData);
                showNotification('Profiel opgeslagen!', 'success');
            } catch (error) {
                console.error("Fout bij opslaan profiel:", error);
                showNotification('Fout bij opslaan profiel.', 'error');
            }
        });

        loadProfileBtn.addEventListener('click', async () => {
            const userId = window.getUserId();
            try {
                const profileData = await getData('userProfile', userId);
                if (profileData) {
                    for (const key in profileData) {
                        const input = document.getElementById(key);
                        if (input) {
                            input.value = profileData[key];
                        }
                    }
                    updateCalculatedEffectiveAt();
                    showNotification('Profiel geladen!', 'info');
                } else {
                    showNotification('Geen profiel gevonden.', 'warning');
                }
            } catch (error) {
                console.error("Fout bij laden profiel:", error);
                showNotification('Fout bij laden profiel.', 'error');
            }
        });

        function updateCalculatedEffectiveAt() {
            const baseAt = parseFloat(document.getElementById('userBaseAtHR').value) || 0;
            const atSport = userAtSportSelect.value;
            const hrvScore = parseFloat(userBaselineHrvScoreInput.value) || 0;

            let sportAdjustment = 0;
            switch (atSport) {
                case 'Running': sportAdjustment = 10; break;
                case 'Walking': sportAdjustment = -5; break;
                case 'Skating': sportAdjustment = 5; break;
                case 'Swimming': sportAdjustment = -10; break;
                case 'Rowing': sportAdjustment = 5; break;
                default: sportAdjustment = 0;
            }

            let hrvAdjustment = 0;
            if (hrvScore > 80) hrvAdjustment = 5;
            else if (hrvScore < 50 && hrvScore > 0) hrvAdjustment = -5;

            const effectiveAt = baseAt + sportAdjustment + hrvAdjustment;
            calculatedEffectiveAtInput.value = effectiveAt.toFixed(0);
        }

        userAtSportSelect.addEventListener('change', updateCalculatedEffectiveAt);
        userBaselineHrvScoreInput.addEventListener('input', updateCalculatedEffectiveAt);
        document.getElementById('userBaseAtHR').addEventListener('input', updateCalculatedEffectiveAt);

        // Initial calculation on load if data exists
        loadProfileBtn.click();
    }
}
