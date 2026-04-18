const CATEGORIES = {
  income: [
    { id: "salary", name: "Salário", color: "#16a34a" },
    { id: "freelance", name: "Freelance", color: "#22c55e" },
    { id: "investment", name: "Investimentos", color: "#4ade80" },
    { id: "gift", name: "Presente", color: "#15803d" },
    { id: "other-income", name: "Outras entradas", color: "#166534" }
  ],
  expense: [
    { id: "food", name: "Alimentação", color: "#dc2626" },
    { id: "transport", name: "Transporte", color: "#ef4444" },
    { id: "housing", name: "Moradia", color: "#f87171" },
    { id: "utilities", name: "Contas", color: "#f97316" },
    { id: "health", name: "Saúde", color: "#be123c" },
    { id: "entertainment", name: "Lazer", color: "#e11d48" },
    { id: "shopping", name: "Compras", color: "#b91c1c" },
    { id: "education", name: "Educação", color: "#7f1d1d" },
    { id: "other-expense", name: "Outras saídas", color: "#450a0a" }
  ]
};

const CAR_GOAL = {
  name: "Jeep Renegade Longitude 1.8 2020",
  price: 75516,
  year: 2020,
  fipeReference: "março/2026"
};

const GOAL_STORAGE_KEY = "financepro_goal";
const STORAGE_KEY = "financepro_data";

let transactions = [];
let currentType = "income";
let cashflowChart = null;
let goalData = {
  saved: 0,
  monthlyContribution: 1500,
  targetMonths: 24
};

function init() {
  loadData();
  loadGoalData();
  setCurrentDate();
  setDefaultDateInput();
  initializeGoalSection();
  populateCategorySelect();
  setupEventListeners();
  setupGoalEventListeners();
  renderDashboard();
  renderGoalProgress();
}

function safeParseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function sanitizeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

function sanitizeMonths(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return 24;
  return number;
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParseJSON(saved, []);

  if (!Array.isArray(parsed)) {
    transactions = [];
    return;
  }

  transactions = parsed
    .map((tx) => normalizeTransaction(tx))
    .filter((tx) => tx.date && tx.category);
}

function normalizeTransaction(tx) {
  const type = tx?.type === "expense" ? "expense" : "income";
  return {
    id: Number(tx?.id) || Date.now() + Math.floor(Math.random() * 1000),
    date: tx?.date || new Date().toISOString().split("T")[0],
    description: String(tx?.description || "Transação"),
    amount: sanitizeMoney(tx?.amount),
    type,
    category: tx?.category || getDefaultCategory(type),
    createdAt: tx?.createdAt || new Date().toISOString()
  };
}

function loadGoalData() {
  const saved = localStorage.getItem(GOAL_STORAGE_KEY);
  const parsed = safeParseJSON(saved, {});

  goalData = {
    saved: sanitizeMoney(parsed.saved ?? goalData.saved),
    monthlyContribution: sanitizeMoney(parsed.monthlyContribution ?? goalData.monthlyContribution),
    targetMonths: sanitizeMonths(parsed.targetMonths ?? goalData.targetMonths)
  };
}

function saveGoalData() {
  localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goalData));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function setCurrentDate() {
  const date = new Date();
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const currentDateEl = document.getElementById("currentDate");
  if (currentDateEl) {
    currentDateEl.textContent = date.toLocaleDateString("pt-BR", options);
  }
}

function setDefaultDateInput() {
  const txDate = document.getElementById("txDate");
  if (txDate) {
    txDate.value = new Date().toISOString().split("T")[0];
  }
}

function initializeGoalSection() {
  const goalName = document.getElementById("goalCarName");
  const goalPrice = document.getElementById("goalCarPrice");
  const modalName = document.getElementById("modalGoalName");
  const modalPrice = document.getElementById("modalGoalPrice");
  const fipeText = document.querySelector(".goal-fipe-tag");

  if (goalName) goalName.textContent = CAR_GOAL.name;
  if (modalName) modalName.textContent = CAR_GOAL.name;
  if (goalPrice) goalPrice.textContent = formatCurrency(CAR_GOAL.price);
  if (modalPrice) modalPrice.textContent = formatCurrency(CAR_GOAL.price);
  if (fipeText) fipeText.textContent = `FIPE ${CAR_GOAL.fipeReference}`;
}

