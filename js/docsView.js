// Bestand: js/views/docsView.js
// Bevat logica voor het beheren van documenten (CRUD-operaties).

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initDocsView() {
    console.log("Documenten View geïnitialiseerd.");

    const documentsList = document.getElementById('documentsList');
    const documentForm = document.getElementById('documentForm');
    const documentIdInput = document.getElementById('documentId');
    const documentTitleInput = document.getElementById('documentTitle');
    const documentDescriptionInput = document.getElementById('documentDescription');
    const documentFileNameInput = document.getElementById('documentFileName');
    const documentCategoryInput = document.getElementById('documentCategory');
    const clearDocumentFormBtn = document.getElementById('clearDocumentFormBtn');

    async function loadDocuments() {
        try {
            const documents = await getAllData('documents'); // 'documents' is de store voor documenten
            documentsList.innerHTML = ''; // Maak de bestaande lijst leeg

            if (documents.length === 0) {
                documentsList.innerHTML = '<p class="text-gray-400">Geen documenten gevonden.</p>';
                return;
            }

            documents.forEach(doc => {
                const documentCard = document.createElement('div');
                documentCard.className = 'data-card';
                documentCard.innerHTML = `
                    <div class="card-header"><h3>${doc.title}</h3></div>
                    <div class="sub-value">Categorie: ${doc.category || 'N.v.t.'}</div>
                    <div class="sub-value">${doc.description || 'Geen beschrijving'}</div>
                    <div class="sub-value">Bestand: <a href="${doc.fileName}" target="_blank" class="text-blue-400 hover:underline">${doc.fileName || 'N.v.t.'}</a></div>
                    <div class="flex justify-end mt-2">
                        <button class="text-blue-400 hover:text-blue-300 text-sm mr-2" data-action="edit-document" data-id="${doc.id}">Bewerk</button>
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-document" data-id="${doc.id}">Verwijder</button>
                    </div>
                `;
                documentsList.appendChild(documentCard);
            });

            // Voeg event listeners toe voor bewerk/verwijder knoppen
            documentsList.querySelectorAll('[data-action="edit-document"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const docId = parseInt(event.target.dataset.id);
                    const document = await getData('documents', docId);
                    if (document) {
                        documentIdInput.value = document.id;
                        documentTitleInput.value = document.title;
                        documentDescriptionInput.value = document.description;
                        documentFileNameInput.value = document.fileName;
                        documentCategoryInput.value = document.category;
                    }
                });
            });

            documentsList.querySelectorAll('[data-action="delete-document"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const docId = parseInt(event.target.dataset.id);
                    // Vervang confirm() door een custom modal of notificatie met actie
                    if (confirm('Weet u zeker dat u dit document wilt verwijderen?')) { // Voor nu nog confirm
                        try {
                            await deleteData('documents', docId);
                            showNotification('Document verwijderd!', 'success');
                            loadDocuments(); // Herlaad de lijst
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

    if (documentForm) {
        documentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const document = {
                id: documentIdInput.value ? parseInt(documentIdInput.value) : undefined, // Gebruik undefined voor autoIncrement
                title: documentTitleInput.value,
                description: documentDescriptionInput.value,
                fileName: documentFileNameInput.value,
                category: documentCategoryInput.value,
                dateAdded: new Date().toISOString() // Voeg een datum toe
            };
            try {
                await putData('documents', document);
                showNotification('Document opgeslagen!', 'success');
                documentForm.reset();
                documentIdInput.value = ''; // Maak verborgen ID leeg
                loadDocuments(); // Herlaad de lijst
            } catch (error) {
                console.error("Fout bij opslaan document:", error);
                showNotification('Fout bij opslaan document.', 'error');
            }
        });
    }

    if (clearDocumentFormBtn) {
        clearDocumentFormBtn.addEventListener('click', () => {
            documentForm.reset();
            documentIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadDocuments(); // Laad documenten bij initialisatie van de view
}
