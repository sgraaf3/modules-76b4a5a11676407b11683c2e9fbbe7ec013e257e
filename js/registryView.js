// Bestand: js/views/registryView.js
// Bevat logica voor het beheren van ledenregistraties (CRUD-operaties).

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initRegistryView() {
    console.log("Register Beheer View geïnitialiseerd.");

    const membersList = document.getElementById('membersList');
    const memberForm = document.getElementById('memberForm');
    const memberIdInput = document.getElementById('memberId');
    const memberNameInput = document.getElementById('memberName');
    const memberEmailInput = document.getElementById('memberEmail');
    const memberPhoneInput = document.getElementById('memberPhone');
    const memberJoinDateInput = document.getElementById('memberJoinDate');
    const memberStatusSelect = document.getElementById('memberStatus');
    const clearMemberFormBtn = document.getElementById('clearMemberFormBtn');

    async function loadMembers() {
        try {
            const members = await getAllData('registry'); // 'registry' is de store voor leden
            membersList.innerHTML = ''; // Maak de bestaande lijst leeg

            if (members.length === 0) {
                membersList.innerHTML = '<p class="text-gray-400">Geen leden gevonden.</p>';
                return;
            }

            // Sorteer leden van nieuw naar oud (op basis van joinDate)
            members.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));

            members.forEach(member => {
                const memberCard = document.createElement('div');
                memberCard.className = 'data-card';
                memberCard.innerHTML = `
                    <div class="card-header"><h3>${member.name}</h3></div>
                    <div class="sub-value">E-mail: ${member.email}</div>
                    <div class="sub-value">Telefoon: ${member.phone || 'N.v.t.'}</div>
                    <div class="sub-value">Lid sinds: ${member.joinDate || 'N.v.t.'}</div>
                    <div class="sub-value">Status: ${member.status}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-member" data-id="${member.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-member" data-id="${member.id}">Verwijder</button>
                    </div>
                `;
                membersList.appendChild(memberCard);
            });

            // Voeg event listeners toe voor bewerk/verwijder knoppen
            membersList.querySelectorAll('[data-action="edit-member"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const memberId = parseInt(event.target.dataset.id);
                    const member = await getData('registry', memberId);
                    if (member) {
                        memberIdInput.value = member.id;
                        memberNameInput.value = member.name;
                        memberEmailInput.value = member.email;
                        memberPhoneInput.value = member.phone;
                        memberJoinDateInput.value = member.joinDate;
                        memberStatusSelect.value = member.status;
                    }
                });
            });

            membersList.querySelectorAll('[data-action="delete-member"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const memberId = parseInt(event.target.dataset.id);
                    // Vervang confirm() door een custom modal of notificatie met actie
                    if (confirm('Weet u zeker dat u dit lid wilt verwijderen?')) { // Voor nu nog confirm
                        try {
                            await deleteData('registry', memberId);
                            showNotification('Lid verwijderd!', 'success');
                            loadMembers(); // Herlaad de lijst
                        } catch (error) {
                            console.error("Fout bij verwijderen lid:", error);
                            showNotification('Fout bij verwijderen lid.', 'error');
                        }
                    }
                });
            });
        } catch (error) {
            console.error("Fout bij laden leden:", error);
            showNotification("Fout bij laden leden.", "error");
        }
    }

    if (memberForm) {
        memberForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const member = {
                id: memberIdInput.value ? parseInt(memberIdInput.value) : undefined, // Gebruik undefined voor autoIncrement
                name: memberNameInput.value,
                email: memberEmailInput.value,
                phone: memberPhoneInput.value,
                joinDate: memberJoinDateInput.value,
                status: memberStatusSelect.value
            };
            try {
                await putData('registry', member);
                showNotification('Lid opgeslagen!', 'success');
                memberForm.reset();
                memberIdInput.value = ''; // Maak verborgen ID leeg
                loadMembers(); // Herlaad de lijst
            } catch (error) {
                console.error("Fout bij opslaan lid:", error);
                showNotification('Fout bij opslaan lid.', 'error');
            }
        });
    }

    if (clearMemberFormBtn) {
        clearMemberFormBtn.addEventListener('click', () => {
            memberForm.reset();
            memberIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadMembers(); // Laad leden bij initialisatie van de view
}
