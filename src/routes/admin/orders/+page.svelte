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
        page_size: 100 // Максимальное допустимое значение
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

<div class="space-y-6 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Заказы</h1>
    <p class="text-gray-500 mt-2">Управление заказами и их статусами</p>
  </div>
  
  <!-- Фильтры -->
  <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-2">
        <label for="search" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Поиск
        </label>
        <input
          type="text"
          id="search"
          bind:value={filters.search}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
          placeholder="Номер заказа, имя, телефон..."
        />
      </div>
      
      <div>
        <label for="status" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Статус
        </label>
        <select
          id="status"
          bind:value={filters.status}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="date_from" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Дата от
        </label>
        <input
          type="date"
          id="date_from"
          bind:value={filters.date_from}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
        />
      </div>
      
      <div>
        <label for="date_to" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Дата до
        </label>
        <input
          type="date"
          id="date_to"
          bind:value={filters.date_to}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner"
        />
      </div>
    </div>
    
    <!-- Кнопка экспорта -->
    <div class="mt-6 flex justify-end">
      <button
        onclick={exportToExcel}
        class="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Экспорт в CSV
      </button>
    </div>
  </div>
  
  <!-- Таблица заказов -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
    {#if isLoading}
      <div class="p-12 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto"></div>
        <p class="text-gray-500 mt-4 font-medium">Загрузка заказов...</p>
      </div>
    {:else if orders.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Номер</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Клиент</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Контакты</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Адрес</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Сумма</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Статус</th>
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Дата</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each orders as order}
              <tr 
                class="group hover:bg-blue-50/30 transition-colors cursor-pointer" 
                onclick={() => handleOrderClick(order)}
              >
                <td class="py-4 px-6">
                  <span class="font-mono text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">#{order.orderNumber}</span>
                </td>
                <td class="py-4 px-6">
                  <div>
                    <p class="text-sm font-medium text-gray-900">{order.customerName}</p>
                  </div>
                </td>
                <td class="py-4 px-6">
                  <div class="flex flex-col">
                    <span class="text-sm text-gray-600">{order.customerPhone}</span>
                    {#if order.customerEmail}
                      <span class="text-xs text-gray-400">{order.customerEmail}</span>
                    {/if}
                  </div>
                </td>
                <td class="py-4 px-6">
                  <p class="text-sm text-gray-600 max-w-xs truncate" title={order.deliveryCity}>{order.deliveryCity || '-'}</p>
                </td>
                <td class="py-4 px-6">
                  <span class="text-sm font-bold text-gray-900">
                    {formatUtils.formatPrice(Number(order.totalAmount))}
                  </span>
                  <span class="text-xs text-gray-400 ml-1">({order.itemsCount || order.items?.length || 0} шт.)</span>
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm {
                    order.status === 'new' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                    order.status === 'completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'canceled' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }">
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td class="py-4 px-6 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="p-16 text-center">
        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Заказы не найдены</h3>
        <p class="text-gray-500 max-w-sm mx-auto">Попробуйте изменить параметры поиска или фильтры, чтобы найти нужные заказы.</p>
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
