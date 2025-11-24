<script>
  import { onMount } from 'svelte';
  import { crmApi, formatUtils } from '$lib/utils/api.js';
  import { toastStore } from '$lib/stores/toast.js';
  
  let customers = $state([]);
  let isLoading = $state(true);
  let filters = $state({ search: '', category: '' });
  
  async function loadCustomers() {
    try {
      isLoading = true;
      const response = await crmApi.getCustomers({ ...filters, page_size: 100 });
      customers = response.results || response;
    } catch (error) {
      console.error('Error loading customers:', error);
      toastStore.error('Ошибка загрузки клиентов');
    } finally {
      isLoading = false;
    }
  }
  
  async function syncCustomers() {
    if (!confirm('Синхронизировать клиентов из заказов?')) return;
    try {
      const result = await crmApi.syncFromOrders();
      toastStore.success(`Синхронизировано! Создано: ${result.created_count}, Всего: ${result.total_customers}`);
      loadCustomers();
    } catch (error) {
      toastStore.error('Ошибка синхронизации');
    }
  }
  
  onMount(() => {
    loadCustomers();
  });
</script>

<svelte:head>
  <title>Клиенты - Admin</title>
</svelte:head>

<div class="space-y-6 w-full">
  <div class="flex items-center justify-between flex-wrap gap-4">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Клиенты</h1>
      <p class="text-gray-500 mt-2">Управление клиентской базой и CRM</p>
    </div>
    <button 
      onclick={syncCustomers} 
      class="inline-flex items-center px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm hover:shadow-md"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      Синхронизировать из заказов
    </button>
  </div>
  
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="md:col-span-2">
        <label for="search" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Поиск</label>
        <div class="relative">
          <input 
            type="text" 
            id="search"
            bind:value={filters.search} 
            onchange={loadCustomers} 
            placeholder="Имя, телефон, email..." 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 pl-10 text-sm transition-all shadow-inner" 
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>
      <div>
        <label for="category" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Категория</label>
        <select 
          id="category"
          bind:value={filters.category} 
          onchange={loadCustomers} 
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
        >
          <option value="">Все категории</option>
          <option value="new">Новые</option>
          <option value="regular">Постоянные</option>
          <option value="vip">VIP</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>
    </div>
    
    {#if isLoading}
      <div class="p-12 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto"></div>
        <p class="text-gray-500 mt-4 font-medium">Загрузка клиентов...</p>
      </div>
    {:else if customers.length === 0}
      <div class="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        </div>
        <p class="text-gray-900 font-medium mb-1">Клиентов пока нет</p>
        <p class="text-gray-500 text-sm mb-4">База данных клиентов пуста</p>
        <button onclick={syncCustomers} class="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline">Синхронизировать из заказов</button>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Клиент</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Телефон</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Категория</th>
              <th class="hidden md:table-cell text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Заказов</th>
              <th class="hidden md:table-cell text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Потрачено</th>
              <th class="hidden md:table-cell text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Средний чек</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Последний заказ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each customers as customer}
              <tr 
                class="group hover:bg-blue-50/30 transition-colors cursor-pointer" 
                onclick={() => window.location.href = `/admin/customers/${customer.id}`}
              >
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 font-bold text-sm">
                      {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="flex flex-col">
                      <span class="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">{customer.name}</span>
                      <span class="md:hidden text-xs text-gray-500 mt-0.5">{customer.phone}</span>
                    </div>
                  </div>
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-600">{customer.phone}</td>
                <td class="hidden md:table-cell py-4 px-6">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                    customer.category === 'vip' ? 'bg-purple-100 text-purple-700' :
                    customer.category === 'regular' ? 'bg-blue-100 text-blue-700' :
                    customer.category === 'new' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  }">
                    {customer.category_display || (customer.total_orders === 1 ? 'Новый клиент' : customer.total_orders >= 2 ? 'Постоянный клиент' : 'Новый клиент')}
                  </span>
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-900 text-right font-medium">{customer.total_orders || 0}</td>
                <td class="hidden md:table-cell py-4 px-6 text-sm font-bold text-gray-900 text-right">{formatUtils.formatPrice(Number(customer.total_spent || 0))}</td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-500 text-right">{formatUtils.formatPrice(Number(customer.average_order || 0))}</td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-500">
                  {customer.last_order_date ? new Date(customer.last_order_date).toLocaleDateString('ru-RU') : '-'}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
