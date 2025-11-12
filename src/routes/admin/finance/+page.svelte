<script>
  import { onMount } from 'svelte';
  import { financeApi, formatUtils } from '$lib/utils/api.js';
  
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
      await loadExpenses();
      await loadSummary();
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Ошибка добавления расхода');
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
      await loadCash();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Ошибка добавления транзакции');
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

<div class="space-y-4 sm:space-y-6 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900">Финансы</h1>
    <p class="text-gray-600 mt-2">Управление финансами и отчётность</p>
  </div>
  
  <!-- Табы -->
  <div class="bg-white rounded-xl shadow-sm">
    <div class="border-b border-gray-200">
      <nav class="flex space-x-8 px-6" aria-label="Tabs">
        <button
          onclick={() => handleTabChange('summary')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {
            activeTab === 'summary' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }"
        >
          Сводка
        </button>
        <button
          onclick={() => handleTabChange('expenses')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {
            activeTab === 'expenses' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }"
        >
          Расходы
        </button>
        <button
          onclick={() => handleTabChange('cash')}
          class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {
            activeTab === 'cash' 
              ? 'border-primary-500 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Финансовая сводка</h2>
            <select
              bind:value={period}
              onchange={loadSummary}
              class="input w-48"
            >
              <option value="7">За 7 дней</option>
              <option value="30">За 30 дней</option>
              <option value="90">За 90 дней</option>
              <option value="365">За год</option>
            </select>
          </div>
          
          {#if isLoading}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              {#each Array(6) as _}
                <div class="bg-gray-100 rounded-lg p-6 animate-pulse">
                  <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div class="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Основные метрики -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <p class="text-sm opacity-90 mb-2">Выручка</p>
                <p class="text-3xl font-bold">{formatUtils.formatPrice(summary.revenue)}</p>
                <p class="text-xs opacity-75 mt-2">Заказов: {summary.orders_count}</p>
              </div>
              
              <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <p class="text-sm opacity-90 mb-2">Валовая прибыль</p>
                <p class="text-3xl font-bold">{formatUtils.formatPrice(summary.gross_profit)}</p>
                <p class="text-xs opacity-75 mt-2">Маржа: {summary.margin_percent.toFixed(1)}%</p>
              </div>
              
              <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <p class="text-sm opacity-90 mb-2">Чистая прибыль</p>
                <p class="text-3xl font-bold">{formatUtils.formatPrice(summary.net_profit)}</p>
                <p class="text-xs opacity-75 mt-2">Сред. чек: {formatUtils.formatPrice(summary.average_order)}</p>
              </div>
            </div>
            
            <!-- Детализация -->
            <div class="bg-white rounded-lg border border-gray-200 p-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Детализация</h3>
              <div class="space-y-3">
                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Выручка</span>
                  <span class="font-semibold text-gray-900">{formatUtils.formatPrice(summary.revenue)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Себестоимость товаров</span>
                  <span class="font-semibold text-red-600">-{formatUtils.formatPrice(summary.cost_of_goods)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                  <span class="text-sm font-medium text-gray-700">Валовая прибыль</span>
                  <span class="font-semibold text-green-600">{formatUtils.formatPrice(summary.gross_profit)}</span>
                </div>
                <div class="flex justify-between items-center py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Операционные расходы</span>
                  <span class="font-semibold text-red-600">-{formatUtils.formatPrice(summary.operating_expenses)}</span>
                </div>
                <div class="flex justify-between items-center py-3 bg-primary-50 -mx-6 px-6">
                  <span class="text-base font-bold text-gray-900">Чистая прибыль</span>
                  <span class="text-xl font-bold text-primary-600">{formatUtils.formatPrice(summary.net_profit)}</span>
                </div>
              </div>
            </div>
          {/if}
        </div>
        
      {:else if activeTab === 'expenses'}
        <!-- Расходы -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Расходы</h2>
            <button
              onclick={() => showAddExpense = true}
              class="btn-primary"
            >
              + Добавить расход
            </button>
          </div>
          
          {#if expenses.length === 0}
            <div class="text-center py-12 text-gray-500">
              <p>Расходов пока нет</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Дата</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Категория</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Описание</th>
                    <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {#each expenses as expense}
                    <tr class="border-t border-gray-100 hover:bg-gray-50">
                      <td class="py-3 px-4 text-sm text-gray-600">
                        {new Date(expense.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td class="py-3 px-4 text-sm text-gray-900">{expense.category_name}</td>
                      <td class="py-3 px-4 text-sm text-gray-600">{expense.description}</td>
                      <td class="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
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
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">Касса</h2>
            <button
              onclick={() => showAddTransaction = true}
              class="btn-primary"
            >
              + Добавить транзакцию
            </button>
          </div>
          
          <!-- Баланс -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <p class="text-sm text-green-700 mb-1">Приход</p>
              <p class="text-2xl font-bold text-green-600">{formatUtils.formatPrice(cashBalance.income)}</p>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-sm text-red-700 mb-1">Расход</p>
              <p class="text-2xl font-bold text-red-600">{formatUtils.formatPrice(cashBalance.expense)}</p>
            </div>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-700 mb-1">Баланс</p>
              <p class="text-2xl font-bold text-blue-600">{formatUtils.formatPrice(cashBalance.balance)}</p>
            </div>
          </div>
          
          <!-- Транзакции -->
          {#if cashTransactions.length === 0}
            <div class="text-center py-12 text-gray-500">
              <p>Транзакций пока нет</p>
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Дата</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Тип</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Способ</th>
                    <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Описание</th>
                    <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cashTransactions as transaction}
                    <tr class="border-t border-gray-100 hover:bg-gray-50">
                      <td class="py-3 px-4 text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-1 text-xs font-medium rounded-full {
                          transaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }">
                          {transaction.type_display}
                        </span>
                      </td>
                      <td class="py-3 px-4 text-sm text-gray-600">{transaction.payment_method_display}</td>
                      <td class="py-3 px-4 text-sm text-gray-600">{transaction.description}</td>
                      <td class="py-3 px-4 text-sm font-semibold text-right {
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
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Добавить расход</h3>
      <form onsubmit={(e) => { e.preventDefault(); handleAddExpense(); }} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Категория</label>
          <select bind:value={newExpense.category} required class="input w-full">
            <option value="">Выберите категорию</option>
            {#each expenseCategories as category}
              <option value={category.id}>{category.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Сумма</label>
          <input type="number" step="0.01" bind:value={newExpense.amount} required class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Дата</label>
          <input type="date" bind:value={newExpense.date} required class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea bind:value={newExpense.description} required class="input w-full" rows="3"></textarea>
        </div>
        <div class="flex space-x-3">
          <button type="submit" class="btn-primary flex-1">Добавить</button>
          <button type="button" onclick={() => showAddExpense = false} class="btn-outline flex-1">Отмена</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Модалка добавления транзакции -->
{#if showAddTransaction}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-full max-w-md">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Добавить транзакцию</h3>
      <form onsubmit={(e) => { e.preventDefault(); handleAddTransaction(); }} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Тип</label>
          <select bind:value={newTransaction.type} required class="input w-full">
            <option value="income">Приход</option>
            <option value="expense">Расход</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Сумма</label>
          <input type="number" step="0.01" bind:value={newTransaction.amount} required class="input w-full" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Способ оплаты</label>
          <select bind:value={newTransaction.payment_method} required class="input w-full">
            <option value="cash">Наличные</option>
            <option value="card">Карта</option>
            <option value="bank_transfer">Банковский перевод</option>
            <option value="online">Онлайн-оплата</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea bind:value={newTransaction.description} required class="input w-full" rows="3"></textarea>
        </div>
        <div class="flex space-x-3">
          <button type="submit" class="btn-primary flex-1">Добавить</button>
          <button type="button" onclick={() => showAddTransaction = false} class="btn-outline flex-1">Отмена</button>
        </div>
      </form>
    </div>
  </div>
{/if}

