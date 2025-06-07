document.addEventListener('DOMContentLoaded', function() {
    // Références aux éléments DOM
    const typeInput = document.getElementById('type');
    const montantInput = document.getElementById('montant');
    const dateInput = document.getElementById('date');
    const ajouterTransactionBtn = document.getElementById('ajouterTransaction');
    const messageDiv = document.getElementById('message');
    const soldeSpan = document.getElementById('solde');
    const transactionsList = document.getElementById('transactions-list');
    const monthlyRevenuesSpan = document.getElementById('monthly-revenues');
    const monthlyExpensesSpan = document.getElementById('monthly-expenses');
    const chartCanvas = document.getElementById('myChart');
    const chartCtx = chartCanvas.getContext('2d');
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.main-content > div.card');
    const inputSection = document.querySelector('.input-section');

    // État de l'application
    let transactions = [];

    let myChart;

    // Index de la transaction en cours d'édition (-1 si aucune). 
    let editingIndex = -1;

    /**
     * Affiche un message de feedback temporaire.
     * @function afficherFeedback
     * @param {string} message - Texte à afficher.
     * @param {'success'|'danger'} typeCouleur - Type de message (détermine le style).
     */
    function afficherFeedback(message, typeCouleur) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${typeCouleur}`;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 3000);
    }

    /**
     * Calcule et met à jour l'affichage du solde total.
     * @function mettreAJourSolde
     */
    function mettreAJourSolde() {
        const total = transactions.reduce((acc, t) =>
            t.type === 'revenu' ? acc + parseFloat(t.montant) : acc - parseFloat(t.montant), 0);
        soldeSpan.textContent = total.toFixed(2) + ' DH';
    }

    /**
     * Calcule le récapitulatif mensuel.
     * @function mettreAJourReacapitulatifMensuel
     */
    function mettreAJourReacapitulatifMensuel() {
        const maintenant = new Date();
        const moisCourant = maintenant.getMonth();
        const anneeCourante = maintenant.getFullYear();

        const mensuel = transactions.reduce((acc, t) => {
            const date = new Date(t.date);
            if (date.getMonth() === moisCourant && date.getFullYear() === anneeCourante) {
                t.type === 'revenu'
                    ? acc.revenus += parseFloat(t.montant)
                    : acc.depenses += parseFloat(t.montant);
            }
            return acc;
        }, { revenus: 0, depenses: 0 });

        monthlyRevenuesSpan.textContent = mensuel.revenus.toFixed(2);
        monthlyExpensesSpan.textContent = mensuel.depenses.toFixed(2);
    }

    let dernierMois = localStorage.getItem('dernierMois') || new Date().getMonth();

    /**
     *  Si le mois a changé, réinitialise les transactions et met à jour l'affichage.
     * @function verifierChangementDeMois
     */
    function verifierChangementDeMois() {
        const moisActuel = new Date().getMonth();
        if (moisActuel != dernierMois) {
            transactions = [];
            localStorage.setItem('transactions', JSON.stringify(transactions));
            dernierMois = moisActuel;
            localStorage.setItem('dernierMois', dernierMois);
            afficherFeedback('Nouveau mois : transactions réinitialisées', 'success');
            mettreAJourTout();
        }
    }

    /**
     * Génère l'affichage des transactions.
     * @function afficherTransactions
     */
    function afficherTransactions() {
        transactionsList.innerHTML = '';
        transactions.forEach((t, index) => {
            const li = document.createElement('li');
            li.className = t.type === 'depense' ? 'depense' : 'revenu';
            if(index === editingIndex) li.classList.add('editing');
            li.innerHTML = `
                <div class="transaction-info">
                    <span>${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</span>
                    <span>${parseFloat(t.montant).toFixed(2)} DH</span>
                    <span>${new Date(t.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="transaction-actions">
                    <button class="btn-action btn-edit" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            transactionsList.appendChild(li);
        });

        // Gestion des suppressions
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                transactions.splice(index, 1);
                afficherFeedback('Transaction supprimée', 'danger');
                mettreAJourTout();
            });
        });

        // Gestion des modifications
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', function() {
                editingIndex = parseInt(this.dataset.index);
                const t = transactions[editingIndex];
                typeInput.value = t.type;
                montantInput.value = t.montant;
                dateInput.value = t.date;
                afficherFeedback('Mode édition activé', 'success');
            });
        });
    }


    /**
     * Met à jour le graphique des tendances financières.
     * @function mettreAJourGraphique
     */
    function mettreAJourGraphique() {
        if (myChart) myChart.destroy();

        if (transactions.length === 0) {
        // Affiche un graphique vide avec axes
        myChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Aucune donnée',
                        data: [],
                        borderColor: '#ccc'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Aucune donnée à afficher', color : '#000' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        return;
    }

        const transactionsParDate = transactions.reduce((acc, t) => {
            const date = new Date(t.date).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = { revenus: 0, depenses: 0 };

            t.type === 'revenu'
                ? acc[date].revenus += parseFloat(t.montant)
                : acc[date].depenses += parseFloat(t.montant);

            return acc;
        }, {});

        const dates = Object.keys(transactionsParDate).sort((a, b) => new Date(a) - new Date(b));

        const config = {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Revenus',
                        data: dates.map(date => transactionsParDate[date].revenus),
                        borderColor: '#4BC0C0',
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Dépenses',
                        data: dates.map(date => transactionsParDate[date].depenses),
                        borderColor: '#FF6384',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                stacked: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Tendances financières' }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Revenus' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: 'Dépenses' }
                    }
                }
            }
        };

            myChart = new Chart(chartCtx, config);
        }

    /**
     * Met à jour toutes les composantes de l'interface.
     * @function mettreAJourTout
     */
    function mettreAJourTout() {
        verifierChangementDeMois();
        mettreAJourSolde();
        mettreAJourReacapitulatifMensuel();
        afficherTransactions();
        mettreAJourGraphique();
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    // Gestionnaire d'événement pour l'ajout/modification
    ajouterTransactionBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const type = typeInput.value;
        const montant = parseFloat(montantInput.value);
        const date = dateInput.value;

        if (!type || isNaN(montant) || montant <= 0 || !date) {
            afficherFeedback('Veuillez remplir tous les champs', 'danger');
            return;
        }

        if (editingIndex > -1) {
            transactions[editingIndex] = { type, montant: montant.toFixed(2), date };
            afficherFeedback('Transaction modifiée', 'success');
            editingIndex = -1;
        } else {
            transactions.push({ type, montant: montant.toFixed(2), date });
            afficherFeedback('Transaction ajoutée', 'success');
        }

        montantInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
        mettreAJourTout();
    });

    // Gestion de la navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(nl => nl.classList.remove('active'));
            this.classList.add('active');
            const section = this.dataset.section;
            contentSections.forEach(s => s.classList.add('hidden'));
            document.getElementById(section).classList.remove('hidden');
            inputSection.classList.remove('hidden');
            localStorage.setItem('activeSection', section);
        });
    });


    const savedTransactions = localStorage.getItem('transactions');
    if (savedTransactions) transactions = JSON.parse(savedTransactions);

    dateInput.value = new Date().toISOString().split('T')[0];
    mettreAJourTout();

    const activeSection = localStorage.getItem('activeSection') || 'overview';
    document.querySelector(`[data-section="${activeSection}"]`).click();
});

//  Gestion du mode sombre (dark mode) 
document.getElementById('theme-toggle-btn').addEventListener('click', function() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        this.textContent = '🌙 Mode sombre';
    } else {
        body.setAttribute('data-theme', 'dark');
        this.textContent = '☀️ Mode clair';
    }
});

//  Masquer le bouton dark mode lors du scroll 
const themeBtn = document.getElementById('theme-toggle-btn');
window.addEventListener('scroll', function() {
    if (window.scrollY > 10) {
        themeBtn.style.opacity = '0';
        themeBtn.style.pointerEvents = 'none';
    } else {
        themeBtn.style.opacity = '1';
        themeBtn.style.pointerEvents = 'auto';
    }
});