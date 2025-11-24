<script>
  import { onMount, onDestroy } from 'svelte';
  import { partsApi, formatUtils, brandsApi, warehousesApi, stockApi, imageUtils } from '$lib/utils/api.js';
  import { toastStore } from '$lib/stores/toast.js';
  import ProductEditModal from '$lib/components/admin/ProductEditModal.svelte';
  import AddProductModal from '$lib/components/admin/AddProductModal.svelte';
  
  let parts = $state([]);
  let allParts = $state([]); // полный отсортированный список
  let visibleCount = $state(100);
  let isLoadingMore = $state(false);
  let brands = $state([]);
  let warehouses = $state([]);
  let isLoading = $state(true);
  let selectedPart = $state(null);
  let isModalOpen = $state(false);
  let isAddModalOpen = $state(false);
  let isImporting = $state(false);
  let showImportModal = $state(false);
  let isRecalculatingStock = $state(false);
  
  let filters = $state({
    search: '',
    stock_filter: 'all', // all, low, out
    brand: '',
    warehouse: ''
  });
  
  const stockFilterOptions = [
    { value: 'all', label: 'Все товары' },
    { value: 'low', label: 'Низкий остаток (≤5)' },
    { value: 'out', label: 'Нет в наличии' }
  ];
  
  async function loadParts() {
    try {
      isLoading = true;

      const baseParams = {
        ordering: '-created_at',
        page_size: 1000
      };

      if (filters.search) baseParams.search = filters.search;
      if (filters.brand) baseParams.brand = filters.brand;
      if (filters.warehouse) baseParams.warehouse = filters.warehouse;

      let allResults = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params = { ...baseParams, page };

        let response;
        if (filters.stock_filter === 'low') {
          response = await partsApi.getLowStockParts(params);
        } else if (filters.stock_filter === 'out') {
          params.available_max = 0;
          response = await partsApi.getParts(params);
        } else {
          response = await partsApi.getParts(params);
        }

        const pageResults = response.results || [];
        allResults = allResults.concat(pageResults);

        hasMore = Boolean(response.next);
        page += 1;
      }
      
      const sortedParts = (allResults || []).map(part => {
        const stock = part.stock !== null && part.stock !== undefined ? Number(part.stock) : 0;
        const reserve = part.reserve !== null && part.reserve !== undefined ? Number(part.reserve) : 0;
        const available = part.available !== null && part.available !== undefined ? Number(part.available) : 0;
        
        return {
          ...part,
          stock: isNaN(stock) ? 0 : stock,
          reserve: isNaN(reserve) ? 0 : reserve,
          available: isNaN(available) ? 0 : available
        };
      }).sort((a, b) => {
        const aReserve = a.reserve;
        const bReserve = b.reserve;
        const aAvailable = a.available;
        const bAvailable = b.available;
        
        if (aReserve > 0 && bReserve === 0) return -1;
        if (aReserve === 0 && bReserve > 0) return 1;
        
        if (aReserve > 0 && bReserve > 0) {
          if (bReserve !== aReserve) return bReserve - aReserve;
          return bAvailable - aAvailable;
        }
        
        return bAvailable - aAvailable;
      });

      allParts = sortedParts;
      visibleCount = Math.min(100, allParts.length);
      parts = allParts.slice(0, visibleCount);
      
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      toastStore.error('Ошибка загрузки товаров');
    } finally {
      isLoading = false;
    }
  }
  
  async function loadReferences() {
    try {
      const [brandsData, warehousesData] = await Promise.all([
        brandsApi.getBrands({ page_size: 100 }),
        warehousesApi.getWarehouses({ page_size: 100 })
      ]);
      
      brands = brandsData.results || brandsData;
      warehouses = warehousesData.results || warehousesData;
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  }

  function loadMoreParts() {
    if (isLoading || isLoadingMore) return;
    if (!allParts || allParts.length === 0) return;
    if (visibleCount >= allParts.length) return;

    isLoadingMore = true;
    const nextCount = Math.min(visibleCount + 100, allParts.length);
    visibleCount = nextCount;
    parts = allParts.slice(0, visibleCount);
    isLoadingMore = false;
  }

  function handleScroll() {
    if (typeof window === 'undefined') return;
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.body.offsetHeight - 200;

    if (scrollPosition >= threshold) {
      loadMoreParts();
    }
  }
  
  function handleFilterChange() {
    loadParts();
  }
  
  function handlePartClick(part) {
    selectedPart = part;
    isModalOpen = true;
  }
  
  function handleModalClose() {
    isModalOpen = false;
    selectedPart = null;
  }
  
  function handlePartUpdate() {
    loadParts();
  }
  
  function handleAddProduct() {
    isAddModalOpen = true;
  }
  
  function handleAddModalClose() {
    isAddModalOpen = false;
  }
  
  function handleProductAdded() {
    loadParts();
  }
  
  function handleImportExcel() {
    showImportModal = true;
  }
  
  async function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      isImporting = true;
      const result = await partsApi.importFromExcel(file);
      
      toastStore.success(`Импорт завершён! Создано: ${result.created}, Обновлено: ${result.updated}`);
      if (result.errors.length > 0) {
        toastStore.warning(`Есть ошибки импорта (${result.errors.length})`);
      }
      
      showImportModal = false;
      loadParts();
    } catch (error) {
      console.error('Error importing:', error);
      toastStore.error('Ошибка импорта файла');
    } finally {
      isImporting = false;
    }
  }
  
  function downloadTemplate() {
    window.open('/api/parts/template', '_blank');
  }

  async function handleRecalculateStock() {
    if (!confirm('Пересчитать резерв и доступные остатки по всем товарам на основе заказов?')) {
      return;
    }

    try {
      isRecalculatingStock = true;
      const response = await stockApi.recalculateFromOrders();

      if (response.success === false) {
        toastStore.error(response.error || 'Ошибка пересчёта остатков');
      } else {
        toastStore.success('Остатки успешно пересчитаны по заказам');
        await loadParts();
      }
    } catch (error) {
      console.error('Ошибка пересчёта остатков:', error);
      toastStore.error('Ошибка пересчёта остатков');
    } finally {
      isRecalculatingStock = false;
    }
  }
  
  async function exportToCSV() {
    try {
      let csv = 'ID;Название;Артикул;Бренд;Склад;На складе;Резерв;Доступно;Цена\n';
      parts.forEach(part => {
        csv += `${part.id};${part.title};${part.original_number || part.manufacturer_number || ''};${part.brand_name};${part.warehouse_name};${part.stock};${part.reserve};${part.available};${part.price_opt}\n`;
      });
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      toastStore.error('Ошибка экспорта остатков');
    }
  }
  
  let refreshIntervalId;

  onMount(() => {
    loadReferences();
    loadParts();

    refreshIntervalId = setInterval(() => {
      loadParts();
    }, 300000);
  });

  onDestroy(() => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }
  });
