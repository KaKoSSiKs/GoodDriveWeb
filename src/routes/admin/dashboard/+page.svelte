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
      
      const ordersStats = await ordersApi.getOrderStatistics();
      stats.totalOrders = ordersStats.total || 0;
      stats.newOrders = ordersStats.new || 0;
      stats.processingOrders = ordersStats.processing || 0;
      stats.shippedOrders = ordersStats.shipped || 0;
      stats.completedOrders = ordersStats.completed || 0;
      stats.canceledOrders = ordersStats.canceled || 0;
      
      const partsResponse = await partsApi.getParts({ page_size: 1 });
      stats.totalParts = partsResponse.count || 0;
      
      try {
        const stockStats = await fetch('/api/analytics/products?limit=1').then(r => r.json());
        if (stockStats.success && stockStats.totalStock !== undefined) {
          stats.lowStock = stockStats.totalStock;
        } else {
          const allPartsResponse = await partsApi.getParts({ page_size: 100 });
          const totalStock = (allPartsResponse.results || []).reduce((sum, part) => {
            return sum + (typeof part.stock === 'number' ? part.stock : 0);
          }, 0);
          stats.lowStock = totalStock;
        }
      } catch (error) {
        console.error('Ошибка загрузки статистики склада:', error);
        stats.lowStock = 0;
      }
      
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

<div class="space-y-8 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Панель управления</h1>
    <p class="text-gray-500 mt-2">Обзор ключевых показателей системы GoodDrive</p>
  </div>
  
  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each Array(4) as _}
        <div class="bg-white rounded-2xl shadow-sm p-6 animate-pulse border border-gray-100">
          <div class="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-100 rounded w-3/4"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Статистика заказов -->
    <div>
      <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Заказы
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="relative">
            <p class="text-sm font-medium text-gray-500 mb-1">Всего заказов</p>
            <p class="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-orange-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="relative">
            <p class="text-sm font-medium text-gray-500 mb-1">Новых</p>
            <p class="text-3xl font-bold text-orange-600">{stats.newOrders}</p>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="relative">
            <p class="text-sm font-medium text-gray-500 mb-1">В обработке</p>
            <p class="text-3xl font-bold text-blue-600">{stats.processingOrders}</p>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div class="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-green-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div class="relative">
            <p class="text-sm font-medium text-gray-500 mb-1">Завершено</p>
            <p class="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Статистика склада -->
    <div>
      <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-gray-900"></span>
        Склад
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 mb-1">Товаров в каталоге</p>
            <p class="text-3xl font-bold text-gray-900">{stats.totalParts.toLocaleString()}</p>
          </div>
          <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500 mb-1">Всего единиц на складе</p>
            <p class="text-3xl font-bold text-gray-900">{stats.lowStock.toLocaleString()}</p>
          </div>
          <div class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-900">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Последние заказы -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-6 flex items-center justify-between border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-900">Последние заказы</h2>
        <a href="/admin/orders" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          Все заказы →
        </a>
      </div>
      
      <div class="overflow-x-auto">
        {#if recentOrders.length > 0}
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="px-6 py-4 font-medium text-gray-500">Номер</th>
                <th class="px-6 py-4 font-medium text-gray-500">Клиент</th>
                <th class="px-6 py-4 font-medium text-gray-500 hidden md:table-cell">Телефон</th>
                <th class="px-6 py-4 font-medium text-gray-500">Сумма</th>
                <th class="px-6 py-4 font-medium text-gray-500">Статус</th>
                <th class="px-6 py-4 font-medium text-gray-500 hidden lg:table-cell">Дата</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#each recentOrders as order}
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-gray-900">{order.orderNumber?.slice(0, 10) || 'N/A'}...</td>
                  <td class="px-6 py-4 text-gray-900 font-medium">{order.customerName || '-'}</td>
                  <td class="px-6 py-4 text-gray-500 hidden md:table-cell">{order.customerPhone || '-'}</td>
                  <td class="px-6 py-4 font-bold text-gray-900">{Number(order.totalAmount || 0).toLocaleString()} ₽</td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
                      order.status === 'new' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }">
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-gray-500 hidden lg:table-cell">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '-'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <div class="p-12 text-center text-gray-400">
            Заказов пока нет
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
