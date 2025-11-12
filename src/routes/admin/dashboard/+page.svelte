<script>
  import { onMount } from 'svelte';
  import { ordersApi, partsApi } from '$lib/utils/api.js';
  import { getStatusLabel } from '$lib/utils/status-labels.js';
  
  let stats = $state({
    totalOrders: 0,
    newOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    totalParts: 0,
    lowStock: 0
  });
  
  let recentOrders = $state([]);
  let isLoading = $state(true);
  
  async function loadStats() {
    try {
      isLoading = true;
      
      // Загружаем статистику заказов
      const ordersStats = await ordersApi.getOrderStatistics();
      stats.totalOrders = ordersStats.total || 0;
      
      // Подсчёт заказов по статусам (API возвращает напрямую в корне)
      stats.newOrders = ordersStats.new || 0;
      stats.processingOrders = ordersStats.processing || 0;
      stats.shippedOrders = ordersStats.shipped || 0;
      stats.completedOrders = ordersStats.completed || 0;
      stats.canceledOrders = ordersStats.canceled || 0;
      
      // Загружаем статистику товаров
      const partsResponse = await partsApi.getParts({ page_size: 1 });
      stats.totalParts = partsResponse.count || 0;
      
      // Товары с низким остатком
      const lowStockResponse = await partsApi.getLowStockParts({ page_size: 1 });
      stats.lowStock = lowStockResponse.count || 0;
      
      // Последние заказы
      const ordersResponse = await ordersApi.getOrders({ page_size: 5, ordering: '-created_at' });
      recentOrders = ordersResponse.results || [];
      
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    loadStats();
  });
</script>

<svelte:head>
  <title>Панель управления - Admin</title>
</svelte:head>

<div class="space-y-6 sm:space-y-8 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Панель управления</h1>
    <p class="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Обзор системы GoodDrive</p>
  </div>
  
  {#if isLoading}
    <!-- Загрузка -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each Array(4) as _}
        <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Статистика заказов -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Статистика заказов</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <!-- Первый уровень -->
        <div class="bg-gradient-to-br from-primary-600 to-brand-700 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">Всего заказов</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.totalOrders}</p>
        </div>
        
        <div class="bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">Новый заказ</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.newOrders}</p>
        </div>
        
        <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">В обработке</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.processingOrders}</p>
        </div>
        
        <!-- Второй уровень -->
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">Отправлен</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.shippedOrders}</p>
        </div>
        
        <div class="bg-gradient-to-br from-success-500 to-success-600 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">Завершён</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.completedOrders}</p>
        </div>
        
        <div class="bg-gradient-to-br from-primary-400 to-primary-500 rounded-xl shadow-lg hover:shadow-xl p-4 sm:p-6 text-white transition-all hover:scale-105 hidden sm:block">
          <p class="text-xs sm:text-sm opacity-90 mb-1 sm:mb-2">Отменён</p>
          <p class="text-2xl sm:text-4xl font-bold">{stats.canceledOrders}</p>
        </div>
      </div>
    </div>
    
    <!-- Статистика склада -->
    <div>
      <h2 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Статистика склада</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <!-- Товаров -->
        <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-primary-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600 mb-1">Товаров в каталоге</p>
              <p class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary-600 to-brand-700 bg-clip-text text-transparent">{stats.totalParts}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
        
        <!-- Низкий остаток -->
        <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-lg transition-all border-2 border-transparent hover:border-accent-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600 mb-1">Низкий остаток (≤3)</p>
              <p class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-accent-600 to-accent-700 bg-clip-text text-transparent">{stats.lowStock}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-accent-100 to-accent-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <svg class="w-5 h-5 sm:w-6 sm:h-6 text-accent-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Последние заказы -->
    <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-gray-100">
      <div class="flex items-center justify-between mb-4 sm:mb-6">
        <h2 class="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-700 to-brand-700 bg-clip-text text-transparent">Последние заказы</h2>
        <a href="/admin/orders" class="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline">
          Все заказы →
        </a>
      </div>
      
      {#if recentOrders.length > 0}
        <div class="overflow-x-auto -mx-4 sm:mx-0">
          <table class="w-full min-w-[600px]">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Номер</th>
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Клиент</th>
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Телефон</th>
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Сумма</th>
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Статус</th>
                <th class="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">Дата</th>
              </tr>
            </thead>
            <tbody>
              {#each recentOrders as order}
                <tr class="border-b border-gray-100 hover:bg-primary-50/30 transition-colors">
                  <td class="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-primary-700 font-mono">{order.orderNumber?.slice(0, 10) || 'N/A'}...</td>
                  <td class="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-700 font-medium">{order.customerName || '-'}</td>
                  <td class="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hidden md:table-cell">{order.customerPhone || '-'}</td>
                  <td class="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-bold text-primary-700">{Number(order.totalAmount || 0).toLocaleString()} ₽</td>
                  <td class="py-2 sm:py-3 px-2 sm:px-4">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {
                      order.status === 'new' ? 'bg-warning-100 text-warning-700 border border-warning-200' :
                      order.status === 'processing' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                      order.status === 'completed' ? 'bg-success-100 text-success-700 border border-success-200' :
                      order.status === 'canceled' ? 'bg-accent-100 text-accent-700 border border-accent-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }">
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td class="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '-'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="text-center py-8 text-gray-500">
          <p>Заказов пока нет</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

