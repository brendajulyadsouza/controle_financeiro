const CATEGORIES = {
  income: [
    { id: 'salary', name: 'Salário', color: '#10b981' },
    { id: 'freelance', name: 'Freelance', color: '#34d399' },
    { id: 'investment', name: 'Investimentos', color: '#6ee7b7' },
    { id: 'gift', name: 'Presente', color: '#059669' },
    { id: 'other-income', name: 'Outras Entradas', color: '#047857' }
  ],
  expense: [
    { id: 'food', name: 'Alimentação', color: '#f43f5e' },
    { id: 'transport', name: 'Transporte', color: '#fb7185' },
    { id: 'housing', name: 'Moradia', color: '#fda4af' },
    { id: 'utilities', name: 'Contas', color: '#e11d48' },
    { id: 'health', name: 'Saúde', color: '#be123c' },
    { id: 'entertainment', name: 'Lazer', color: '#9f1239' },
    { id: 'shopping', name: 'Compras', color: '#881337' },
    { id: 'education', name: 'Educação', color: '#500724' },
    { id: 'other-expense', name: 'Outras Saídas', color: '#450a0a' }
  ]
};

const CAR_GOAL = {
  name: 'Jeep Renegade Longitude 1.8 2020',
  price: 75516,
  year: 2020
};

const GOAL_STORAGE_KEY = 'financepro_goal';
const STORAGE_KEY = 'financepro_data';

let transactions = [];
let currentType = 'income';
let cashflowChart = null;
let goalData = {
  saved: 0,
  monthlyContribution: 1500
};

function init() {
  loadData();
  loadGoalData();
  setCurrentDate();
  populateCategorySelect();
  setupEventListeners();
  setupGoalEventListeners();
  renderDashboard();
  renderGoalProgress();
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    transactions = JSON.parse(saved);
  }
}

function loadGoalData() {
  const saved = localStorage.getItem(GOAL_STORAGE_KEY);
  if (saved) {
    goalData = JSON.parse(saved);
  }
}

function saveGoalData() {
  localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goalData));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function setCurrentDate() {
  const date = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('currentDate').textContent = date.toLocaleDateString('pt-BR', options);
}

function populateCategorySelect() {
  const selects = document.querySelectorAll('#txCategory, #filterCategory');
  selects.forEach(select => {
    select.innerHTML = '';
    
    const incomeGroup = document.createElement('optgroup');
    incomeGroup.label = 'Entradas';
    CATEGORIES.income.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      incomeGroup.appendChild(option);
    });
    
    const expenseGroup = document.createElement('optgroup');
    expenseGroup.label = 'Saídas';
    CATEGORIES.expense.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      expenseGroup.appendChild(option);
    });
    
    select.appendChild(incomeGroup);
    select.appendChild(expenseGroup);
  });
}

function setupEventListeners() {
  document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
  
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      populateCategorySelect();
    });
  });
  
  document.getElementById('viewAllTx').addEventListener('click', () => {
    document.getElementById('filterModal').classList.add('active');
    renderAllTransactions();
  });
  
  document.getElementById('closeFilterModal').addEventListener('click', () => {
    document.getElementById('filterModal').classList.remove('active');
  });
  
  document.getElementById('filterModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('filterModal')) {
      document.getElementById('filterModal').classList.remove('active');
    }
  });
  
  document.getElementById('filterMonth').addEventListener('change', renderAllTransactions);
  document.getElementById('filterType').addEventListener('change', renderAllTransactions);
  document.getElementById('filterCategory').addEventListener('change', renderAllTransactions);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const txDate = document.getElementById('txDate').value;
  const txDescription = document.getElementById('txDescription').value;
  const txAmount = parseFloat(document.getElementById('txAmount').value);
  const txCategory = document.getElementById('txCategory').value;
  
  const transaction = {
    id: Date.now(),
    date: txDate,
    description: txDescription,
    amount: txAmount,
    type: currentType,
    category: txCategory,
    createdAt: new Date().toISOString()
  };
  
  transactions.push(transaction);
  saveData();
  renderDashboard();
  
  e.target.reset();
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
}

function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveData();
  renderDashboard();
  renderAllTransactions();
}

function clearFilters() {
  document.getElementById('filterMonth').value = '';
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterCategory').value = '';
  renderAllTransactions();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

function getCategoryInfo(categoryId) {
  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
  return allCategories.find(c => c.id === categoryId) || { name: 'Unknown', color: '#888' };
}

function getCurrentMonthTransactions() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  return transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
}

function getBalance() {
  return transactions.reduce((acc, tx) => {
    return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
  }, 0);
}

function renderDashboard() {
  renderStats();
  renderRecentTransactions();
  renderCategoryBreakdown();
  renderMonthlyOverview();
  renderCashflowChart();
}

