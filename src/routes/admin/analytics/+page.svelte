<script>
  import { onMount } from 'svelte';
  import { ordersApi, partsApi, formatUtils } from '$lib/utils/api.js';
  
  let stats = $state({
    totalRevenue: 0,
    avgOrder: 0,
    topParts: [],
    revenueByDay: [],
    conversionRate: 0,
    ordersByCity: []
  });
  
  let isLoading = $state(true);
  let period = $state('30'); // 7, 30, 90 дней
  
  async function loadAnalytics() {
    try {
      isLoading = true;
      
      // Загружаем общую статистику
      const ordersStats = await ordersApi.getOrderStatistics();
      stats.totalRevenue = ordersStats.total_amount || 0;
      stats.avgOrder = ordersStats.avg_order_amount || 0;
      
      // Загружаем заказы за период для графика
      const daysAgo = parseInt(period);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);
      
      const ordersResponse = await ordersApi.getOrders({
        created_after: dateFrom.toISOString().split('T')[0],
        page_size: 1000,
        ordering: 'created_at'
      });
      
      // Группируем по дням
      const ordersByDay = {};
      (ordersResponse.results || []).forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString('ru-RU');
        if (!ordersByDay[date]) {
          ordersByDay[date] = { date, count: 0, revenue: 0 };
        }
        ordersByDay[date].count++;
        ordersByDay[date].revenue += parseFloat(order.total_amount);
      });
      
      stats.revenueByDay = Object.values(ordersByDay);
      
      // ТОП товары
      const partsResponse = await partsApi.getParts({ ordering: '-available', page_size: 10 });
      stats.topParts = partsResponse.results || [];
      
      // География заказов
      const cityStats = {};
      (ordersResponse.results || []).forEach(order => {
        const city = order.delivery_city || 'Не указан';
        if (!cityStats[city]) cityStats[city] = { city, count: 0, revenue: 0 };
        cityStats[city].count++;
        cityStats[city].revenue += parseFloat(order.total_amount);
      });
      stats.ordersByCity = Object.values(cityStats).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      
      // Конверсия (завершённые / все заказы)
      const completedCount = (ordersResponse.results || []).filter(o => o.status === 'completed').length;
      const totalCount = (ordersResponse.results || []).length;
      stats.conversionRate = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
      
    } catch (error) {
      console.error('Ошибка загрузки аналитики:', error);
    } finally {
      isLoading = false;
    }
  }
  
  function handlePeriodChange() {
    loadAnalytics();
  }
  
  onMount(() => {
    loadAnalytics();
  });
</script>

<svelte:head>
  <title>Аналитика - Admin</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6 w-full">
  <!-- Заголовок -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Аналитика</h1>
      <p class="text-gray-600 mt-2">Статистика продаж и выручки</p>
    </div>
    
    <select
      bind:value={period}
      onchange={handlePeriodChange}
      class="input"
    >
      <option value="7">За 7 дней</option>
      <option value="30">За 30 дней</option>
      <option value="90">За 90 дней</option>
    </select>
  </div>
  
  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each Array(3) as _}
        <div class="bg-white rounded-xl shadow-sm p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Основная статистика -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <p class="text-sm opacity-90 mb-2">Общая выручка</p>
        <p class="text-4xl font-bold">{formatUtils.formatPrice(stats.totalRevenue)}</p>
      </div>
      
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
        <p class="text-sm opacity-90 mb-2">Средний чек</p>
        <p class="text-4xl font-bold">{formatUtils.formatPrice(stats.avgOrder)}</p>
      </div>
      
      <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <p class="text-sm opacity-90 mb-2">Заказов за период</p>
        <p class="text-4xl font-bold">{stats.revenueByDay.reduce((sum, day) => sum + day.count, 0)}</p>
      </div>
    </div>
    
    <!-- График выручки по дням -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <h2 class="text-xl font-bold text-gray-900 mb-6">Выручка по дням</h2>
      {#if stats.revenueByDay.length > 0}
        <div class="space-y-3">
          {#each stats.revenueByDay as day}
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-600 w-24">{day.date}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div 
                  class="bg-gradient-to-r from-primary-500 to-primary-600 h-full flex items-center px-3"
                  style="width: {Math.min(100, (day.revenue / Math.max(...stats.revenueByDay.map(d => d.revenue)) * 100))}%"
                >
                  <span class="text-xs font-medium text-white">{formatUtils.formatPrice(day.revenue)}</span>
                </div>
              </div>
              <span class="text-sm font-semibold text-gray-900 w-20 text-right">{day.count} шт.</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-12 text-gray-500">
          <p>Нет данных за выбранный период</p>
        </div>
      {/if}
    </div>
    
    <!-- География и ТОП товары -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">География заказов (ТОП-5)</h3>
        {#if stats.ordersByCity.length > 0}
          <div class="space-y-3">
            {#each stats.ordersByCity as cityData}
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">{cityData.city}</span>
                <span class="text-sm font-semibold text-gray-900">{cityData.count} зак. • {formatUtils.formatPrice(cityData.revenue)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500">Нет данных</p>
        {/if}
      </div>
      
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">ТОП-10 товаров</h3>
        {#if stats.topParts.length > 0}
          <div class="space-y-2">
            {#each stats.topParts as part}
              <div class="flex justify-between items-center text-sm">
                <span class="text-gray-700 truncate">{part.title}</span>
                <span class="text-gray-500 ml-2">{part.available} шт</span>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-gray-500">Нет данных</p>
        {/if}
      </div>
    </div>
    
    <!-- Дополнительная информация -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Конверсия</h3>
        <div class="flex items-center justify-center">
          <div class="text-center">
            <div class="text-5xl font-bold text-primary-600 mb-2">{stats.conversionRate.toFixed(1)}%</div>
            <p class="text-sm text-gray-600">Заказов завершено успешно</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Всего заказов</span>
            <span class="font-semibold text-gray-900">{stats.revenueByDay.reduce((sum, day) => sum + day.count, 0)}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Средний чек</span>
            <span class="font-semibold text-gray-900">{formatUtils.formatPrice(stats.avgOrder)}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-gray-600">Общая выручка</span>
            <span class="font-semibold text-primary-600">{formatUtils.formatPrice(stats.totalRevenue)}</span>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Информация</h3>
        <div class="space-y-3 text-sm text-gray-600">
          <p>📊 График показывает выручку и количество заказов за каждый день выбранного периода</p>
          <p>💰 Общая выручка рассчитывается за всё время работы магазина</p>
          <p>📈 Средний чек - среднее значение суммы заказа</p>
        </div>
      </div>
    </div>
  {/if}
</div>

