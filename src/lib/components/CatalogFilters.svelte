<script>
  import FilterCheckbox from './FilterCheckbox.svelte';
  import { onMount } from 'svelte';
  
  // Пропсы компонента (Svelte 5 синтаксис)
  let {
    brands = [],
    warehouses = [],
    filters = {},
    onFilterChange = () => {},
    onClearFilters = () => {}
  } = $props();
  
  // Реактивное состояние
  let isExpanded = $state(false);
  let searchValue = $state(filters.search || '');
  let priceMin = $state(filters.price_min || '');
  let priceMax = $state(filters.price_max || '');
  let searchTimeout = null;
  
  // Производные значения
  const hasActiveFilters = $derived(
    filters.search || filters.brand || filters.warehouse || 
    filters.price_min || filters.price_max || filters.in_stock
  );
  
  // Debounce для поиска
  function debounceSearch(value) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      handleInputChange('search', value);
    }, 500); // 500ms задержка
  }
  
  // Обработчики
  function handleInputChange(field, value) {
    onFilterChange({ ...filters, [field]: value });
  }
  
  function handleSearchInput(event) {
    const value = event.target.value;
    searchValue = value;
    debounceSearch(value);
  }
  
  function handlePriceChange(field, value) {
    const numValue = value ? parseInt(value) : '';
    if (field === 'price_min') {
      priceMin = value;
    } else {
      priceMax = value;
    }
    handleInputChange(field, numValue);
  }
  
  function handleSearchSubmit(event) {
    event.preventDefault();
    handleInputChange('search', searchValue);
  }
  
  function handleBrandToggle(brandId, checked) {
    const currentBrands = filters.brand ? filters.brand.split(',').filter(id => id !== '') : [];
    
    if (checked) {
      if (!currentBrands.includes(brandId.toString())) {
        currentBrands.push(brandId.toString());
      }
    } else {
      const index = currentBrands.indexOf(brandId.toString());
      if (index > -1) {
        currentBrands.splice(index, 1);
      }
    }
    
    handleInputChange('brand', currentBrands.join(','));
  }
  
  function handleWarehouseToggle(warehouseId, checked) {
    const currentWarehouses = filters.warehouse ? filters.warehouse.split(',').filter(id => id !== '') : [];
    
    if (checked) {
      if (!currentWarehouses.includes(warehouseId.toString())) {
        currentWarehouses.push(warehouseId.toString());
      }
    } else {
      const index = currentWarehouses.indexOf(warehouseId.toString());
      if (index > -1) {
        currentWarehouses.splice(index, 1);
      }
    }
    
    handleInputChange('warehouse', currentWarehouses.join(','));
  }
  
  function isBrandSelected(brandId) {
    return filters.brand ? filters.brand.split(',').includes(brandId.toString()) : false;
  }
  
  function isWarehouseSelected(warehouseId) {
    return filters.warehouse ? filters.warehouse.split(',').includes(warehouseId.toString()) : false;
  }
  
  function toggleExpanded() {
    isExpanded = !isExpanded;
  }
  
  // Очистка таймера при размонтировании
  onMount(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  });
</script>