function renderStats() {
  const currentMonthTx = getCurrentMonthTransactions();
  
  const income = currentMonthTx
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);
  
  const expense = currentMonthTx
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0);
  
  const net = income - expense;
  const balance = getBalance();
  
  document.getElementById('balanceValue').textContent = formatCurrency(balance);
  document.getElementById('monthIncomeValue').textContent = formatCurrency(income);
  document.getElementById('monthExpenseValue').textContent = formatCurrency(expense);
  document.getElementById('monthNetValue').textContent = formatCurrency(net);
  
  const netElement = document.getElementById('monthNetValue');
  netElement.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';
}

function renderRecentTransactions() {
  const container = document.getElementById('recentTransactions');
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 10);
  
  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>Nenhuma transação ainda</p>
        <small>Adicione sua primeira transação acima</small>
      </div>
    `;
    return;
  }
  
  container.innerHTML = recent.map(tx => {
    const category = getCategoryInfo(tx.category);
    const valueClass = tx.type === 'income' ? 'income' : 'expense';
    const valuePrefix = tx.type === 'income' ? '+' : '-';
    
    return `
      <div class="transaction-item">
        <div class="tx-icon ${tx.type}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${tx.type === 'income' 
              ? '<path d="M12 19V5M5 12l7-7 7 7"/>'
              : '<path d="M12 5v14M5 12l7 7 7-7"/>'}
          </svg>
        </div>
        <div class="tx-details">
          <div class="tx-description">${tx.description}</div>
          <div class="tx-category">${category.name}</div>
        </div>
        <div class="tx-value ${valueClass}">${valuePrefix}${formatCurrency(tx.amount)}</div>
        <button class="tx-delete" onclick="deleteTransaction(${tx.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');
}

function renderCategoryBreakdown() {
  const container = document.getElementById('categoryBreakdown');
  const currentMonthTx = getCurrentMonthTransactions();
  
  const expensesByCategory = {};
  currentMonthTx
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
    });
  
  const totalExpense = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);
  
  if (totalExpense === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma saída este mês</p>
      </div>
    `;
    return;
  }
  
  const sorted = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([catId, amount]) => {
      const cat = getCategoryInfo(catId);
      return { ...cat, amount, percentage: (amount / totalExpense) * 100 };
    });
  
  container.innerHTML = sorted.map(cat => `
    <div class="category-item">
      <div class="category-dot" style="background: ${cat.color}"></div>
      <div class="category-info">
        <div class="category-name">${cat.name}</div>
        <div class="category-bar">
          <div class="category-bar-fill" style="width: ${cat.percentage}%; background: ${cat.color}"></div>
        </div>
      </div>
      <div class="category-value">${formatCurrency(cat.amount)}</div>
    </div>
  `).join('');
}

function renderMonthlyOverview() {
  const container = document.getElementById('monthlyOverview');
  const monthlyData = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, expense: 0 };
    }
    
    if (tx.type === 'income') {
      monthlyData[key].income += tx.amount;
    } else {
      monthlyData[key].expense += tx.amount;
    }
  });
  
  const sorted = Object.entries(monthlyData)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);
  
  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhum dado ainda</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = sorted.map(([month, data]) => {
    const [year, m] = month.split('-');
    const monthName = new Date(year, parseInt(m) - 1).toLocaleDateString('pt-BR', { month: 'short' });
    const net = data.income - data.expense;
    const netClass = net >= 0 ? 'positive' : 'negative';
    
    return `
      <div class="monthly-item">
        <div class="monthly-month">${monthName}/${year}</div>
        <div class="monthly-values">
          <div class="monthly-income">+${formatCurrency(data.income)}</div>
          <div class="monthly-expense">-${formatCurrency(data.expense)}</div>
          <div class="monthly-net ${netClass}">${formatCurrency(net)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCashflowChart() {
  const ctx = document.getElementById('cashflowChart');
  if (!ctx) return;
  
  const monthlyData = {};
  
  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, expense: 0 };
    }
    
    if (tx.type === 'income') {
      monthlyData[key].income += tx.amount;
    } else {
      monthlyData[key].expense += tx.amount;
    }
  });
  
  const sorted = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);
  
  const labels = sorted.map(([month]) => {
    const [year, m] = month.split('-');
    return new Date(year, parseInt(m) - 1).toLocaleDateString('pt-BR', { month: 'short' });
  });
  
  const incomeData = sorted.map(([, data]) => data.income);
  const expenseData = sorted.map(([, data]) => data.expense);
  
  if (cashflowChart) {
    cashflowChart.destroy();
  }
  
  cashflowChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Entradas',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.65,
          categoryPercentage: 0.75
        },
        {
          label: 'Saídas',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.85)',
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.65,
          categoryPercentage: 0.75
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#a1a1aa',
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: { size: 12, family: 'Inter' }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(20, 20, 23, 0.95)',
          titleColor: '#f4f4f5',
          bodyColor: '#a1a1aa',
          borderColor: 'rgba(147, 51, 234, 0.2)',
          borderWidth: 1,
          padding: 14,
          displayColors: true,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#71717a', font: { size: 12 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: {
            color: '#71717a',
            font: { size: 12 },
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

