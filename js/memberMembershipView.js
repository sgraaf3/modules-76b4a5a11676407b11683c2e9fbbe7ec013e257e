import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js';

export async function initMemberMembershipView() {
    console.log("Member-Subscription Link View Initialized.");

    const memberSelect = document.getElementById('memberSelect');
    const subscriptionSelect = document.getElementById('subscriptionSelect');
    const memberMembershipForm = document.getElementById('memberMembershipForm');
    const memberMembershipIdInput = document.getElementById('memberMembershipId');
    const membershipStartDateInput = document.getElementById('membershipStartDate');
    const membershipEndDateInput = document.getElementById('membershipEndDate');
    const membershipStatusSelect = document.getElementById('membershipStatus');
    const membershipNotesInput = document.getElementById('membershipNotes');
    const clearMemberMembershipFormBtn = document.getElementById('clearMemberMembershipFormBtn');
    const membershipDetailsContainer = document.getElementById('membershipDetailsContainer');

    async function populateDropdowns() {
        try {
            const members = await getAllData('registry');
            const subscriptions = await getAllData('subscriptions');

            memberSelect.innerHTML = '<option value="">Select a member</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                memberSelect.appendChild(option);
            });

            subscriptionSelect.innerHTML = '<option value="">Select a subscription</option>';
            subscriptions.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.name;
                subscriptionSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Error populating dropdowns:", error);
            showNotification('Error populating dropdowns.', 'error');
        }
    }

    async function loadMemberMemberships() {
        try {
            const memberships = await getAllData('memberMemberships');
            membershipDetailsContainer.innerHTML = '';

            if (memberships.length === 0) {
                membershipDetailsContainer.innerHTML = '<p class="text-gray-400">No links found.</p>';
                return;
            }

            for (const membership of memberships) {
                const member = await getData('registry', membership.memberId);
                const subscription = await getData('subscriptions', membership.subscriptionId);

                const membershipCard = document.createElement('div');
                membershipCard.className = 'data-card';
                membershipCard.innerHTML = `
                    <div class="card-header"><h3>${member.name} - ${subscription.name}</h3></div>
                    <div class="sub-value">Start: ${membership.startDate || 'N/A'} | End: ${membership.endDate || 'N/A'}</div>
                    <div class="sub-value">Status: ${membership.status}</div>
                    <div class="sub-value">Notes: ${membership.notes || 'None'}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-member-membership" data-id="${membership.id}">Edit</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-member-membership" data-id="${membership.id}">Delete</button>
                    </div>
                `;
                membershipDetailsContainer.appendChild(membershipCard);
            }

            membershipDetailsContainer.querySelectorAll('[data-action="edit-member-membership"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const membershipId = parseInt(event.target.dataset.id);
                    const membership = await getData('memberMemberships', membershipId);
                    if (membership) {
                        memberMembershipIdInput.value = membership.id;
                        memberSelect.value = membership.memberId;
                        subscriptionSelect.value = membership.subscriptionId;
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
                    if (confirm('Are you sure you want to delete this link?')) {
                        try {
                            await deleteData('memberMemberships', membershipId);
                            showNotification('Link deleted!', 'success');
                            loadMemberMemberships();
                        } catch (error) {
                            console.error("Error deleting link:", error);
                            showNotification('Error deleting link.', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Error loading links:", error);
            showNotification("Error loading links.", "error");
        }
    }

    if (memberMembershipForm) {
        memberMembershipForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const membershipData = {
                memberId: parseInt(memberSelect.value),
                subscriptionId: parseInt(subscriptionSelect.value),
                startDate: membershipStartDateInput.value,
                endDate: membershipEndDateInput.value,
                status: membershipStatusSelect.value,
                notes: membershipNotesInput.value
            };

            if (memberMembershipIdInput.value) {
                membershipData.id = parseInt(memberMembershipIdInput.value);
            }

            try {
                await putData('memberMemberships', membershipData);
                showNotification('Link saved!', 'success');
                memberMembershipForm.reset();
                memberMembershipIdInput.value = '';
                loadMemberMemberships();
            } catch (error) {
                console.error("Error saving link:", error);
                showNotification('Error saving link.', 'error');
            }
        });
    }

    if (clearMemberMembershipFormBtn) {
        clearMemberMembershipFormBtn.addEventListener('click', () => {
            memberMembershipForm.reset();
            memberMembershipIdInput.value = '';
            showNotification('Form cleared.', 'info');
        });
    }

    await populateDropdowns();
    await loadMemberMemberships();
}

