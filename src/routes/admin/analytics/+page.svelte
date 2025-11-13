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
      
      // Загружаем заказы за период для расчета статистики
      const daysAgo = parseInt(period);
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - daysAgo);
      dateFrom.setHours(0, 0, 0, 0); // Начало дня
      
      const ordersResponse = await ordersApi.getOrders({
        created_after: dateFrom.toISOString().split('T')[0],
        page_size: 10000, // Увеличиваем для получения всех заказов за период
        ordering: 'created_at'
      });
      
      const orders = ordersResponse.results || [];
      
      // Рассчитываем общую выручку и средний чек на основе заказов за период
      // API возвращает totalAmount (camelCase), но может быть и total_amount (snake_case)
      let totalRevenue = 0;
      let validOrdersCount = 0;
      
      orders.forEach(order => {
        // Пробуем получить сумму заказа в разных форматах
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
      
      // Средний чек = общая выручка / количество заказов с ненулевой суммой
      const avgOrder = validOrdersCount > 0 ? totalRevenue / validOrdersCount : 0;
      
      // Сохраняем рассчитанные значения (округляем до 2 знаков)
      stats.totalRevenue = Math.round(totalRevenue * 100) / 100;
      stats.avgOrder = Math.round(avgOrder * 100) / 100;
      
      // Группируем по дням для графика
      const ordersByDay = {};
      orders.forEach(order => {
        // Получаем дату создания заказа
        const orderDate = order.createdAt || order.created_at;
        if (!orderDate) return; // Пропускаем заказы без даты
        
        // Парсим дату правильно
        let dateObj;
        try {
          dateObj = new Date(orderDate);
          if (isNaN(dateObj.getTime())) {
            // Если дата невалидна, пропускаем
            console.warn('Invalid date:', orderDate);
            return;
          }
        } catch (error) {
          // Если ошибка парсинга, пропускаем
          console.warn('Error parsing date:', orderDate, error);
          return;
        }
        
        // Форматируем дату в формате DD.MM.YYYY для отображения
        const dateStr = dateObj.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        // Используем ISO дату (YYYY-MM-DD) как ключ для группировки (более надежно)
        const dateKey = dateObj.toISOString().split('T')[0];
        
        if (!ordersByDay[dateKey]) {
          ordersByDay[dateKey] = { 
            date: dateStr, // Отображаемая дата в формате DD.MM.YYYY
            dateObj: dateObj, // Объект даты для сортировки
            count: 0, 
            revenue: 0 
          };
        }
        ordersByDay[dateKey].count++;
        
        // Получаем сумму заказа (та же логика, что и выше)
        const amount = order.totalAmount !== undefined 
          ? parseFloat(order.totalAmount) 
          : (order.total_amount !== undefined 
            ? parseFloat(order.total_amount) 
            : 0);
        
        if (!isNaN(amount) && amount > 0) {
          ordersByDay[dateKey].revenue += amount;
        }
      });
      
      // Сортируем по дате (от старых к новым) и преобразуем в массив
      stats.revenueByDay = Object.values(ordersByDay)
        .sort((a, b) => {
          // Сортируем по объекту даты
          return a.dateObj.getTime() - b.dateObj.getTime();
        })
        .map(item => ({
          date: item.date, // Отображаемая дата
          count: item.count,
          revenue: Math.round(item.revenue * 100) / 100 // Округляем до 2 знаков
        }));
      
      // ТОП товары - из заказов (что больше заказывают)
      try {
          const productsStats = await fetch('/api/analytics/products?limit=10').then(r => r.json());
          if (productsStats.success && productsStats.topProducts) {
            stats.topParts = productsStats.topProducts.map((product) => ({
              id: product.partId,
              title: product.title,
              brand_name: product.brand,
              totalSold: product.totalSold,
              totalRevenue: product.totalRevenue,
              available: product.totalSold // Используем количество проданных как показатель популярности
            }));
          } else {
            stats.topParts = [];
          }
      } catch (error) {
        console.error('Ошибка загрузки топ товаров:', error);
        stats.topParts = [];
      }
      
      // Конверсия (завершённые / все заказы) - считаем завершенные заказы
      const completedCount = orders.filter(o => o.status === 'completed' || o.status === 'shipped').length;
      const totalCount = orders.length;
      stats.conversionRate = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
      
      // Отладочное логирование (можно убрать в production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Аналитика за период:', {
          period: `${daysAgo} дней`,
          totalOrders: totalCount,
          totalRevenue: totalRevenue.toFixed(2),
          avgOrder: avgOrder.toFixed(2),
          completedOrders: completedCount,
          conversionRate: stats.conversionRate.toFixed(2) + '%',
          sampleOrder: orders.length > 0 ? {
            id: orders[0].id,
            totalAmount: orders[0].totalAmount || orders[0].total_amount,
            createdAt: orders[0].createdAt || orders[0].created_at
          } : null
        });
      }
      
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
        <p class="text-sm opacity-90 mb-2">Общая выручка за {period} дн.</p>
        <p class="text-4xl font-bold">{formatUtils.formatPrice(Number(stats.totalRevenue) || 0)}</p>
        <p class="text-xs opacity-75 mt-2">{stats.revenueByDay.reduce((sum, day) => sum + day.count, 0)} заказов</p>
      </div>
      
      <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
        <p class="text-sm opacity-90 mb-2">Средний чек</p>
        <p class="text-4xl font-bold">{formatUtils.formatPrice(Number(stats.avgOrder) || 0)}</p>
        <p class="text-xs opacity-75 mt-2">За {period} дней</p>
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
            {#if Math.max(...stats.revenueByDay.map(d => Number(d.revenue) || 0), 1) > 0 && (Number(day.revenue) || 0) > 0}
              {@const maxRevenue = Math.max(...stats.revenueByDay.map(d => Number(d.revenue) || 0), 1)}
              {@const revenueValue = Number(day.revenue) || 0}
              {@const revenuePercent = maxRevenue > 0 ? Math.min(100, (revenueValue / maxRevenue * 100)) : 0}
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600 w-24 font-medium">{day.date || 'Дата не указана'}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                  <div 
                    class="bg-gradient-to-r from-primary-500 to-primary-600 h-full flex items-center px-3 transition-all duration-300"
                    style="width: {revenuePercent}%"
                  >
                    {#if revenuePercent > 15}
                      <span class="text-xs font-medium text-white whitespace-nowrap">{formatUtils.formatPrice(revenueValue)}</span>
                    {/if}
                  </div>
                  {#if revenuePercent <= 15}
                    <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-700">{formatUtils.formatPrice(revenueValue)}</span>
                  {/if}
                </div>
                <span class="text-sm font-semibold text-gray-900 w-20 text-right whitespace-nowrap">{day.count || 0} шт.</span>
              </div>
            {:else}
              <div class="flex items-center space-x-4">
                <span class="text-sm text-gray-600 w-24 font-medium">{day.date || 'Дата не указана'}</span>
                <div class="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden relative">
                  <div class="bg-gradient-to-r from-primary-500 to-primary-600 h-full flex items-center px-3 transition-all duration-300" style="width: 0%">
                  </div>
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-700">{formatUtils.formatPrice(Number(day.revenue) || 0)}</span>
                </div>
                <span class="text-sm font-semibold text-gray-900 w-20 text-right whitespace-nowrap">{day.count || 0} шт.</span>
              </div>
            {/if}
          {/each}
        </div>
      {:else}
        <div class="text-center py-12 text-gray-500">
          <p>Нет данных за выбранный период</p>
        </div>
      {/if}
    </div>
    
    <!-- ТОП товары -->
    <div class="bg-white rounded-xl shadow-sm p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">ТОП-10 товаров (по количеству заказов)</h3>
      {#if stats.topParts.length > 0}
        <div class="space-y-3">
          {#each stats.topParts as part}
            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{part.title}</p>
                <p class="text-xs text-gray-500">{part.brand_name}</p>
              </div>
              <div class="text-right ml-4">
                <p class="text-sm font-semibold text-gray-900">Продано: {part.totalSold} шт.</p>
                <p class="text-xs text-gray-500">Выручка: {formatUtils.formatPrice(part.totalRevenue)}</p>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-gray-500">Нет данных</p>
      {/if}
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
            <span class="font-semibold text-gray-900">{formatUtils.formatPrice(Number(stats.avgOrder) || 0)}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-gray-600">Общая выручка</span>
            <span class="font-semibold text-primary-600">{formatUtils.formatPrice(Number(stats.totalRevenue) || 0)}</span>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Информация</h3>
        <div class="space-y-3 text-sm text-gray-600">
          <p>📊 График показывает выручку и количество заказов за каждый день выбранного периода ({period} дней)</p>
          <p>💰 Общая выручка рассчитывается на основе всех заказов за выбранный период</p>
          <p>📈 Средний чек - среднее значение суммы заказа за выбранный период</p>
          <p>✅ Учитываются только заказы с ненулевой суммой</p>
        </div>
      </div>
    </div>
  {/if}
</div>

