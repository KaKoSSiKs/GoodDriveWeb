<script>
  import { onMount } from 'svelte';
  import { financeApi, formatUtils } from '$lib/utils/api.js';
  import { toastStore } from '$lib/stores/toast.js';
  
  let activeTab = $state('summary'); // summary, expenses, cash
  let isLoading = $state(true);
  
  // Сводка
  let summary = $state({
    revenue: 0,
    cost_of_goods: 0,
    gross_profit: 0,
    operating_expenses: 0,
    net_profit: 0,
    margin_percent: 0,
    orders_count: 0,
    average_order: 0
  });
  
  let period = $state('30');
  
  // Расходы
  let expenses = $state([]);
  let expenseCategories = $state([]);
  let showAddExpense = $state(false);
  let newExpense = $state({
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Касса
  let cashBalance = $state({
    income: 0,
    expense: 0,
    balance: 0
  });
  let cashTransactions = $state([]);
  let showAddTransaction = $state(false);
  let newTransaction = $state({
    type: 'income',
    amount: '',
    payment_method: 'cash',
    description: '',
    date: new Date().toISOString()
  });
  
  async function loadSummary() {
    try {
      isLoading = true;
      const data = await financeApi.getProfitSummary(period);
      summary = data;
    } catch (error) {
      console.error('Error loading summary:', error);
      toastStore.error('Ошибка загрузки сводки');
    } finally {
      isLoading = false;
    }
  }
  
  async function loadExpenses() {
    try {
      const [expensesData, categoriesData] = await Promise.all([
        financeApi.getExpenses({ page_size: 100, ordering: '-date' }),
        financeApi.getExpenseCategories()
      ]);
      expenses = expensesData.results || expensesData;
      expenseCategories = categoriesData.results || categoriesData;
    } catch (error) {
      console.error('Error loading expenses:', error);
      toastStore.error('Ошибка загрузки расходов');
    }
  }
  
  async function loadCash() {
    try {
      const [balanceData, transactionsData] = await Promise.all([
        financeApi.getBalance(),
        financeApi.getCashTransactions({ page_size: 50, ordering: '-date' })
      ]);
      cashBalance = balanceData;
      cashTransactions = transactionsData.results || transactionsData;
    } catch (error) {
      console.error('Error loading cash:', error);
      toastStore.error('Ошибка загрузки кассы');
    }
  }
  
  async function handleAddExpense() {
    try {
      await financeApi.createExpense(newExpense);
      showAddExpense = false;
      newExpense = {
        category: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      };
      toastStore.success('Расход добавлен');
      await loadExpenses();
      await loadSummary();
    } catch (error) {
      console.error('Error adding expense:', error);
      toastStore.error('Ошибка добавления расхода');
    }
  }
  
  async function handleAddTransaction() {
    try {
      await financeApi.createCashTransaction(newTransaction);
      showAddTransaction = false;
      newTransaction = {
        type: 'income',
        amount: '',
        payment_method: 'cash',
        description: '',
        date: new Date().toISOString()
      };
      toastStore.success('Транзакция добавлена');
      await loadCash();
    } catch (error) {
      console.error('Error adding transaction:', error);
      toastStore.error('Ошибка добавления транзакции');
    }
  }
  
  function handleTabChange(tab) {
    activeTab = tab;
    if (tab === 'expenses' && expenses.length === 0) {
      loadExpenses();
    } else if (tab === 'cash' && cashTransactions.length === 0) {
      loadCash();
    }
  }
  
  onMount(() => {
    loadSummary();
  });
</script>

<svelte:head>
  <title>Финансы - Admin</title>
</svelte:head>

<div class="space-y-6 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Финансы</h1>
    <p class="text-gray-500 mt-2">Управление финансами и отчетность</p>
  </div>
  
  <!-- Табы -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="border-b border-gray-100">
      <nav class="flex space-x-1 p-2" aria-label="Tabs">
        <button
          onclick={() => handleTabChange('summary')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
            activeTab === 'summary' 
              ? 'bg-gray-900 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }"
        >
          Сводка
        </button>
        <button
          onclick={() => handleTabChange('expenses')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
            activeTab === 'expenses' 
              ? 'bg-gray-900 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }"
        >
          Расходы
        </button>
        <button
          onclick={() => handleTabChange('cash')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all {
            activeTab === 'cash' 
              ? 'bg-gray-900 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }"
        >
          Касса
        </button>
      </nav>
    </div>
    
    <div class="p-6">
      {#if activeTab === 'summary'}
        <!-- Сводка -->
        <div class="space-y-6">
          <!-- Фильтр периода -->
          <div class="flex items-center justify-between flex-wrap gap-4">
            <h2 class="text-lg font-bold text-gray-900">Финансовая сводка</h2>
            <select
              bind:value={period}
              onchange={loadSummary}
              class="bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-2 text-sm transition-all shadow-inner cursor-pointer"
            >
              <option value="7">За 7 дней</option>
              <option value="30">За 30 дней</option>
              <option value="90">За 90 дней</option>
              <option value="365">За год</option>
            </select>
          </div>
          
          {#if isLoading}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              {#each Array(3) as _}
                <div class="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-32"></div>
              {/each}
            </div>
          {:else}
            <!-- Основные метрики -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <p class="text-sm font-medium text-gray-500 mb-1">Выручка</p>
                <p class="text-3xl font-bold text-gray-900">{formatUtils.formatPrice(summary.revenue)}</p>
                <div class="mt-2 flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-lg w-fit">
                  Заказов: {summary.orders_count}
                </div>
              </div>
              
              <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <p class="text-sm font-medium text-gray-500 mb-1">Валовая прибыль</p>
                <p class="text-3xl font-bold text-green-600">{formatUtils.formatPrice(summary.gross_profit)}</p>
                <div class="mt-2 flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg w-fit">
                  Маржа: {summary.margin_percent.toFixed(1)}%
                </div>
              </div>
              
              <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
                <p class="text-sm font-medium text-gray-500 mb-1">Чистая прибыль</p>
                <p class="text-3xl font-bold text-purple-600">{formatUtils.formatPrice(summary.net_profit)}</p>
                <div class="mt-2 flex items-center text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-lg w-fit">
                  Сред. чек: {formatUtils.formatPrice(summary.average_order)}
                </div>
              </div>
            </div>
            
            <!-- Детализация -->
            <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Детализация</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                  <span class="text-sm font-medium text-gray-600">Выручка</span>
                  <span class="font-bold text-gray-900">{formatUtils.formatPrice(summary.revenue)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                  <span class="text-sm font-medium text-gray-600">Себестоимость товаров</span>
                  <span class="font-bold text-red-500">-{formatUtils.formatPrice(summary.cost_of_goods)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                  <span class="text-sm font-medium text-gray-900">Валовая прибыль</span>
                  <span class="font-bold text-green-600">{formatUtils.formatPrice(summary.gross_profit)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                  <span class="text-sm font-medium text-gray-600">Операционные расходы</span>
                  <span class="font-bold text-red-500">-{formatUtils.formatPrice(summary.operating_expenses)}</span>
                </div>
                <div class="flex justify-between items-center pt-2">
                  <span class="text-base font-bold text-gray-900">Чистая прибыль</span>
                  <span class="text-xl font-bold text-gray-900">{formatUtils.formatPrice(summary.net_profit)}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
        
      {:else if activeTab === 'expenses'}
        <!-- Расходы -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">Расходы</h2>
            <button
              onclick={() => showAddExpense = true}
              class="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Добавить расход
            </button>
          </div>
          
          {#if expenses.length === 0}
            <div class="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <p class="text-gray-500">Расходов пока нет</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50/50">
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Дата</th>
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Категория</th>
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Описание</th>
                    <th class="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Сумма</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {#each expenses as expense}
                    <tr class="hover:bg-gray-50/30 transition-colors">
                      <td class="py-3 px-4 text-sm text-gray-600">
                        {new Date(expense.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td class="py-3 px-4 text-sm font-medium text-gray-900">{expense.category_name}</td>
                      <td class="py-3 px-4 text-sm text-gray-600">{expense.description}</td>
                      <td class="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                        {formatUtils.formatPrice(Number(expense.amount))}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
        
      {:else if activeTab === 'cash'}
        <!-- Касса -->
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-gray-900">Касса</h2>
            <button
              onclick={() => showAddTransaction = true}
              class="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Добавить транзакцию
            </button>
          </div>
          
          <!-- Баланс -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-green-50 border border-green-100 rounded-2xl p-6">
              <p class="text-sm font-medium text-green-700 mb-1">Приход</p>
              <p class="text-2xl font-bold text-green-800">{formatUtils.formatPrice(cashBalance.income)}</p>
            </div>
            <div class="bg-red-50 border border-red-100 rounded-2xl p-6">
              <p class="text-sm font-medium text-red-700 mb-1">Расход</p>
              <p class="text-2xl font-bold text-red-800">{formatUtils.formatPrice(cashBalance.expense)}</p>
            </div>
            <div class="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p class="text-sm font-medium text-blue-700 mb-1">Баланс</p>
              <p class="text-2xl font-bold text-blue-800">{formatUtils.formatPrice(cashBalance.balance)}</p>
            </div>
          </div>
          
          <!-- Транзакции -->
          {#if cashTransactions.length === 0}
            <div class="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <p class="text-gray-500">Транзакций пока нет</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-gray-100 bg-gray-50/50">
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Дата</th>
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Тип</th>
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Способ</th>
                    <th class="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Описание</th>
                    <th class="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Сумма</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {#each cashTransactions as transaction}
                    <tr class="hover:bg-gray-50/30 transition-colors">
                      <td class="py-3 px-4 text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td class="py-3 px-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                          transaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }">
                          {transaction.type_display}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-sm text-gray-600">{transaction.payment_method_display}</td>
                      <td class="py-3 px-4 text-sm text-gray-600">{transaction.description}</td>
                      <td class="py-3 px-4 text-sm font-bold text-right {
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }">
                        {transaction.type === 'income' ? '+' : '-'}{formatUtils.formatPrice(Number(transaction.amount))}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Модалка добавления расхода -->
{#if showAddExpense}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-bold text-gray-900">Добавить расход</h3>
        <button onclick={() => showAddExpense = false} class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit={(e) => { e.preventDefault(); handleAddExpense(); }} class="p-6 space-y-4">
        <div>
          <label for="expense-category" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Категория</label>
          <select id="expense-category" bind:value={newExpense.category} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer">
            <option value="">Выберите категорию</option>
            {#each expenseCategories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="expense-amount" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Сумма</label>
          <input id="expense-amount" type="number" step="0.01" bind:value={newExpense.amount} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" placeholder="0.00" />
        </div>
        <div>
          <label for="expense-date" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Дата</label>
          <input id="expense-date" type="date" bind:value={newExpense.date} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" />
        </div>
        <div>
          <label for="expense-description" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Описание</label>
          <textarea id="expense-description" bind:value={newExpense.description} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner resize-none" rows="3" placeholder="Комментарий..."></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" class="flex-1 btn-primary py-2.5 rounded-xl">Добавить</button>
          <button type="button" onclick={() => showAddExpense = false} class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors">Отмена</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Модалка добавления транзакции -->
{#if showAddTransaction}
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-lg font-bold text-gray-900">Добавить транзакцию</h3>
        <button onclick={() => showAddTransaction = false} class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <form onsubmit={(e) => { e.preventDefault(); handleAddTransaction(); }} class="p-6 space-y-4">
        <div>
          <label for="transaction-type" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Тип</label>
          <select id="transaction-type" bind:value={newTransaction.type} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer">
            <option value="income">Приход</option>
            <option value="expense">Расход</option>
          </select>
        </div>
        <div>
          <label for="transaction-amount" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Сумма</label>
          <input id="transaction-amount" type="number" step="0.01" bind:value={newTransaction.amount} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" placeholder="0.00" />
        </div>
        <div>
          <label for="transaction-payment-method" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Способ оплаты</label>
          <select id="transaction-payment-method" bind:value={newTransaction.payment_method} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer">
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="bank_transfer">Банковский перевод</option>
            <option value="online">Онлайн-оплата</option>
          </select>
        </div>
        <div>
          <label for="transaction-description" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Описание</label>
          <textarea id="transaction-description" bind:value={newTransaction.description} required class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner resize-none" rows="3" placeholder="Комментарий..."></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" class="flex-1 btn-primary py-2.5 rounded-xl">Добавить</button>
          <button type="button" onclick={() => showAddTransaction = false} class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors">Отмена</button>
        </div>
      </form>
    </div>
  </div>
{/if}
