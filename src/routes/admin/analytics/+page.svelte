<script>
  import { onMount } from 'svelte';
  import { ordersApi, partsApi, formatUtils } from '$lib/utils/api.js';
  
  let stats = $state({
    totalRevenue: 0,
    avgOrder: 0,
    topParts: [],
    revenueByDay: [],
    conversionRate: 0
  });
  
  let isLoading = $state(true);
  let period = $state('30'); // 7, 30, 90 дней
  
  async function loadAnalytics() {
    try {
      isLoading = true;
      
      const daysAgo = parseInt(period);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);
      dateFrom.setHours(0, 0, 0, 0);
      
      const ordersResponse = await ordersApi.getOrders({
        created_after: dateFrom.toISOString().split('T')[0],
        page_size: 100,
        ordering: 'created_at'
      });
      
      const orders = ordersResponse.results || [];
      
      let totalRevenue = 0;
      let validOrdersCount = 0;
      
      orders.forEach(order => {
        const amount = order.totalAmount !== undefined 
          ? parseFloat(order.totalAmount) 
          : (order.total_amount !== undefined 
            ? parseFloat(order.total_amount) 
            : 0);
        
        if (!isNaN(amount) && amount > 0) {
          totalRevenue += amount;
          validOrdersCount++;
        }
      });
      
      const avgOrder = validOrdersCount > 0 ? totalRevenue / validOrdersCount : 0;
      
      stats.totalRevenue = Math.round(totalRevenue * 100) / 100;
      stats.avgOrder = Math.round(avgOrder * 100) / 100;
      
      const ordersByDay = {};
      orders.forEach(order => {
        const orderDate = order.createdAt || order.created_at;
        if (!orderDate) return;
        
        let dateObj;
        try {
          dateObj = new Date(orderDate);
          if (isNaN(dateObj.getTime())) return;
        } catch (error) {
          return;
        }
        
        const dateStr = dateObj.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit'
        });
        
        const dateKey = dateObj.toISOString().split('T')[0];
        
        if (!ordersByDay[dateKey]) {
          ordersByDay[dateKey] = { 
            date: dateStr, 
            dateObj: dateObj, 
            count: 0, 
            revenue: 0 
          };
        }
        ordersByDay[dateKey].count++;
        
        const amount = order.totalAmount !== undefined 
          ? parseFloat(order.totalAmount) 
          : (order.total_amount !== undefined 
            ? parseFloat(order.total_amount) 
            : 0);
        
        if (!isNaN(amount) && amount > 0) {
          ordersByDay[dateKey].revenue += amount;
        }
      });
      
      stats.revenueByDay = Object.values(ordersByDay)
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .map(item => ({
          date: item.date,
          count: item.count,
          revenue: Math.round(item.revenue * 100) / 100
        }));
      
      try {
          const productsStats = await fetch('/api/analytics/products?limit=10').then(r => r.json());
          if (productsStats.success && productsStats.topProducts) {
            stats.topParts = productsStats.topProducts.map((product) => ({
              id: product.partId,
              title: product.title,
              brand_name: product.brand,
              totalSold: product.totalSold,
              totalRevenue: product.totalRevenue,
              available: product.totalSold
            }));
          } else {
            stats.topParts = [];
          }
      } catch (error) {
        console.error('Ошибка загрузки топ товаров:', error);
        stats.topParts = [];
      }
      
      const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
      const totalCount = orders.length;
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