</script>

<svelte:window on:scroll={handleScroll} />

<svelte:head>
  <title>Остатки склада - Admin</title>
</svelte:head>

<div class="space-y-6 w-full">
  <!-- Заголовок -->
  <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Остатки склада</h1>
      <p class="text-gray-500 mt-2">Управление товарами и остатками</p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        onclick={handleImportExcel}
        class="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Импорт Excel
      </button>
      
      <button
        onclick={handleRecalculateStock}
        disabled={isRecalculatingStock}
        class="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class={`w-4 h-4 mr-2 ${isRecalculatingStock ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Обновить
      </button>

      <button
        onclick={handleAddProduct}
        class="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Добавить товар
      </button>
    </div>
  </div>
  
  <!-- Фильтры -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-2">
        <label for="search" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Поиск товара
        </label>
        <div class="relative">
          <input
            type="text"
            id="search"
            bind:value={filters.search}
            onchange={handleFilterChange}
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 pl-10 text-sm transition-all shadow-inner"
            placeholder="Название, артикул, бренд..."
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>
      
      <div>
        <label for="brand" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Бренд
        </label>
        <select
          id="brand"
          bind:value={filters.brand}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
        >
          <option value="">Все бренды</option>
          {#each brands as brand}
            <option value={brand.id}>{brand.name}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="warehouse" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Склад
        </label>
        <select
          id="warehouse"
          bind:value={filters.warehouse}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
        >
          <option value="">Все склады</option>
          {#each warehouses as warehouse}
            <option value={warehouse.id}>{warehouse.name}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="stock_filter" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Остатки
        </label>
        <select
          id="stock_filter"
          bind:value={filters.stock_filter}
          onchange={handleFilterChange}
          class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
        >
          {#each stockFilterOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>
    
    <!-- Кнопка экспорта -->
    <div class="mt-6 flex justify-end">
      <button
        onclick={exportToCSV}
        class="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Экспорт в CSV
      </button>
    </div>
  </div>
  
  <!-- Таблица товаров -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
    {#if isLoading}
      <div class="p-12 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto"></div>
        <p class="text-gray-500 mt-4 font-medium">Загрузка товаров...</p>
      </div>
    {:else if parts.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Товар</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Артикул</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Бренд</th>
              <th class="hidden md:table-cell py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Склад</th>
              <th class="hidden md:table-cell text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">На скл.</th>
              <th class="hidden md:table-cell text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Резерв</th>
              <th class="hidden md:table-cell text-center py-4 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Доступ.</th>
              <th class="hidden md:table-cell text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Цена</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each parts as part}
              {@const imageUrl = part.images && part.images.length > 0 && part.images[0].image_url ? imageUtils.getAbsoluteUrl(part.images[0].image_url) : null}
              <tr class="hover:bg-gray-50/30 transition-colors cursor-pointer {(part.reserve || 0) > 0 ? 'bg-orange-50/30' : ''}" onclick={() => handlePartClick(part)}>
                <td class="py-4 px-6 max-w-[300px]">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                      {#if imageUrl}
                        <img src={imageUrl} alt={part.title} class="w-full h-full object-cover" />
                      {:else}
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 line-clamp-2">{part.title}</p>
                      {#if (part.reserve || 0) > 0}
                        <span class="inline-flex items-center mt-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                          В резерве: {part.reserve || 0} шт.
                        </span>
                      {/if}
                    </div>
                  </div>
                </td>
                <td class="hidden md:table-cell py-4 px-6">
                  <span class="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    {part.original_number || part.manufacturer_number || '-'}
                  </span>
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-600">{part.brand_name || '-'}</td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-600 max-w-[150px]">
                  <span class="truncate block" title={part.warehouse_name}>{part.warehouse_name || '-'}</span>
                </td>
                <td class="hidden md:table-cell py-4 px-4 text-sm text-center font-medium text-gray-900">
                  {part.stock !== null && part.stock !== undefined ? part.stock : 0}
                </td>
                <td class="hidden md:table-cell py-4 px-4 text-sm text-center">
                  {#if (part.reserve || 0) > 0}
                    <span class="font-bold text-orange-600">{part.reserve || 0}</span>
                  {:else}
                    <span class="text-gray-400">-</span>
                  {/if}
                </td>
                <td class="hidden md:table-cell py-4 px-4 text-center">
                  {#if (part.available || 0) === 0}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      0
                    </span>
                  {:else if (part.available || 0) <= 3}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {part.available || 0}
                    </span>
                  {:else}
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {part.available || 0}
                    </span>
                  {/if}
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                  {formatUtils.formatPrice(Number(part.price_opt) || 0)}
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Товары не найдены</h3>
        <p class="text-gray-500 max-w-sm mx-auto">Попробуйте изменить параметры поиска или фильтры.</p>
      </div>
    {/if}
  </div>
  
  <!-- Итого -->
  {#if !isLoading}
    <div class="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex justify-between items-center">
      <p class="text-sm text-gray-500">
        Отображено: <span class="font-semibold text-gray-900">{parts.length}</span> из <span class="font-semibold text-gray-900">{allParts.length}</span>
      </p>
    </div>
  {/if}
</div>

<!-- Модальное окно редактирования товара -->
<ProductEditModal 
  part={selectedPart}
  isOpen={isModalOpen}
  onClose={handleModalClose}
  onUpdate={handlePartUpdate}
/>

<!-- Модальное окно добавления товара -->
<AddProductModal 
  brands={brands}
  warehouses={warehouses}
  isOpen={isAddModalOpen}
  onClose={handleAddModalClose}
  onSuccess={handleProductAdded}
/>

<!-- Модальное окно импорта из Excel -->
{#if showImportModal}
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
    onclick={() => showImportModal = false}
    onkeydown={(e) => e.key === 'Escape' && (showImportModal = false)}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" 
      onclick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Содержимое модального окна"
      tabindex="0"
    >
      <div class="p-6 border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-900">Импорт товаров из Excel</h2>
        <p class="text-sm text-gray-500 mt-1">Загрузите Excel файл с товарами для массового импорта</p>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Инструкция -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 class="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Формат файла
          </h3>
          <div class="text-xs text-blue-800 space-y-1">
            <p><strong>Колонки (по порядку):</strong></p>
            <ul class="list-disc list-inside ml-2 space-y-1 opacity-80">
              <li><strong>A:</strong> Название товара (обязательно)</li>
              <li><strong>B:</strong> Артикул</li>
              <li><strong>C:</strong> Бренд</li>
              <li><strong>D:</strong> Склад</li>
              <li><strong>E:</strong> Количество</li>
              <li><strong>F:</strong> Цена продажи (₽)</li>
              <li><strong>G:</strong> Себестоимость (₽)</li>
            </ul>
          </div>
        </div>
        
        <!-- Шаблон -->
        <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p class="text-sm text-gray-600 mb-3 font-medium">
            Рекомендуем использовать готовый шаблон:
          </p>
          <button
            onclick={downloadTemplate}
            class="w-full py-2.5 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center shadow-sm"
          >
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать шаблон Excel
          </button>
        </div>
        
        <!-- Загрузка файла -->
        <div>
          <label for="excel-file-input" class="block text-sm font-medium text-gray-700 mb-2">Выберите файл</label>
          <div class="relative">
            <input 
              id="excel-file-input"
              type="file" 
              accept=".xlsx,.xls"
              onchange={handleFileImport}
              disabled={isImporting}
              class="block w-full text-sm text-gray-500
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-gray-900 file:text-white
                hover:file:bg-gray-800
                file:transition-colors
                disabled:opacity-50 cursor-pointer"
            />
          </div>
        </div>
        
        {#if isImporting}
          <div class="flex items-center justify-center py-4 text-gray-600">
            <div class="animate-spin w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full mr-3"></div>
            <span class="text-sm font-medium">Импортирование товаров...</span>
          </div>
        {/if}
      </div>
      
      <div class="p-6 border-t border-gray-100 flex justify-end bg-gray-50">
        <button 
          onclick={() => showImportModal = false} 
          class="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
{/if}
