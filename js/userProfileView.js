// Bestand: js/userProfileView.js
import { getData, putData, getAllData, getOrCreateUserId } from '../database.js';
import { showNotification } from './notifications.js';

export async function initUserProfileView(data) {
    // Correctie: Haal de userId uit de meegegeven data of gebruik de globale ID.
    const userId = data && data.userId ? data.userId : getOrCreateUserId();
    console.log(`Initializing User Profile View for user ${userId}`);

    const userProfileForm = document.getElementById('userProfileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const userProfileTitle = document.getElementById('user-profile-title');

    async function loadUserProfile() {
        try {
            const profileData = await getData('userProfile', userId);
            if (profileData) {
                userProfileTitle.textContent = `${profileData.userName || 'Gebruiker'}'s Profiel`;
                for (const key in profileData) {
                    const input = document.getElementById(key);
                    if (input) {
                        input.value = profileData[key];
                    }
                }
            } else {
                const registryData = await getData('registry', userId);
                if(registryData) {
                    userProfileTitle.textContent = `${registryData.name || 'Gebruiker'}'s Profiel`;
                    document.getElementById('userName').value = registryData.name;
                    document.getElementById('userEmail').value = registryData.email;
                } else {
                    userProfileTitle.textContent = `Profiel`;
                }
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
            showNotification('Error loading user profile.', 'error');
        }
    }

    async function loadAssignedSubscription() {
        // ... (implementation to come in a future step)
    }

    async function loadTrainingHistory() {
        // ... (implementation to come in a future step)
    }

    async function loadActivityLog() {
        // ... (implementation to come in a future step)
    }

    if (userProfileForm) {
        saveProfileBtn.addEventListener('click', async () => {
            const profileData = { id: userId };
            userProfileForm.querySelectorAll('input, select, textarea').forEach(input => {
                profileData[input.id] = input.value;
            });
            try {
                await putData('userProfile', profileData);
                showNotification('Profile saved!', 'success');
            } catch (error) {
                console.error("Error saving profile:", error);
                showNotification('Error saving profile.', 'error');
            }
        });
    }

    document.querySelectorAll('[data-toggle]').forEach(element => {
        element.addEventListener('click', () => {
            const targetId = element.dataset.toggle;
            const targetElement = document.getElementById(targetId);
            targetElement.classList.toggle('hidden');
            element.querySelector('i').classList.toggle('fa-chevron-down');
            element.querySelector('i').classList.toggle('fa-chevron-up');
        });
    });

    await loadUserProfile();
    await loadAssignedSubscription();
    await loadTrainingHistory();
    await loadActivityLog();
}