function getDefaultCategory(type) {
  const categories = CATEGORIES[type] || [];
  return categories.length ? categories[0].id : "";
}

function populateCategorySelect() {
  const txCategorySelect = document.getElementById("txCategory");
  const filterCategorySelect = document.getElementById("filterCategory");

  if (txCategorySelect) {
    txCategorySelect.innerHTML = "";
    const selectedCategory = txCategorySelect.value;

    CATEGORIES[currentType].forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      txCategorySelect.appendChild(option);
    });

    const hasSelected = CATEGORIES[currentType].some((cat) => cat.id === selectedCategory);
    txCategorySelect.value = hasSelected ? selectedCategory : getDefaultCategory(currentType);
  }

  if (filterCategorySelect) {
    const currentFilter = filterCategorySelect.value;
    filterCategorySelect.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Todas as categorias";
    filterCategorySelect.appendChild(allOption);

    appendCategoryGroup(filterCategorySelect, "Entradas", CATEGORIES.income);
    appendCategoryGroup(filterCategorySelect, "Saídas", CATEGORIES.expense);

    filterCategorySelect.value = currentFilter || "";
  }
}

function appendCategoryGroup(select, label, categories) {
  const group = document.createElement("optgroup");
  group.label = label;

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.id;
    option.textContent = cat.name;
    group.appendChild(option);
  });

  select.appendChild(group);
}

function setupEventListeners() {
  const form = document.getElementById("transactionForm");
  if (form) {
    form.addEventListener("submit", handleTransactionSubmit);
  }

  document.querySelectorAll(".type-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".type-btn").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      currentType = button.dataset.type;
      populateCategorySelect();
    });
  });

  const viewAllTxBtn = document.getElementById("viewAllTx");
  if (viewAllTxBtn) {
    viewAllTxBtn.addEventListener("click", () => {
      document.getElementById("filterModal").classList.add("active");
      renderAllTransactions();
    });
  }

  const closeFilterModalBtn = document.getElementById("closeFilterModal");
  if (closeFilterModalBtn) {
    closeFilterModalBtn.addEventListener("click", () => {
      document.getElementById("filterModal").classList.remove("active");
    });
  }

  const filterModal = document.getElementById("filterModal");
  if (filterModal) {
    filterModal.addEventListener("click", (event) => {
      if (event.target === filterModal) {
        filterModal.classList.remove("active");
      }
    });
  }

  const chartPeriod = document.getElementById("chartPeriod");
  if (chartPeriod) {
    chartPeriod.addEventListener("change", renderCashflowChart);
  }

  const filterMonth = document.getElementById("filterMonth");
  const filterType = document.getElementById("filterType");
  const filterCategory = document.getElementById("filterCategory");
  const clearFiltersBtn = document.getElementById("clearFilters");

  if (filterMonth) filterMonth.addEventListener("change", renderAllTransactions);
  if (filterType) filterType.addEventListener("change", renderAllTransactions);
  if (filterCategory) filterCategory.addEventListener("change", renderAllTransactions);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", clearFilters);
}

function handleTransactionSubmit(event) {
  event.preventDefault();

  const txDate = document.getElementById("txDate").value;
  const txDescription = document.getElementById("txDescription").value.trim();
  const txAmount = sanitizeMoney(document.getElementById("txAmount").value);
  const txCategory = document.getElementById("txCategory").value || getDefaultCategory(currentType);

  if (!txDate || !txDescription || txAmount <= 0 || !txCategory) {
    return;
  }

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

  event.target.reset();
  setDefaultDateInput();
  populateCategorySelect();
}

function deleteTransaction(id) {
  transactions = transactions.filter((tx) => tx.id !== id);
  saveData();
  renderDashboard();
  renderAllTransactions();
}

function clearFilters() {
  const filterMonth = document.getElementById("filterMonth");
  const filterType = document.getElementById("filterType");
  const filterCategory = document.getElementById("filterCategory");

  if (filterMonth) filterMonth.value = "";
  if (filterType) filterType.value = "all";
  if (filterCategory) filterCategory.value = "";

  renderAllTransactions();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

function formatMonthYear(date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric"
  });
}

