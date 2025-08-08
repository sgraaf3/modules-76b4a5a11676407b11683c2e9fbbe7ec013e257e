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
        try {
            const subscriptions = await getAllData('subscriptions');
            const userSubscription = subscriptions.find(sub => sub.assignedTo === userId);
            const section = document.getElementById('assigned-subscription-section');

            if (userSubscription) {
                section.innerHTML = `
                    <div class="bg-gray-700 p-4 rounded-lg">
                        <p><strong>Type:</strong> ${userSubscription.type}</p>
                        <p><strong>Status:</strong> ${userSubscription.status}</p>
                        <p><strong>Startdatum:</strong> ${new Date(userSubscription.startDate).toLocaleDateString()}</p>
                        <p><strong>Einddatum:</strong> ${new Date(userSubscription.endDate).toLocaleDateString()}</p>
                    </div>
                `;
            } else {
                section.innerHTML = '<p class="text-gray-400">Geen abonnement toegewezen.</p>';
            }
        } catch (error) {
            console.error("Error loading assigned subscription:", error);
            showNotification('Error loading subscription.', 'error');
        }
    }

    async function loadTrainingHistory() {
        try {
            const sessions = await getAllData('trainingSessions');
            const userSessions = sessions.filter(session => session.userId === userId);
            const section = document.getElementById('training-history-section');

            if (userSessions.length > 0) {
                section.innerHTML = userSessions.map(session => `
                    <div class="bg-gray-700 p-4 rounded-lg mb-2">
                        <p><strong>Datum:</strong> ${new Date(session.date).toLocaleDateString()}</p>
                        <p><strong>Type:</strong> ${session.type}</p>
                        <p><strong>Duur:</strong> ${session.duration} minuten</p>
                    </div>
                `).join('');
            } else {
                section.innerHTML = '<p class="text-gray-400">Geen trainingsgeschiedenis beschikbaar.</p>';
            }
        } catch (error) {
            console.error("Error loading training history:", error);
            showNotification('Error loading training history.', 'error');
        }
    }

    async function loadActivityLog() {
        try {
            const activities = await getAllData('memberActivity');
            const userActivities = activities.filter(activity => activity.userId === userId);
            const section = document.getElementById('activity-log-section');

            if (userActivities.length > 0) {
                section.innerHTML = userActivities.map(activity => `
                    <div class="bg-gray-700 p-4 rounded-lg mb-2">
                        <p><strong>Datum:</strong> ${new Date(activity.date).toLocaleString()}</p>
                        <p><strong>Activiteit:</strong> ${activity.activity}</p>
                    </div>
                `).join('');
            } else {
                section.innerHTML = '<p class="text-gray-400">Geen activiteitenlog beschikbaar.</p>';
            }
        } catch (error) {
            console.error("Error loading activity log:", error);
            showNotification('Error loading activity log.', 'error');
        }
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