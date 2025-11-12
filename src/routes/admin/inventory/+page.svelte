<script>
  import { onMount } from 'svelte';
  import { partsApi, formatUtils, brandsApi, warehousesApi, API_BASE_URL } from '$lib/utils/api.js';
  import ProductEditModal from '$lib/components/admin/ProductEditModal.svelte';
  import AddProductModal from '$lib/components/admin/AddProductModal.svelte';
  
  let parts = $state([]);
  let brands = $state([]);
  let warehouses = $state([]);
  let isLoading = $state(true);
  let selectedPart = $state(null);
  let isModalOpen = $state(false);
  let isAddModalOpen = $state(false);
  let isImporting = $state(false);
  let showImportModal = $state(false);
  
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
      const params = {
        ordering: 'available',
        page_size: 1000 // Увеличено для отображения большего количества товаров
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.brand) params.brand = filters.brand;
      if (filters.warehouse) params.warehouse = filters.warehouse;
      
      let response;
      if (filters.stock_filter === 'low') {
        response = await partsApi.getLowStockParts(params);
      } else if (filters.stock_filter === 'out') {
        params.available_max = 0;
        response = await partsApi.getParts(params);
      } else {
        response = await partsApi.getParts(params);
      }
      
      parts = response.results || [];
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
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
      
      alert(`✅ Импорт завершён!\n\nСоздано: ${result.created}\nОбновлено: ${result.updated}\n${result.errors.length > 0 ? `\n⚠️ Ошибки:\n${result.errors.join('\n')}` : ''}`);
      
      showImportModal = false;
      loadParts();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Ошибка импорта файла');
    } finally {
      isImporting = false;
    }
  }
  
  function downloadTemplate() {
    window.open('/api/parts/template', '_blank');
  }
  
  // Экспорт в CSV
  async function exportToCSV() {
    try {
      // Формируем CSV
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
      alert('Ошибка экспорта остатков');
    }
  }
  
  onMount(() => {
    loadReferences();
    loadParts();
  });
</script>

<svelte:head>
  <title>Остатки склада - Admin</title>
</svelte:head>

