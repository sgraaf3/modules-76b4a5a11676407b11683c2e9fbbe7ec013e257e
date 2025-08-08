// Bestand: js/views/docsView.js
// Bevat logica voor het beheren van documenten en het koppelen ervan aan leden of lessen.

import { putData, getAllData, deleteData, getData } from '../database.js';
import { showNotification } from './notifications.js';

export async function initDocsView() {
    console.log("Documenten View geïnitialiseerd.");

    const documentUploadForm = document.getElementById('documentUploadForm');
    const documentIdInput = document.getElementById('documentId');
    const documentNameInput = document.getElementById('documentName');
    const documentDescriptionInput = document.getElementById('documentDescription');
    const documentFileInput = document.getElementById('documentFile');
    const saveDocumentBtn = document.getElementById('saveDocumentBtn');
    const clearDocumentFormBtn = document.getElementById('clearDocumentFormBtn');
    const existingDocumentsList = document.getElementById('existingDocumentsList');

    const linkDocumentForm = document.getElementById('linkDocumentForm');
    const linkDocumentSelect = document.getElementById('linkDocumentSelect');
    const linkTargetTypeSelect = document.getElementById('linkTargetType');
    const linkMemberContainer = document.getElementById('linkMemberContainer');
    const linkMemberSelect = document.getElementById('linkMemberSelect');
    const linkLessonContainer = document.getElementById('linkLessonContainer');
    const linkLessonSelect = document.getElementById('linkLessonSelect');
    const linkedDocumentsList = document.getElementById('linkedDocumentsList');

    async function loadDocuments() {
        try {
            const documents = await getAllData('documents');
            existingDocumentsList.innerHTML = '';
            linkDocumentSelect.innerHTML = '<option value="">Selecteer een document</option>';

            if (documents.length === 0) {
                existingDocumentsList.innerHTML = '<p class="text-gray-400">Geen documenten gevonden.</p>';
                return;
            }

            documents.forEach(doc => {
                const docCard = document.createElement('div');
                docCard.className = 'data-card';
                docCard.innerHTML = `
                    <div class="card-header"><h3>${doc.name}</h3></div>
                    <div class="sub-value">${doc.description || 'Geen beschrijving'}</div>
                    <div class="sub-value">Bestand: ${doc.fileName || 'N/A'}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-document" data-id="${doc.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-document" data-id="${doc.id}">Verwijder</button>
                    </div>
                `;
                existingDocumentsList.appendChild(docCard);

                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.name;
                linkDocumentSelect.appendChild(option);
            });

            existingDocumentsList.querySelectorAll('[data-action="edit-document"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const docId = parseInt(event.target.dataset.id);
                    const doc = await getData('documents', docId);
                    if (doc) {
                        documentIdInput.value = doc.id;
                        documentNameInput.value = doc.name;
                        documentDescriptionInput.value = doc.description;
                        // documentFileInput.value = ''; // Cannot set file input value for security reasons
                        showNotification('Document geladen voor bewerking.', 'info');
                    }
                });
            });

            existingDocumentsList.querySelectorAll('[data-action="delete-document"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const docId = parseInt(event.target.dataset.id);
                    if (confirm('Weet u zeker dat u dit document wilt verwijderen?')) {
                        try {
                            await deleteData('documents', docId);
                            showNotification('Document verwijderd!', 'success');
                            loadDocuments();
                            loadLinkedDocuments();
                        } catch (error) {
                            console.error("Fout bij verwijderen document:", error);
                            showNotification('Fout bij verwijderen document.', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Fout bij laden documenten:", error);
            showNotification("Fout bij laden documenten.", "error");
        }
    }

    async function loadMembersAndLessons() {
        try {
            const members = await getAllData('registry');
            const lessons = await getAllData('lessons');

            linkMemberSelect.innerHTML = '<option value="">Selecteer Lid</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                linkMemberSelect.appendChild(option);
            });

            linkLessonSelect.innerHTML = '<option value="">Selecteer Les</option>';
            lessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = lesson.id;
                option.textContent = lesson.name; // Assuming lesson has a name property
                linkLessonSelect.appendChild(option);
            });

        } catch (error) {
            console.error("Fout bij laden leden en lessen:", error);
            showNotification('Fout bij laden leden en lessen.', 'error');
        }
    }

    async function loadLinkedDocuments() {
        try {
            const linkedDocs = await getAllData('linkedDocuments');
            linkedDocumentsList.innerHTML = '';

            if (linkedDocs.length === 0) {
                linkedDocumentsList.innerHTML = '<p class="text-gray-400">Geen gekoppelde documenten gevonden.</p>';
                return;
            }

            for (const link of linkedDocs) {
                const document = await getData('documents', link.documentId);
                let targetName = 'Onbekend';
                if (link.targetType === 'member') {
                    const member = await getData('registry', link.targetId);
                    targetName = member ? member.name : targetName;
                } else if (link.targetType === 'lesson') {
                    const lesson = await getData('lessons', link.targetId);
                    targetName = lesson ? lesson.name : targetName;
                }

                if (document) {
                    const linkCard = document.createElement('div');
                    linkCard.className = 'data-card';
                    linkCard.innerHTML = `
                        <div class="card-header"><h3>${document.name} gekoppeld aan ${targetName}</h3></div>
                        <div class="sub-value">Type: ${link.targetType} | Gekoppeld op: ${new Date(link.linkedDate).toLocaleDateString()}</div>
                        <div class="flex justify-end mt-2">
                            <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-link" data-id="${link.id}">Ontkoppel</button>
                        </div>
                    `;
                    linkedDocumentsList.appendChild(linkCard);
                }
            }

            linkedDocumentsList.querySelectorAll('[data-action="delete-link"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const linkId = parseInt(event.target.dataset.id);
                    if (confirm('Weet u zeker dat u deze koppeling wilt verwijderen?')) {
                        try {
                            await deleteData('linkedDocuments', linkId);
                            showNotification('Koppeling verwijderd!', 'success');
                            loadLinkedDocuments();
                        } catch (error) {
                            console.error("Fout bij verwijderen koppeling:", error);
                            showNotification('Fout bij verwijderen koppeling.', 'error');
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Fout bij laden gekoppelde documenten:", error);
            showNotification("Fout bij laden gekoppelde documenten.", "error");
        }
    }

    if (documentUploadForm) {
        documentUploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const documentData = {
                id: documentIdInput.value ? parseInt(documentIdInput.value) : undefined,
                name: documentNameInput.value,
                description: documentDescriptionInput.value,
                fileName: documentFileInput.files.length > 0 ? documentFileInput.files[0].name : '' // Store file name
            };

            try {
                await putData('documents', documentData);
                showNotification('Document opgeslagen!', 'success');
                documentUploadForm.reset();
                documentIdInput.value = '';
                loadDocuments();
            } catch (error) {
                console.error("Fout bij opslaan document:", error);
                showNotification('Fout bij opslaan document.', 'error');
            }
        });
    }

    if (clearDocumentFormBtn) {
        clearDocumentFormBtn.addEventListener('click', () => {
            documentUploadForm.reset();
            documentIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    if (linkTargetTypeSelect) {
        linkTargetTypeSelect.addEventListener('change', (event) => {
            if (event.target.value === 'member') {
                linkMemberContainer.classList.remove('hidden');
                linkLessonContainer.classList.add('hidden');
            } else if (event.target.value === 'lesson') {
                linkMemberContainer.classList.add('hidden');
                linkLessonContainer.classList.remove('hidden');
            }
        });
        // Trigger change on load to set initial visibility
        linkTargetTypeSelect.dispatchEvent(new Event('change'));
    }

    if (linkDocumentForm) {
        linkDocumentForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const linkedDocumentData = {
                documentId: parseInt(linkDocumentSelect.value),
                targetType: linkTargetTypeSelect.value,
                targetId: parseInt(linkTargetTypeSelect.value === 'member' ? linkMemberSelect.value : linkLessonSelect.value),
                linkedDate: new Date().toISOString().split('T')[0]
            };

            try {
                await putData('linkedDocuments', linkedDocumentData);
                showNotification('Document gekoppeld!', 'success');
                linkDocumentForm.reset();
                loadLinkedDocuments();
            } catch (error) {
                console.error("Fout bij koppelen document:", error);
                showNotification('Fout bij koppelen document.', 'error');
            }
        });
    }

    await loadDocuments();
    await loadMembersAndLessons();
    await loadLinkedDocuments();
}