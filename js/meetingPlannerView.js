// Bestand: js/views/meetingPlannerView.js
// Bevat logica voor het plannen van vergaderingen.

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js';

export async function initMeetingPlannerView() {
    console.log("Vergaderplanner View geïnitialiseerd.");

    const meetingForm = document.getElementById('meetingForm');
    const meetingsList = document.getElementById('meetingsList');
    const meetingIdInput = document.getElementById('meetingId');
    const meetingDateInput = document.getElementById('meetingDate');
    const meetingTimeInput = document.getElementById('meetingTime');
    const meetingSubjectInput = document.getElementById('meetingSubject');
    const meetingAttendeesInput = document.getElementById('meetingAttendees');
    const clearMeetingFormBtn = document.getElementById('clearMeetingFormBtn');

    async function loadMeetings() {
        try {
            const meetings = await getAllData('meetings');
            meetingsList.innerHTML = '';

            if (meetings.length === 0) {
                meetingsList.innerHTML = '<p class="text-gray-400">Geen vergaderingen gepland.</p>';
                return;
            }

            meetings.forEach(meeting => {
                const meetingCard = document.createElement('div');
                meetingCard.className = 'data-card';
                meetingCard.innerHTML = `
                    <div class="card-header"><h3>${meeting.subject}</h3></div>
                    <div class="sub-value">Datum: ${meeting.date} | Tijd: ${meeting.time}</div>
                    <div class="sub-value">Deelnemers: ${meeting.attendees || 'N.v.t.'}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-meeting" data-id="${meeting.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-meeting" data-id="${meeting.id}">Verwijder</button>
                    </div>
                `;
                meetingsList.appendChild(meetingCard);
            });

            meetingsList.querySelectorAll('[data-action="edit-meeting"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const meetingId = parseInt(event.target.dataset.id);
                    const meeting = await getData('meetings', meetingId);
                    if (meeting) {
                        meetingIdInput.value = meeting.id;
                        meetingDateInput.value = meeting.date;
                        meetingTimeInput.value = meeting.time;
                        meetingSubjectInput.value = meeting.subject;
                        meetingAttendeesInput.value = meeting.attendees;
                    }
                });
            });

            meetingsList.querySelectorAll('[data-action="delete-meeting"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const meetingId = parseInt(event.target.dataset.id);
                    if (confirm('Weet u zeker dat u deze vergadering wilt verwijderen?')) {
                        try {
                            await deleteData('meetings', meetingId);
                            showNotification('Vergadering verwijderd!', 'success');
                            loadMeetings();
                        } catch (error) {
                            console.error("Fout bij verwijderen vergadering:", error);
                            showNotification('Fout bij verwijderen vergadering.', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Fout bij laden vergaderingen:", error);
            showNotification("Fout bij laden vergaderingen.", "error");
        }
    }

    if (meetingForm) {
        meetingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const meeting = {
                id: meetingIdInput.value ? parseInt(meetingIdInput.value) : undefined,
                date: meetingDateInput.value,
                time: meetingTimeInput.value,
                subject: meetingSubjectInput.value,
                attendees: meetingAttendeesInput.value,
            };
            try {
                await putData('meetings', meeting);
                showNotification('Vergadering opgeslagen!', 'success');
                meetingForm.reset();
                meetingIdInput.value = '';
                loadMeetings();
            } catch (error) {
                console.error("Fout bij opslaan vergadering:", error);
                showNotification('Fout bij opslaan vergadering.', 'error');
            }
        });
    }

    if (clearMeetingFormBtn) {
        clearMeetingFormBtn.addEventListener('click', () => {
            meetingForm.reset();
            meetingIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadMeetings();
}