function formatMonthsLabel(months) {
  if (months === 1) return "1 mês";
  return `${months} meses`;
}

function addMonths(baseDate, monthsToAdd) {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

function getCategoryInfo(categoryId) {
  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
  return allCategories.find((category) => category.id === categoryId) || {
    name: "Categoria",
    color: "#94a3b8"
  };
}

function getCurrentMonthTransactions() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });
}

function getBalance() {
  return transactions.reduce((accumulator, tx) => {
    return tx.type === "income" ? accumulator + tx.amount : accumulator - tx.amount;
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
    .filter((tx) => tx.type === "income")
    .reduce((accumulator, tx) => accumulator + tx.amount, 0);

  const expense = currentMonthTx
    .filter((tx) => tx.type === "expense")
    .reduce((accumulator, tx) => accumulator + tx.amount, 0);

  const net = income - expense;
  const balance = getBalance();

  document.getElementById("balanceValue").textContent = formatCurrency(balance);
  document.getElementById("monthIncomeValue").textContent = formatCurrency(income);
  document.getElementById("monthExpenseValue").textContent = formatCurrency(expense);
  document.getElementById("monthNetValue").textContent = formatCurrency(net);

  const netElement = document.getElementById("monthNetValue");
  netElement.style.color = net >= 0 ? "var(--success)" : "var(--danger)";
}

function renderRecentTransactions() {
  const container = document.getElementById("recentTransactions");
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 10);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <p>Nenhuma transação cadastrada ainda</p>
        <small>Adicione sua primeira movimentação no formulário ao lado</small>
      </div>
    `;
    return;
  }

  container.innerHTML = recent
    .map((tx) => {
      const category = getCategoryInfo(tx.category);
      const valueClass = tx.type === "income" ? "income" : "expense";
      const valuePrefix = tx.type === "income" ? "+" : "-";

      return `
        <div class="transaction-item">
          <div class="tx-icon ${tx.type}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${
                tx.type === "income"
                  ? '<path d="M12 19V5M5 12l7-7 7 7"/>'
                  : '<path d="M12 5v14M5 12l7 7 7-7"/>'
              }
            </svg>
          </div>
          <div class="tx-details">
            <div class="tx-description">${escapeHtml(tx.description)}</div>
            <div class="tx-category">${category.name}</div>
          </div>
          <div class="tx-value ${valueClass}">${valuePrefix}${formatCurrency(tx.amount)}</div>
          <button class="tx-delete" onclick="deleteTransaction(${tx.id})" aria-label="Excluir transação">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      `;
    })
    .join("");
}

function renderCategoryBreakdown() {
  const container = document.getElementById("categoryBreakdown");
  const currentMonthTx = getCurrentMonthTransactions();
  const expensesByCategory = {};

  currentMonthTx
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
    });

  const totalExpense = Object.values(expensesByCategory).reduce((accumulator, value) => accumulator + value, 0);

  if (totalExpense === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Sem saídas no mês para exibir por categoria</p>
      </div>
    `;
    return;
  }

  const sorted = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, amount]) => {
      const category = getCategoryInfo(categoryId);
      return {
        ...category,
        amount,
        percentage: (amount / totalExpense) * 100
      };
    });

  container.innerHTML = sorted
    .map(
      (category) => `
      <div class="category-item">
        <div class="category-dot" style="background: ${category.color}"></div>
        <div class="category-info">
          <div class="category-name">${category.name}</div>
          <div class="category-bar">
            <div class="category-bar-fill" style="width: ${category.percentage}%; background: ${category.color}"></div>
          </div>
        </div>
        <div class="category-value">${formatCurrency(category.amount)}</div>
      </div>
    `
    )
    .join("");
}

function renderMonthlyOverview() {
  const container = document.getElementById("monthlyOverview");
  const monthlyData = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, expense: 0 };
    }

    if (tx.type === "income") {
      monthlyData[key].income += tx.amount;
    } else {
      monthlyData[key].expense += tx.amount;
    }
  });

  const sorted = Object.entries(monthlyData)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 8);

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Sem histórico mensal por enquanto</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sorted
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split("-");
      const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString("pt-BR", {
        month: "short"
      });
      const net = data.income - data.expense;
      const netClass = net >= 0 ? "positive" : "negative";

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
    })
    .join("");
}