<div class="space-y-8 w-full">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Аналитика</h1>
      <p class="text-gray-500 mt-2">Обзор ключевых показателей и статистики</p>
    </div>
    
    <div class="bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
      <select
        bind:value={period}
        onchange={handlePeriodChange}
        class="bg-transparent border-none text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pl-3 pr-8 py-1.5"
      >
        <option value="7">За 7 дней</option>
        <option value="30">За 30 дней</option>
        <option value="90">За 90 дней</option>
      </select>
    </div>
  </div>
  
  {#if isLoading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each Array(3) as _}
        <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm animate-pulse">
          <div class="h-4 bg-gray-100 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-100 rounded w-3/4"></div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Main Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-900/10">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-gray-400 text-sm font-medium mb-1">Общая выручка</p>
            <h3 class="text-3xl font-bold tracking-tight text-white">
              {formatUtils.formatPrice(Number(stats.totalRevenue) || 0)}
            </h3>
          </div>
          <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-4 flex items-center text-sm">
          <span class="text-gray-400">За {period} дней</span>
          <span class="mx-2 text-gray-600">•</span>
          <span class="text-gray-300 font-medium">{stats.revenueByDay.reduce((sum, day) => sum + day.count, 0)} заказов</span>
        </div>
      </div>
      
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-gray-500 text-sm font-medium mb-1">Средний чек</p>
            <h3 class="text-3xl font-bold tracking-tight text-gray-900">
              {formatUtils.formatPrice(Number(stats.avgOrder) || 0)}
            </h3>
          </div>
          <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 3.666V19.125a.625.625 0 01-.625.625H9.625a.625.625 0 01-.625-.625V10.666C7 9.944 6.833 9.389 6.5 9.2c-.5.282-.56 1.523-1.5 2.5M15 10.666V7H9v1.143c0 2.761 0 2.857 0 2.857h6z" />
            </svg>
          </div>
        </div>
        <div class="mt-4 flex items-center text-sm">
          <span class="text-green-600 font-medium flex items-center">
             <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
             Активность
          </span>
          <span class="mx-2 text-gray-300">|</span>
          <span class="text-gray-500">Динамика продаж</span>
        </div>
      </div>
      
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-gray-500 text-sm font-medium mb-1">Конверсия заказов</p>
            <h3 class="text-3xl font-bold tracking-tight text-gray-900">
              {stats.conversionRate.toFixed(1)}%
            </h3>
          </div>
          <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="mt-4">
           <div class="w-full bg-gray-100 rounded-full h-1.5">
             <div class="bg-gray-900 h-1.5 rounded-full" style="width: {stats.conversionRate}%"></div>
           </div>
           <p class="text-xs text-gray-500 mt-2 text-right">Успешных заказов от общего числа</p>
        </div>
      </div>
    </div>
    
    <!-- Chart Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Динамика выручки</h3>
        
        {#if stats.revenueByDay.length > 0}
          <div class="space-y-4">
            {#each stats.revenueByDay as day}
              {#if Math.max(...stats.revenueByDay.map(d => Number(d.revenue) || 0), 1) > 0}
                {@const maxRevenue = Math.max(...stats.revenueByDay.map(d => Number(d.revenue) || 0), 1)}
                {@const revenueValue = Number(day.revenue) || 0}
                {@const revenuePercent = maxRevenue > 0 ? Math.min(100, (revenueValue / maxRevenue * 100)) : 0}
                
                <div class="flex items-center gap-4 group">
                  <div class="w-12 text-xs font-medium text-gray-400 text-right">{day.date}</div>
                  <div class="flex-1 h-8 bg-gray-50 rounded-lg overflow-hidden relative">
                    {#if revenuePercent > 0}
                      <div 
                        class="h-full bg-gray-900 rounded-lg transition-all duration-500 ease-out flex items-center px-3 group-hover:bg-black"
                        style="width: {revenuePercent}%"
                      >
                         {#if revenuePercent > 20}
                           <span class="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                             {formatUtils.formatPrice(revenueValue)}
                           </span>
                         {/if}
                      </div>
                    {/if}
                    {#if revenuePercent <= 20}
                       <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-900 ml-2">
                         {revenueValue > 0 ? formatUtils.formatPrice(revenueValue) : ''}
                       </span>
                    {/if}
                  </div>
                  <div class="w-16 text-xs font-bold text-gray-900 text-right">{day.count} зак.</div>
                </div>
              {/if}
            {/each}
          </div>
        {:else}
          <div class="flex flex-col items-center justify-center h-64 text-gray-400">
            <svg class="w-12 h-12 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>Нет данных за выбранный период</p>
          </div>
        {/if}
      </div>
      
      <!-- Top Products -->
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Лидеры продаж</h3>
        
        {#if stats.topParts.length > 0}
          <div class="space-y-4">
            {#each stats.topParts as part, i}
              <div class="flex items-center gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                <div class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-gray-900 truncate" title={part.title}>{part.title}</p>
                  <p class="text-xs text-gray-500">{part.brand_name}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold text-gray-900">{part.totalSold} шт.</p>
                  <p class="text-[10px] text-gray-400">{formatUtils.formatPrice(part.totalRevenue)}</p>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-gray-400 text-sm">
            Нет данных о продажах
          </div>
        {/if}
        
        <div class="mt-8 pt-4 border-t border-gray-100">
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Инфо</h4>
          <p class="text-xs text-gray-400 leading-relaxed">
            Рейтинг формируется на основе количества проданных единиц товара за всё время. Выручка рассчитывается как сумма всех продаж данного товара.
          </p>
        </div>
      </div>
    </div>
  {/if}
</div>
