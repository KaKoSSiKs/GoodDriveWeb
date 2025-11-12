<script>
  import { onMount } from 'svelte';
  import { crmApi, formatUtils } from '$lib/utils/api.js';
  
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
    } finally {
      isLoading = false;
    }
  }
  
  async function syncCustomers() {
    if (!confirm('Синхронизировать клиентов из заказов?')) return;
    try {
      const result = await crmApi.syncFromOrders();
      alert(`Синхронизировано! Создано: ${result.created_count}, Всего: ${result.total_customers}`);
      loadCustomers();
    } catch (error) {
      alert('Ошибка синхронизации');
    }
  }
  
  onMount(() => {
    loadCustomers();
  });
</script>

<svelte:head>
  <title>Клиенты - Admin</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6 w-full">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Клиенты (CRM)</h1>
      <p class="text-gray-600 mt-2">Управление клиентской базой</p>
    </div>
    <button onclick={syncCustomers} class="btn-primary">Синхронизировать из заказов</button>
  </div>
  
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <input type="text" bind:value={filters.search} onchange={loadCustomers} placeholder="Поиск..." class="input col-span-2" />
      <select bind:value={filters.category} onchange={loadCustomers} class="input">
        <option value="">Все категории</option>
        <option value="new">Новые</option>
        <option value="regular">Постоянные</option>
        <option value="vip">VIP</option>
        <option value="inactive">Неактивные</option>
      </select>
    </div>
    
    {#if isLoading}
      <div class="text-center py-8">Загрузка...</div>
    {:else if customers.length === 0}
      <div class="text-center py-12 text-gray-500">
        <p>Клиентов пока нет</p>
        <button onclick={syncCustomers} class="btn-outline mt-4">Синхронизировать из заказов</button>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Клиент</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Телефон</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Категория</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Заказов</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Потрачено</th>
              <th class="text-right py-3 px-4 text-sm font-semibold text-gray-700">Средний чек</th>
              <th class="text-left py-3 px-4 text-sm font-semibold text-gray-700">Последний заказ</th>
            </tr>
          </thead>
          <tbody>
            {#each customers as customer}
              <tr class="border-t border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4 text-sm font-medium text-gray-900">{customer.name}</td>
                <td class="py-3 px-4 text-sm text-gray-600">{customer.phone}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-1 text-xs font-medium rounded-full {
                    customer.category === 'vip' ? 'bg-purple-100 text-purple-700' :
                    customer.category === 'regular' ? 'bg-blue-100 text-blue-700' :
                    customer.category === 'new' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }">
                    {customer.category_display}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm text-gray-900 text-right">{customer.total_orders}</td>
                <td class="py-3 px-4 text-sm font-semibold text-gray-900 text-right">{formatUtils.formatPrice(Number(customer.total_spent))}</td>
                <td class="py-3 px-4 text-sm text-gray-600 text-right">{formatUtils.formatPrice(Number(customer.average_order))}</td>
                <td class="py-3 px-4 text-sm text-gray-600">
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