function buildMonthlySeries(period) {
  const now = new Date();
  const series = [];

  for (let offset = period - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("pt-BR", { month: "short" });
    series.push({ key, label });
  }

  return series;
}

function renderCashflowChart() {
  const canvas = document.getElementById("cashflowChart");
  if (!canvas) return;

  const chartPeriodSelect = document.getElementById("chartPeriod");
  const selectedPeriod = Number.parseInt(chartPeriodSelect?.value || "6", 10);
  const period = Number.isFinite(selectedPeriod) ? selectedPeriod : 6;

  const monthlyData = {};
  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyData[key]) {
      monthlyData[key] = { income: 0, expense: 0 };
    }

    if (tx.type === "income") {
      monthlyData[key].income += tx.amount;
    } else {
      monthlyData[key].expense += tx.amount;
    }
  });

  const series = buildMonthlySeries(period);
  const labels = series.map((item) => item.label);
  const incomeData = series.map((item) => monthlyData[item.key]?.income ?? 0);
  const expenseData = series.map((item) => monthlyData[item.key]?.expense ?? 0);

  if (cashflowChart) {
    cashflowChart.destroy();
  }

  cashflowChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Entradas",
          data: incomeData,
          backgroundColor: "rgba(139, 92, 246, 0.8)",
          borderColor: "#8b5cf6",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.62,
          categoryPercentage: 0.74
        },
        {
          label: "Saídas",
          data: expenseData,
          backgroundColor: "rgba(248, 113, 113, 0.8)",
          borderColor: "#f87171",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.62,
          categoryPercentage: 0.74
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            color: "#b8b8cc",
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            font: { size: 12, family: "Manrope" }
          }
        },
        tooltip: {
          backgroundColor: "rgba(20, 20, 31, 0.95)",
          titleColor: "#f0f0f5",
          bodyColor: "#b8b8cc",
          borderColor: "rgba(139, 92, 246, 0.4)",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          cornerRadius: 9,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#6b6b80", font: { size: 12, family: "Manrope" } }
        },
        y: {
          grid: { color: "rgba(139, 92, 246, 0.1)" },
          ticks: {
            color: "#6b6b80",
            font: { size: 12, family: "Manrope" },
            callback: (value) => formatCurrency(value)
          }
        }
      }
    }
  });
}

