// Bestand: js/views/memberMembershipView.js
// Bevat logica voor het beheren van individuele lidmaatschappen (CRUD-operaties).

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initMemberMembershipView() {
    console.log("Lidmaatschap Beheer View geïnitialiseerd.");

    const membershipDetailsContainer = document.getElementById('membershipDetailsContainer');
    const memberMembershipForm = document.getElementById('memberMembershipForm');
    const memberMembershipIdInput = document.getElementById('memberMembershipId');
    const memberIdForMembershipInput = document.getElementById('memberIdForMembership');
    const membershipTypeSelect = document.getElementById('membershipType');
    const membershipStartDateInput = document.getElementById('membershipStartDate');
    const membershipEndDateInput = document.getElementById('membershipEndDate');
    const membershipStatusSelect = document.getElementById('membershipStatus');
    const membershipNotesInput = document.getElementById('membershipNotes');
    const clearMemberMembershipFormBtn = document.getElementById('clearMemberMembershipFormBtn');

    async function loadMemberMemberships() {
        try {
            const memberships = await getAllData('memberMemberships'); // 'memberMemberships' is de store voor lidmaatschappen
            membershipDetailsContainer.innerHTML = ''; // Maak de bestaande lijst leeg

            if (memberships.length === 0) {
                membershipDetailsContainer.innerHTML = '<p class="text-gray-400">Geen lidmaatschappen gevonden. Voeg een nieuw lidmaatschap toe.</p>';
                return;
            }

            // Voor nu tonen we een lijst van alle lidmaatschappen.
            // Later kan dit worden uitgebreid met een zoekfunctie of filtering per lid.
            memberships.forEach(membership => {
                const membershipCard = document.createElement('div');
                membershipCard.className = 'data-card';
                membershipCard.innerHTML = `
                    <div class="card-header"><h3>Lidmaatschap: ${membership.membershipType} (Lid ID: ${membership.memberId})</h3></div>
                    <div class="sub-value">Start: ${membership.startDate || 'N.v.t.'} | Eind: ${membership.endDate || 'N.v.t.'}</div>
                    <div class="sub-value">Status: ${membership.status}</div>
                    <div class="sub-value">Notities: ${membership.notes || 'Geen'}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-member-membership" data-id="${membership.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-member-membership" data-id="${membership.id}">Verwijder</button>
                    </div>
                `;
                membershipDetailsContainer.appendChild(membershipCard);
            });

            // Voeg event listeners toe voor bewerk/verwijder knoppen
            membershipDetailsContainer.querySelectorAll('[data-action="edit-member-membership"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const membershipId = parseInt(event.target.dataset.id);
                    const membership = await getData('memberMemberships', membershipId);
                    if (membership) {
                        memberMembershipIdInput.value = membership.id;
                        memberIdForMembershipInput.value = membership.memberId;
                        membershipTypeSelect.value = membership.membershipType;
                        membershipStartDateInput.value = membership.startDate;
                        membershipEndDateInput.value = membership.endDate;
                        membershipStatusSelect.value = membership.status;
                        membershipNotesInput.value = membership.notes;
                    }
                });
            });

            membershipDetailsContainer.querySelectorAll('[data-action="delete-member-membership"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const membershipId = parseInt(event.target.dataset.id);
                    // Vervang confirm() door een custom modal of notificatie met actie
                    if (confirm('Weet u zeker dat u dit lidmaatschap wilt verwijderen?')) { // Voor nu nog confirm
                        try {
                            await deleteData('memberMemberships', membershipId);
                            showNotification('Lidmaatschap verwijderd!', 'success');
                            loadMemberMemberships(); // Herlaad de lijst
                        } catch (error) {
                            console.error("Fout bij verwijderen lidmaatschap:", error);
                            showNotification('Fout bij verwijderen lidmaatschap.', 'error');
                        }
                    }
                });
            });
        } catch (error) {
            console.error("Fout bij laden lidmaatschappen:", error);
            showNotification("Fout bij laden lidmaatschappen.", "error");
        }
    }

    if (memberMembershipForm) {
        memberMembershipForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const membership = {
                id: memberMembershipIdInput.value ? parseInt(memberMembershipIdInput.value) : undefined, // Gebruik undefined voor autoIncrement
                memberId: memberIdForMembershipInput.value,
                membershipType: membershipTypeSelect.value,
                startDate: membershipStartDateInput.value,
                endDate: membershipEndDateInput.value,
                status: membershipStatusSelect.value,
                notes: membershipNotesInput.value
            };
            try {
                await putData('memberMemberships', membership);
                showNotification('Lidmaatschap opgeslagen!', 'success');
                memberMembershipForm.reset();
                memberMembershipIdInput.value = ''; // Maak verborgen ID leeg
                loadMemberMemberships(); // Herlaad de lijst
            } catch (error) {
                console.error("Fout bij opslaan lidmaatschap:", error);
                showNotification('Fout bij opslaan lidmaatschap.', 'error');
            }
        });
    }

    if (clearMemberMembershipFormBtn) {
        clearMemberMembershipFormBtn.addEventListener('click', () => {
            memberMembershipForm.reset();
            memberMembershipIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadMemberMemberships(); // Laad lidmaatschappen bij initialisatie van de view
}
