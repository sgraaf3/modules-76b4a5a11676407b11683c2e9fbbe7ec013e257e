// Bestand: js/views/financeView.js
// Bevat logica voor het beheren van financiële transacties (inkomsten, uitgaven),
// inclusief koppeling aan producten/diensten en leden/medewerkers.

import { getData, putData, deleteData, getAllData } from '../database.js';
import { showNotification } from './notifications.js'; // Importeer notificatiesysteem

export async function initFinanceView() {
    console.log("Financiën View geïnitialiseerd.");
    const financeView = document.getElementById('financeView');
    // Voorkom dubbele initialisatie van listeners als de view opnieuw wordt geladen zonder refresh
    if (financeView.dataset.initialized) {
        await loadTransactions(); // Laad transacties opnieuw indien al geïnitialiseerd
        return;
    }

    const financeTransactionForm = document.getElementById('financeTransactionForm');
    const transactionsList = document.getElementById('transactionsList');
    const transactionIdInput = document.getElementById('transactionId');
    const transactionTypeInput = document.getElementById('transactionType');
    const transactionAmountInput = document.getElementById('transactionAmount');
    const transactionDescriptionInput = document.getElementById('transactionDescription');
    const transactionProductServiceInput = document.getElementById('transactionProductService');
    const transactionMemberEmployeeInput = document.getElementById('transactionMemberEmployee');
    const clearTransactionFormBtn = document.getElementById('clearTransactionFormBtn');

    async function loadTransactions() {
        try {
            const transactions = await getAllData('finance');
            transactionsList.innerHTML = ''; // Maak de bestaande lijst leeg
            let totalIncome = 0;
            let totalExpense = 0;

            if (transactions.length === 0) {
                transactionsList.innerHTML = '<p class="text-gray-400">Geen transacties gevonden.</p>';
                return;
            }

            transactions.forEach(trans => {
                const transactionCard = document.createElement('div');
                transactionCard.className = 'data-card';
                const amountClass = trans.type === 'income' ? 'text-green-400' : 'text-red-400';
                const sign = trans.type === 'income' ? '+' : '-';
                transactionCard.innerHTML = `
                    <div class="card-header"><h3>${trans.description}</h3></div>
                    <div class="main-value ${amountClass}">${sign} € ${trans.amount.toFixed(2)}</div>
                    <div class="sub-value">Datum: ${new Date(trans.date).toLocaleDateString()}</div>
                    <div class="sub-value">Product/Dienst: ${trans.productService || 'N.v.t.'}</div>
                    <div class="sub-value">Betrokken: ${trans.memberEmployee || 'N.v.t.'}</div>
                    <div class="flex justify-end mt-2">
                        <button class="text-red-400 hover:text-red-300 text-sm" data-action="delete-transaction" data-id="${trans.id}">Verwijder</button>
                    </div>
                `;
                transactionsList.appendChild(transactionCard);

                if (trans.type === 'income') {
                    totalIncome += trans.amount;
                } else {
                    totalExpense += trans.amount;
                }
            });

            document.querySelector('#financeView .data-card .main-value.text-green-400').textContent = `€ ${totalIncome.toFixed(2)}`;
            document.querySelector('#financeView .data-card .main-value.text-red-400').textContent = `€ ${totalExpense.toFixed(2)}`;
            document.querySelector('#financeView .data-card:nth-child(3) .main-value').textContent = `€ ${(totalIncome - totalExpense).toFixed(2)}`;

            // Koppel event listeners voor verwijderknoppen
            transactionsList.querySelectorAll('[data-action="delete-transaction"]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const transactionId = parseInt(event.target.dataset.id);
                    // Vervang confirm() door een custom modal of notificatie met actie
                    if (confirm('Weet u zeker dat u deze transactie wilt verwijderen?')) { // Voor nu nog confirm
                        try {
                            await deleteData('finance', transactionId);
                            showNotification('Transactie verwijderd!', 'success');
                            loadTransactions();
                        } catch (error) {
                            console.error("Fout bij verwijderen transactie:", error);
                            showNotification('Fout bij verwijderen transactie.', 'error');
                        }
                    }
                });
            });
        } catch (error) {
            console.error("Fout bij laden transacties:", error);
            showNotification("Fout bij laden transacties.", "error");
        }
    }

    if (financeTransactionForm) {
        financeTransactionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const transaction = {
                id: transactionIdInput.value ? parseInt(transactionIdInput.value) : undefined,
                type: transactionTypeInput.value,
                amount: parseFloat(transactionAmountInput.value),
                description: transactionDescriptionInput.value,
                productService: transactionProductServiceInput.value, // Nieuw veld
                memberEmployee: transactionMemberEmployeeInput.value, // Nieuw veld
                date: new Date().toISOString()
            };
            try {
                await putData('finance', transaction);
                showNotification('Transactie opgeslagen!', 'success');
                financeTransactionForm.reset();
                transactionIdInput.value = '';
                loadTransactions();
            } catch (error) {
                console.error("Fout bij opslaan transactie:", error);
                showNotification('Fout bij opslaan transactie.', 'error');
            }
        });
    }

    if (clearTransactionFormBtn) {
        clearTransactionFormBtn.addEventListener('click', () => {
            financeTransactionForm.reset();
            transactionIdInput.value = '';
            showNotification('Formulier leeggemaakt.', 'info');
        });
    }

    await loadTransactions(); // Laad transacties bij initialisatie van de view
    financeView.dataset.initialized = true; // Markeer als geïnitialiseerd
}