function renderAllTransactions() {
  const container = document.getElementById("txTableBody");
  const filterMonth = document.getElementById("filterMonth").value;
  const filterType = document.getElementById("filterType").value;
  const filterCategory = document.getElementById("filterCategory").value;

  let filtered = [...transactions];

  if (filterMonth) {
    const [year, month] = filterMonth.split("-");
    filtered = filtered.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === Number(year) && txDate.getMonth() + 1 === Number(month);
    });
  }

  if (filterType !== "all") {
    filtered = filtered.filter((tx) => tx.type === filterType);
  }

  if (filterCategory) {
    filtered = filtered.filter((tx) => tx.category === filterCategory);
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 28px; color: var(--text-muted);">
          Nenhuma transação encontrada para esse filtro
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = filtered
    .map((tx) => {
      const category = getCategoryInfo(tx.category);
      const valueClass = tx.type === "income" ? "tx-value-income" : "tx-value-expense";
      const valuePrefix = tx.type === "income" ? "+" : "-";

      return `
      <tr>
        <td>${formatDate(tx.date)}</td>
        <td>${escapeHtml(tx.description)}</td>
        <td>${category.name}</td>
        <td style="text-transform: capitalize;">${tx.type === "income" ? "Entrada" : "Saída"}</td>
        <td class="${valueClass}">${valuePrefix}${formatCurrency(tx.amount)}</td>
        <td>
          <button class="tx-delete" onclick="deleteTransaction(${tx.id})" aria-label="Excluir transação">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function setupGoalEventListeners() {
  const setGoalButton = document.getElementById("btnSetGoal");
  const updateSavedButton = document.getElementById("btnUpdateSaved");
  const closeGoalModalButton = document.getElementById("closeGoalModal");
  const goalModal = document.getElementById("goalModal");
  const saveGoalButton = document.getElementById("saveGoalBtn");
  const initialSavedInput = document.getElementById("initialSaved");
  const monthlyContributionInput = document.getElementById("monthlyContribution");
  const targetMonthsInput = document.getElementById("targetMonths");

  if (setGoalButton) {
    setGoalButton.addEventListener("click", openGoalModal);
  }

  if (updateSavedButton) {
    updateSavedButton.addEventListener("click", updateSavedAmount);
  }

  if (closeGoalModalButton) {
    closeGoalModalButton.addEventListener("click", closeGoalModal);
  }

  if (goalModal) {
    goalModal.addEventListener("click", (event) => {
      if (event.target === goalModal) {
        closeGoalModal();
      }
    });
  }

  if (saveGoalButton) {
    saveGoalButton.addEventListener("click", saveGoal);
  }

  if (initialSavedInput) {
    initialSavedInput.addEventListener("input", calculateGoalValues);
  }
  if (monthlyContributionInput) {
    monthlyContributionInput.addEventListener("input", calculateGoalValues);
  }
  if (targetMonthsInput) {
    targetMonthsInput.addEventListener("input", calculateGoalValues);
  }
}

function openGoalModal() {
  const modal = document.getElementById("goalModal");
  if (!modal) return;

  document.getElementById("initialSaved").value = goalData.saved ? goalData.saved.toFixed(2) : "";
  document.getElementById("monthlyContribution").value = goalData.monthlyContribution
    ? goalData.monthlyContribution.toFixed(2)
    : "";
  document.getElementById("targetMonths").value = String(goalData.targetMonths || 24);

  calculateGoalValues();
  modal.classList.add("active");
}

function updateSavedAmount() {
  openGoalModal();
  const initialSavedInput = document.getElementById("initialSaved");
  if (initialSavedInput) {
    initialSavedInput.focus();
    initialSavedInput.select();
  }
}

function closeGoalModal() {
  const modal = document.getElementById("goalModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

function calculateGoalProjection(saved, monthlyContribution, targetMonths) {
  const safeSaved = sanitizeMoney(saved);
  const safeMonthlyContribution = sanitizeMoney(monthlyContribution);
  const safeTargetMonths = sanitizeMonths(targetMonths);

  const goalPrice = CAR_GOAL.price;
  const remaining = Math.max(goalPrice - safeSaved, 0);
  const goalPercent = goalPrice > 0 ? Math.min((safeSaved / goalPrice) * 100, 100) : 0;

  const minEntry = goalPrice * 0.3;
  const remainingToEntry = Math.max(minEntry - safeSaved, 0);
  const entryPercent = minEntry > 0 ? Math.min((safeSaved / minEntry) * 100, 100) : 100;

  const requiredMonthly = remaining === 0 ? 0 : remaining / safeTargetMonths;
  const suggestedMonthly = remaining === 0
    ? 0
    : safeMonthlyContribution > 0
      ? safeMonthlyContribution
      : Math.ceil(requiredMonthly);

  let monthsToGoal = null;
  if (remaining === 0) {
    monthsToGoal = 0;
  } else if (safeMonthlyContribution > 0) {
    monthsToGoal = Math.ceil(remaining / safeMonthlyContribution);
  }

  const forecastDate = monthsToGoal === null ? null : addMonths(new Date(), monthsToGoal);
  const financingNeeded = remaining;
  const monthlyParcel = financingNeeded / 48;

  return {
    saved: safeSaved,
    monthlyContribution: safeMonthlyContribution,
    targetMonths: safeTargetMonths,
    remaining,
    goalPercent,
    minEntry,
    remainingToEntry,
    entryPercent,
    requiredMonthly,
    suggestedMonthly,
    monthsToGoal,
    forecastDate,
    financingNeeded,
    monthlyParcel
  };
}

function calculateGoalValues() {
  const initialSaved = sanitizeMoney(document.getElementById("initialSaved").value);
  const monthlyContribution = sanitizeMoney(document.getElementById("monthlyContribution").value);
  const targetMonths = sanitizeMonths(document.getElementById("targetMonths").value);
  const projection = calculateGoalProjection(initialSaved, monthlyContribution, targetMonths);

  document.getElementById("minEntry").textContent = formatCurrency(projection.minEntry);
  document.getElementById("remainingToEntry").textContent = formatCurrency(projection.remainingToEntry);
  document.getElementById("financingNeeded").textContent = formatCurrency(projection.financingNeeded);
  document.getElementById("monthlyParcel").textContent = `${formatCurrency(projection.monthlyParcel)}/mês`;
  document.getElementById("requiredMonthly").textContent = `${formatCurrency(projection.requiredMonthly)}/mês`;

  const modalForecast = document.getElementById("goalForecastModal");
  if (projection.monthsToGoal === null) {
    modalForecast.textContent = "Defina um aporte mensal";
  } else if (projection.monthsToGoal === 0) {
    modalForecast.textContent = "Meta concluída";
  } else {
    modalForecast.textContent = `${formatMonthYear(projection.forecastDate)} (${formatMonthsLabel(
      projection.monthsToGoal
    )})`;
  }
}

function saveGoal() {
  const initialSaved = sanitizeMoney(document.getElementById("initialSaved").value);
  const monthlyContribution = sanitizeMoney(document.getElementById("monthlyContribution").value);
  const targetMonths = sanitizeMonths(document.getElementById("targetMonths").value);

  goalData.saved = initialSaved;
  goalData.monthlyContribution = monthlyContribution;
  goalData.targetMonths = targetMonths;
  saveGoalData();

  closeGoalModal();
  renderGoalProgress();
}

function updateGoalStatus(projection) {
  const statusEl = document.getElementById("goalStatus");
  if (!statusEl) return;

  statusEl.classList.remove("on-track", "attention", "completed");

  if (projection.goalPercent >= 100) {
    statusEl.textContent = "Meta alcançada";
    statusEl.classList.add("completed");
    return;
  }

  if (projection.monthlyContribution <= 0) {
    statusEl.textContent="Planejamento pendente";
    statusEl.classList.add("attention");
    return;
  }

  if (projection.monthsToGoal !== null && projection.monthsToGoal <= projection.targetMonths) {
    statusEl.textContent = "No prazo";
    statusEl.classList.add("on-track");
    return;
  }

  statusEl.textContent = "Atenção necessária";
  statusEl.classList.add("attention");
}

function renderGoalProgress() {
  const projection = calculateGoalProjection(
    goalData.saved,
    goalData.monthlyContribution,
    goalData.targetMonths
  );

  document.getElementById("savedAmount").textContent = formatCurrency(projection.saved);
  document.getElementById("remainingAmount").textContent = formatCurrency(projection.remaining);
  document.getElementById("goalPercent").textContent = Math.round(projection.goalPercent);
  document.getElementById("goalPercentLabel").textContent = `${Math.round(projection.goalPercent)}%`;
  document.getElementById("goalProgressFill").style.width = `${projection.goalPercent}%`;

  document.getElementById("entryPercent").textContent = `${Math.round(projection.entryPercent)}%`;
  document.getElementById("entryProgressFill").style.width = `${projection.entryPercent}%`;

  const suggestedPaymentText = projection.remaining === 0
    ? "Meta concluída"
    : `${formatCurrency(projection.suggestedMonthly)}/mês`;
  document.getElementById("suggestedPayment").textContent = suggestedPaymentText;

  const forecastEl = document.getElementById("goalForecast");
  if (projection.monthsToGoal === null) {
    forecastEl.textContent = "Sem previsão";
  } else if (projection.monthsToGoal === 0) {
    forecastEl.textContent = "Disponível agora";
  } else {
    forecastEl.textContent = formatMonthYear(projection.forecastDate);
  }

  const monthsLeftEl = document.getElementById("goalMonthsLeft");
  if (projection.monthsToGoal === null) {
    monthsLeftEl.textContent = "Defina aporte";
  } else if (projection.monthsToGoal === 0) {
    monthsLeftEl.textContent = "Meta finalizada";
  } else {
    monthsLeftEl.textContent = formatMonthsLabel(projection.monthsToGoal);
  }

  updateGoalStatus(projection);
}

document.addEventListener("DOMContentLoaded", init);