<div class="space-y-4 sm:space-y-6 w-full">
  <!-- Заголовок -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Остатки склада</h1>
      <p class="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Управление товарами и остатками</p>
    </div>
    <div class="flex space-x-3">
      <button
        onclick={handleImportExcel}
        class="btn-outline flex items-center text-sm"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span class="hidden sm:inline">Импорт из Excel</span>
        <span class="sm:hidden">Импорт</span>
      </button>
      
      <button
        onclick={handleAddProduct}
        class="btn-primary flex items-center text-sm"
      >
        <svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span class="hidden sm:inline">Добавить товар</span>
        <span class="sm:hidden">Добавить</span>
      </button>
    </div>
  </div>
  
  <!-- Фильтры -->
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      <div class="lg:col-span-2">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
          Поиск товара
        </label>
        <input
          type="text"
          id="search"
          bind:value={filters.search}
          onchange={handleFilterChange}
          class="input w-full"
          placeholder="Название, артикул, бренд..."
        />
      </div>
      
      <div>
        <label for="brand" class="block text-sm font-medium text-gray-700 mb-2">
          Бренд
        </label>
        <select
          id="brand"
          bind:value={filters.brand}
          onchange={handleFilterChange}
          class="input w-full"
        >
          <option value="">Все бренды</option>
          {#each brands as brand}
            <option value={brand.id}>{brand.name}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="warehouse" class="block text-sm font-medium text-gray-700 mb-2">
          Склад
        </label>
        <select
          id="warehouse"
          bind:value={filters.warehouse}
          onchange={handleFilterChange}
          class="input w-full"
        >
          <option value="">Все склады</option>
          {#each warehouses as warehouse}
            <option value={warehouse.id}>{warehouse.name}</option>
          {/each}
        </select>
      </div>
      
      <div>
        <label for="stock_filter" class="block text-sm font-medium text-gray-700 mb-2">
          Остатки
        </label>
        <select
          id="stock_filter"
          bind:value={filters.stock_filter}
          onchange={handleFilterChange}
          class="input w-full"
        >
          {#each stockFilterOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>
    </div>
    
    <!-- Кнопка экспорта -->
    <div class="mt-4 flex justify-end">
      <button
        onclick={exportToCSV}
        class="btn-outline flex items-center"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Экспорт в CSV
      </button>
    </div>
  </div>
  
  <!-- Таблица товаров -->
  <div class="bg-white rounded-xl shadow-sm overflow-hidden w-full">
    {#if isLoading}
      <div class="p-8 text-center">
        <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
        <p class="text-gray-600 mt-4">Загрузка товаров...</p>
      </div>
    {:else if parts.length > 0}
      <div class="overflow-x-auto">
        <table class="w-full table-auto">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left py-3 px-3 text-xs font-semibold text-gray-700">Товар</th>
              <th class="text-left py-3 px-3 text-xs font-semibold text-gray-700">Артикул</th>
              <th class="text-left py-3 px-3 text-xs font-semibold text-gray-700">Бренд</th>
              <th class="text-left py-3 px-3 text-xs font-semibold text-gray-700">Склад</th>
              <th class="text-center py-3 px-2 text-xs font-semibold text-gray-700">На скл.</th>
              <th class="text-center py-3 px-2 text-xs font-semibold text-gray-700">Резерв</th>
              <th class="text-center py-3 px-2 text-xs font-semibold text-gray-700">Доступ.</th>
              <th class="text-right py-3 px-3 text-xs font-semibold text-gray-700">Цена</th>
            </tr>
          </thead>
          <tbody>
            {#each parts as part}
              <tr class="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onclick={() => handlePartClick(part)}>
                <td class="py-3 px-3 max-w-[300px]">
                  <div class="flex items-center space-x-2">
                    {#if part.main_image?.url}
                      <img src={part.main_image.url} alt={part.title} class="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                    {:else}
                      <div class="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    {/if}
                    <p class="text-xs font-medium text-primary-600 hover:text-primary-700 line-clamp-2 leading-tight">{part.title}</p>
                  </div>
                </td>
                <td class="py-3 px-3">
                  <span class="font-mono text-xs text-gray-600 break-all">
                    {part.original_number || part.manufacturer_number || '-'}
                  </span>
                </td>
                <td class="py-3 px-3 text-xs text-gray-600">{part.brand_name}</td>
                <td class="py-3 px-3 text-xs text-gray-600 max-w-[150px]">
                  <span class="line-clamp-2 leading-tight">{part.warehouse_name}</span>
                </td>
                <td class="py-3 px-2 text-xs text-center text-gray-900 font-medium">{part.stock}</td>
                <td class="py-3 px-2 text-xs text-center text-gray-600">{part.reserve}</td>
                <td class="py-3 px-2 text-center">
                  <span class="text-xs font-semibold {
                    part.available === 0 ? 'text-red-600' :
                    part.available <= 3 ? 'text-orange-600' :
                    part.available <= 10 ? 'text-yellow-600' :
                    'text-green-600'
                  }">
                    {part.available}
                  </span>
                </td>
                <td class="py-3 px-3 text-xs font-medium text-gray-900 text-right whitespace-nowrap">
                  {formatUtils.formatPrice(Number(part.price_opt))}
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
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Товары не найдены</h3>
        <p class="text-gray-600">Попробуйте изменить параметры поиска</p>
      </div>
    {/if}
  </div>
  
  <!-- Итого -->
  {#if !isLoading}
    <div class="bg-white rounded-xl shadow-sm p-6">
      <p class="text-sm text-gray-600">
        Отображено товаров: <span class="font-semibold text-gray-900">{parts.length}</span>
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
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick={() => showImportModal = false}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-2xl font-bold text-gray-900">Импорт товаров из Excel</h2>
        <p class="text-sm text-gray-600 mt-2">Загрузите Excel файл с товарами для массового импорта</p>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Инструкция -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-blue-900 mb-2">📋 Формат файла</h3>
          <div class="text-xs text-blue-800 space-y-1">
            <p><strong>Колонки (по порядку):</strong></p>
            <ul class="list-disc list-inside ml-2 space-y-1">
              <li><strong>A:</strong> Название товара (обязательно)</li>
              <li><strong>B:</strong> Артикул (если указан - товар обновится, иначе создастся новый)</li>
              <li><strong>C:</strong> Бренд (создастся автоматически если не существует)</li>
              <li><strong>D:</strong> Склад (создастся автоматически если не существует)</li>
              <li><strong>E:</strong> Количество на складе</li>
              <li><strong>F:</strong> Цена продажи (₽)</li>
              <li><strong>G:</strong> Себестоимость (₽, опционально)</li>
            </ul>
          </div>
        </div>
        
        <!-- Шаблон -->
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-700 mb-3">
            <strong>💡 Совет:</strong> Скачайте шаблон Excel с примерами данных
          </p>
          <button
            onclick={downloadTemplate}
            class="btn-outline w-full flex items-center justify-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Скачать шаблон Excel
          </button>
        </div>
        
        <!-- Загрузка файла -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Выберите Excel файл</label>
          <input 
            type="file" 
            accept=".xlsx,.xls"
            onchange={handleFileImport}
            disabled={isImporting}
            class="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100
              disabled:opacity-50"
          />
        </div>
        
        {#if isImporting}
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mr-3"></div>
            <span class="text-gray-600 font-medium">Импортирование товаров...</span>
          </div>
        {/if}
      </div>
      
      <div class="p-6 border-t border-gray-200 flex justify-end">
        <button onclick={() => showImportModal = false} class="btn-outline">Закрыть</button>
      </div>
    </div>
  </div>
{/if}

