import { getData, putData, deleteData, getAllData, setUserRole, getUserRole } from '../database.js';
import { showNotification } from './notifications.js';

export async function initRegistryView() {
    console.log("User Registry View Initialized.");

    const membersList = document.getElementById('membersList');
    const memberForm = document.getElementById('memberForm');
    const memberIdInput = document.getElementById('memberId');
    const memberNameInput = document.getElementById('memberName');
    const memberEmailInput = document.getElementById('memberEmail');
    const memberPhoneInput = document.getElementById('memberPhone');
    const memberJoinDateInput = document.getElementById('memberJoinDate');
    const memberStatusSelect = document.getElementById('memberStatus');
    const memberRoleSelect = document.getElementById('memberRole');
    const clearMemberFormBtn = document.getElementById('clearMemberFormBtn');

    async function loadMembers() {
        try {
            const members = await getAllData('registry');
            membersList.innerHTML = '';

            if (members.length === 0) {
                membersList.innerHTML = '<p class="text-gray-400">No users found.</p>';
                return;
            }

            members.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));

            for (const member of members) {
                const role = await getUserRole(member.id) || 'member';
                const memberCard = document.createElement('div');
                memberCard.className = 'data-card';
                memberCard.innerHTML = `
                    <div class="card-header"><h3>${member.name}</h3></div>
                    <div class="sub-value">Email: ${member.email}</div>
                    <div class="sub-value">Phone: ${member.phone || 'N/A'}</div>
                    <div class="sub-value">Joined: ${member.joinDate || 'N/A'}</div>
                    <div class="sub-value">Status: ${member.status}</div>
                    <div class="sub-value">Role: ${role}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-green-400 hover:text-green-300 text-sm mr-2" data-action="view-profile" data-id="${member.id}">View Profile</button>
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-member" data-id="${member.id}">Edit</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-member" data-id="${member.id}">Delete</button>
                    </div>
                `;
                membersList.appendChild(memberCard);
            }

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
                        memberRoleSelect.value = await getUserRole(member.id) || 'member';
                    }
                });
            });

            membersList.querySelectorAll('[data-action="delete-member"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const memberId = parseInt(event.target.dataset.id);
                    if (confirm('Are you sure you want to delete this user?')) {
                        try {
                            await deleteData('registry', memberId);
                            showNotification('User deleted!', 'success');
                            loadMembers();
                        } catch (error) {
                            console.error("Error deleting user:", error);
                            showNotification('Error deleting user.', 'error');
                        }
                    }
                });
            });

            membersList.querySelectorAll('[data-action="view-profile"]').forEach(button => {
                button.addEventListener('click', (event) => {
                    const memberId = event.target.dataset.id;
                    window.showView('userProfileView', { userId: memberId });
                });
            });

        } catch (error) {
            console.error("Error loading users:", error);
            showNotification("Error loading users.", "error");
        }
    }

    if (memberForm) {
        memberForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const memberData = {
                name: memberNameInput.value,
                email: memberEmailInput.value,
                phone: memberPhoneInput.value,
                joinDate: memberJoinDateInput.value,
                status: memberStatusSelect.value
            };

            if (memberIdInput.value) {
                memberData.id = parseInt(memberIdInput.value);
            }

            const role = memberRoleSelect.value;

            try {
                const savedMemberId = await putData('registry', memberData);
                await setUserRole(savedMemberId, role);
                showNotification('User saved!', 'success');
                memberForm.reset();
                memberIdInput.value = '';
                loadMembers();
            } catch (error) {
                console.error("Error saving user:", error);
                showNotification('Error saving user.', 'error');
            }
        });
    }

    if (clearMemberFormBtn) {
        clearMemberFormBtn.addEventListener('click', () => {
            memberForm.reset();
            memberIdInput.value = '';
            showNotification('Form cleared.', 'info');
        });
    }

    await loadMembers();
}