function renderAllTransactions() {
  const container = document.getElementById('txTableBody');
  const filterMonth = document.getElementById('filterMonth').value;
  const filterType = document.getElementById('filterType').value;
  const filterCategory = document.getElementById('filterCategory').value;
  
  let filtered = [...transactions];
  
  if (filterMonth) {
    const [year, month] = filterMonth.split('-');
    filtered = filtered.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === parseInt(year) && txDate.getMonth() + 1 === parseInt(month);
    });
  }
  
  if (filterType !== 'all') {
    filtered = filtered.filter(tx => tx.type === filterType);
  }
  
  if (filterCategory) {
    filtered = filtered.filter(tx => tx.category === filterCategory);
  }
  
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          Nenhuma transação encontrada
        </td>
      </tr>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(tx => {
    const category = getCategoryInfo(tx.category);
    const valueClass = tx.type === 'income' ? 'tx-value-income' : 'tx-value-expense';
    const valuePrefix = tx.type === 'income' ? '+' : '-';
    
    return `
      <tr>
        <td>${formatDate(tx.date)}</td>
        <td>${tx.description}</td>
        <td>${category.name}</td>
        <td style="text-transform: capitalize;">${tx.type === 'income' ? 'Entrada' : 'Saída'}</td>
        <td class="${valueClass}">${valuePrefix}${formatCurrency(tx.amount)}</td>
        <td>
          <button class="tx-delete" onclick="deleteTransaction(${tx.id})" style="opacity: 1;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

document.getElementById('txDate').value = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', init);

function setupGoalEventListeners() {
  const setGoalBtn = document.getElementById('btnSetGoal');
  const updateSavedBtn = document.getElementById('btnUpdateSaved');
  
  if (setGoalBtn) {
    setGoalBtn.addEventListener('click', function() {
      console.log('btnSetGoal clicked');
      document.getElementById('goalModal').classList.add('active');
      calculateGoalValues();
    });
  }
  
  if (updateSavedBtn) {
    updateSavedBtn.addEventListener('click', function() {
      console.log('btnUpdateSaved clicked');
      const currentSaved = goalData.saved;
      const newSaved = prompt('Digite o valor que você tem guardado:', currentSaved);
      if (newSaved !== null && !isNaN(parseFloat(newSaved))) {
        goalData.saved = parseFloat(newSaved);
        saveGoalData();
        renderGoalProgress();
      }
    });
  }
  
  document.getElementById('closeGoalModal').addEventListener('click', () => {
    document.getElementById('goalModal').classList.remove('active');
  });
  
  document.getElementById('goalModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('goalModal')) {
      document.getElementById('goalModal').classList.remove('active');
    }
  });
  
  document.getElementById('initialSaved').addEventListener('input', calculateGoalValues);
  document.getElementById('monthlyContribution').addEventListener('input', calculateGoalValues);
  
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
}

function openGoalModal() {
  console.log('openGoalModal called');
  document.getElementById('goalModal').classList.add('active');
  calculateGoalValues();
}

function updateSavedAmount() {
  console.log('updateSavedAmount called');
  const currentSaved = goalData.saved;
  const newSaved = prompt('Digite o valor que você tem guardado:', currentSaved);
  if (newSaved !== null && !isNaN(parseFloat(newSaved))) {
    goalData.saved = parseFloat(newSaved);
    saveGoalData();
    renderGoalProgress();
  }
}

function calculateGoalValues() {
  const initialSaved = parseFloat(document.getElementById('initialSaved').value) || 0;
  const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
  
  const carPrice = CAR_GOAL.price;
  const minEntry = carPrice * 0.30;
  const financing = carPrice - initialSaved;
  const monthlyParcel = financing > 0 ? financing / 48 : 0;
  
  document.getElementById('minEntry').textContent = formatCurrency(minEntry);
  document.getElementById('financingNeeded').textContent = financing > 0 ? formatCurrency(financing) : 'R$ 0';
  document.getElementById('monthlyParcel').textContent = financing > 0 ? formatCurrency(monthlyParcel) + '/mês' : 'R$ 0';
}

function saveGoal() {
  const initialSaved = parseFloat(document.getElementById('initialSaved').value) || 0;
  const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
  
  goalData.saved = initialSaved;
  goalData.monthlyContribution = monthlyContribution;
  saveGoalData();
  
  document.getElementById('goalModal').classList.remove('active');
  renderGoalProgress();
}

function renderGoalProgress() {
  const saved = goalData.saved;
  const remaining = CAR_GOAL.price - saved;
  const percent = Math.min((saved / CAR_GOAL.price) * 100, 100);
  
  document.getElementById('savedAmount').textContent = formatCurrency(saved);
  document.getElementById('remainingAmount').textContent = formatCurrency(Math.max(0, remaining));
  document.getElementById('goalPercent').textContent = Math.round(percent);
  document.getElementById('goalProgressFill').style.width = percent + '%';
  
  const suggestedMonthly = remaining > 0 && goalData.monthlyContribution > 0 
    ? goalData.monthlyContribution 
    : Math.ceil(remaining / 24);
  document.getElementById('suggestedPayment').textContent = formatCurrency(suggestedMonthly) + '/mês';
}