<div class="bg-white rounded-2xl shadow-lg border border-secondary-100 p-6">
  <!-- Заголовок фильтров -->
  <div class="flex items-center justify-between mb-6">
    <h2 class="text-xl font-bold text-secondary-900">Фильтры</h2>
    <div class="flex items-center space-x-3">
      {#if hasActiveFilters}
        <button 
          onclick={onClearFilters}
          class="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
        >
          Сбросить
        </button>
      {/if}
      <button
        onclick={toggleExpanded}
        class="md:hidden p-2 text-secondary-500 hover:text-secondary-700 rounded-lg hover:bg-secondary-100 transition-colors"
        aria-label="Переключить фильтры"
      >
        <svg class="w-5 h-5 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Фильтры -->
  <div class="space-y-6 {isExpanded ? '' : 'hidden md:block'}">
    <!-- Поиск -->
    <div>
      <label for="search-input" class="block text-sm font-medium text-secondary-700 mb-3">Поиск</label>
      <form onsubmit={handleSearchSubmit}>
        <div class="relative">
          <input
            id="search-input"
            type="text"
            name="search"
            placeholder="Название, номер..."
            value={searchValue}
            oninput={handleSearchInput}
            class="input pl-10 pr-10"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {#if searchValue}
            <button
              type="button"
              onclick={() => { searchValue = ''; handleInputChange('search', ''); }}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
              aria-label="Очистить поиск"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      </form>
    </div>
    
    <!-- Цена -->
    <div>
      <div class="block text-sm font-medium text-secondary-700 mb-3">Цена, ₽</div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="price-min" class="block text-xs text-secondary-500 mb-1">От</label>
          <input
            id="price-min"
            type="number"
            placeholder="0"
            value={priceMin}
            oninput={(e) => handlePriceChange('price_min', e.target.value)}
            class="input text-sm"
            min="0"
          />
        </div>
        <div>
          <label for="price-max" class="block text-xs text-secondary-500 mb-1">До</label>
          <input
            id="price-max"
            type="number"
            placeholder="100000"
            value={priceMax}
            oninput={(e) => handlePriceChange('price_max', e.target.value)}
            class="input text-sm"
            min="0"
          />
        </div>
      </div>
    </div>
    
    <!-- Бренды -->
    <div>
      <div class="block text-sm font-medium text-secondary-700 mb-3">Бренды</div>
      <div class="space-y-3 max-h-48 overflow-y-auto">
        {#each brands.slice(0, 10) as brand}
          <FilterCheckbox
            label={brand.name}
            checked={isBrandSelected(brand.id)}
            count={brand.parts_count}
            onToggle={(checked) => handleBrandToggle(brand.id, checked)}
          />
        {/each}
        
        {#if brands.length > 10}
          <div class="text-xs text-secondary-500 pt-2 border-t border-secondary-200">
            Показано 10 из {brands.length} брендов
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Склады -->
    <div>
      <div class="block text-sm font-medium text-secondary-700 mb-3">Склады</div>
      <div class="space-y-3">
        {#each warehouses as warehouse}
          <FilterCheckbox
            label={warehouse.name}
            checked={isWarehouseSelected(warehouse.id)}
            onToggle={(checked) => handleWarehouseToggle(warehouse.id, checked)}
          />
        {/each}
      </div>
    </div>
    
    <!-- В наличии -->
    <div>
      <FilterCheckbox
        label="Только в наличии"
        checked={filters.in_stock || false}
        onToggle={(checked) => handleInputChange('in_stock', checked)}
      />
    </div>
    
    <!-- Сортировка -->
    <div>
      <label for="sort-select" class="block text-sm font-medium text-secondary-700 mb-3">Сортировка</label>
      <select 
        id="sort-select"
        value={filters.ordering || '-created_at'} 
        onchange={(e) => handleInputChange('ordering', e.target.value)}
        class="input"
      >
        <option value="-created_at">Новинки</option>
        <option value="price_opt">Цена: по возрастанию</option>
        <option value="-price_opt">Цена: по убыванию</option>
        <option value="title">Название: А-Я</option>
        <option value="-title">Название: Я-А</option>
        <option value="-available">Наличие: больше</option>
        <option value="available">Наличие: меньше</option>
      </select>
    </div>
  </div>
  
  <!-- Активные фильтры (только на мобильных) -->
  {#if hasActiveFilters}
    <div class="mt-6 md:hidden">
      <div class="flex flex-wrap gap-2">
        {#if filters.search}
          <span class="badge-primary">
            Поиск: {filters.search}
            <button
              onclick={() => { searchValue = ''; handleInputChange('search', ''); }}
              class="ml-1 text-primary-600 hover:text-primary-800"
            >
              ×
            </button>
          </span>
        {/if}
        
        {#if filters.brand}
          {#each filters.brand.split(',') as brandId}
            {@const brand = brands.find(b => b.id == brandId)}
            {#if brand}
              <span class="badge-primary">
                Бренд: {brand.name}
                <button
                  onclick={() => handleBrandToggle(brandId, false)}
                  class="ml-1 text-primary-600 hover:text-primary-800"
                >
                  ×
                </button>
              </span>
            {/if}
          {/each}
        {/if}
        
        {#if filters.in_stock}
          <span class="badge-primary">
            В наличии
            <button
              onclick={() => handleInputChange('in_stock', false)}
              class="ml-1 text-primary-600 hover:text-primary-800"
            >
              ×
            </button>
          </span>
        {/if}
      </div>
    </div>
  {/if}
</div>