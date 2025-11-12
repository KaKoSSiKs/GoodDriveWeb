<script>
  import { onMount } from 'svelte';
  import { ordersApi, formatUtils } from '$lib/utils/api.js';
  import { getStatusLabel } from '$lib/utils/status-labels.js';
  import OrderDetailModal from '$lib/components/admin/OrderDetailModal.svelte';
  
  let orders = $state([]);
  let isLoading = $state(true);
  let selectedOrder = $state(null);
  let isModalOpen = $state(false);
  
  let filters = $state({
    search: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  
  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'new', label: 'Новый заказ' },
    { value: 'processing', label: 'В обработке' },
    { value: 'shipped', label: 'Отправлен' },
    { value: 'completed', label: 'Завершён' },
    { value: 'canceled', label: 'Отменён' }
  ];
  
  async function loadOrders() {
    try {
      isLoading = true;
      const params = {
        ordering: '-created_at',
        page_size: 100
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.created_after = filters.date_from;
      if (filters.date_to) params.created_before = filters.date_to;
      
      const response = await ordersApi.getOrders(params);
      orders = response.results || [];
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      isLoading = false;
    }
  }
  
  function handleFilterChange() {
    loadOrders();
  }
  
  function handleOrderClick(order) {
    selectedOrder = order;
    isModalOpen = true;
  }
  
  function handleModalClose() {
    isModalOpen = false;
    selectedOrder = null;
  }
  
  function handleOrderUpdate() {
    loadOrders();
  }
  
  // Экспорт в Excel
  async function exportToExcel() {
    try {
      const params = {
        ordering: '-created_at',
        page_size: 1000
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.created_after = filters.date_from;
      if (filters.date_to) params.created_before = filters.date_to;
      
      // Получаем все заказы
      const response = await ordersApi.getOrders(params);
      const allOrders = response.results || [];
      
      // Формируем CSV
      let csv = 'Номер заказа;Клиент;Телефон;Email;Город;Адрес;Сумма;Статус;Дата\n';
      allOrders.forEach(order => {
        const address = (order.deliveryAddress || '').replace(/\n/g, ' ').replace(/;/g, ',');
        const city = (order.deliveryCity || '').replace(/;/g, ',');
        const email = (order.customerEmail || '').replace(/;/g, ',');
        const phone = `="${order.customerPhone}"`; // Формат для Excel чтобы не конвертировал в число
        csv += `${order.orderNumber};${order.customerName};${phone};${email};${city};${address};${order.totalAmount};${getStatusLabel(order.status)};${new Date(order.createdAt).toLocaleString('ru-RU')}\n`;
      });
      
      // Скачивание
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка экспорта заказов');
    }
  }
  
  onMount(() => {
    loadOrders();
  });
</script>

<svelte:head>
  <title>Заказы - Admin</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Заказы</h1>
    <p class="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Управление заказами клиентов</p>
  </div>
  
  <!-- Фильтры -->
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <div class="lg:col-span-2">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
          Поиск
        </label>
        <input
          type="text"
          id="search"
          bind:value={filters.search}
          onchange={handleFilterChange}
          class="input w-full"
          placeholder="Номер заказа, имя, телефон..."
        />
      </div>
      
      <div>
        <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
          Статус
        </label>
        <select
          id="status"
          bind:value={filters.status}
          onchange={handleFilterChange}
          class="input w-full"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="date_from" class="block text-sm font-medium text-gray-700 mb-2">
          Дата от
        </label>
        <input
          type="date"
          id="date_from"
          bind:value={filters.date_from}
          onchange={handleFilterChange}
          class="input w-full"
        />
      </div>
      
      <div>
        <label for="date_to" class="block text-sm font-medium text-gray-700 mb-2">
          Дата до
        </label>
        <input
          type="date"
          id="date_to"
          bind:value={filters.date_to}
          onchange={handleFilterChange}
          class="input w-full"
        />
      </div>
    </div>
    
    <!-- Кнопка экспорта -->
    <div class="mt-4 flex justify-end">
      <button
        onclick={exportToExcel}
        class="btn-outline flex items-center"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Экспорт в CSV
      </button>
    </div>
  </div>
  
  <!-- Таблица заказов -->
  <div class="bg-white rounded-xl shadow-sm overflow-hidden w-full">
    {#if isLoading}
      <div class="p-8 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-600 mt-4">Загрузка заказов...</p>
      </div>
    {:else if orders.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[800px]">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Номер заказа</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Клиент</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Телефон</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Адрес</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Товаров</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Сумма</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Статус</th>
              <th class="text-left py-4 px-6 text-sm font-semibold text-gray-700">Дата</th>
            </tr>
          </thead>
          <tbody>
            {#each orders as order}
              <tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick={() => handleOrderClick(order)}>
                <td class="py-4 px-6">
                  <span class="font-mono text-sm font-medium text-primary-600 hover:text-primary-700">{order.orderNumber}</span>
                </td>
                <td class="py-4 px-6">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{order.customerName}</p>
                    {#if order.customerEmail}
                      <p class="text-xs text-gray-500">{order.customerEmail}</p>
                    {/if}
                  </div>
                </td>
                <td class="py-4 px-6 text-sm text-gray-600">{order.customerPhone}</td>
                <td class="py-4 px-6">
                  <p class="text-sm text-gray-600 max-w-xs truncate">{order.deliveryCity}</p>
                </td>
                <td class="py-4 px-6 text-sm text-gray-600">{order.itemsCount || order.items?.length || 0} шт.</td>
                <td class="py-4 px-6 text-sm font-semibold text-gray-900">
                  {formatUtils.formatPrice(Number(order.totalAmount))}
                </td>
                  <td class="py-4 px-6">
                    <span class="px-3 py-1 text-xs font-medium rounded-full {
                      order.status === 'new' ? 'bg-orange-100 text-orange-700' :
                      order.status === 'processing' ? 'bg-indigo-100 text-indigo-700' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }">
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                <td class="py-4 px-6 text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString('ru-RU')}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="p-12 text-center">
        <svg class="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Заказы не найдены</h3>
        <p class="text-gray-600">Попробуйте изменить параметры поиска</p>
      </div>
    {/if}
  </div>
</div>

<!-- Модальное окно детального просмотра -->
<OrderDetailModal 
  order={selectedOrder}
  isOpen={isModalOpen}
  onClose={handleModalClose}
  onUpdate={handleOrderUpdate}
/>

