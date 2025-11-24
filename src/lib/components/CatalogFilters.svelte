<script>
  import FilterCheckbox from './FilterCheckbox.svelte';
  import { onMount } from 'svelte';
  
  let {
    brands = [],
    warehouses = [],
    filters = {},
    onFilterChange = () => {},
    onClearFilters = () => {}
  } = $props();
  
  let isExpanded = $state(false);
  let searchValue = $state(filters.search || '');
  let priceMin = $state(filters.price_min || '');
  let priceMax = $state(filters.price_max || '');
  let searchTimeout = null;
  let searchError = $state('');
  
const hasActiveFilters = $derived(
  filters.search || filters.category || filters.brand || filters.warehouse || 
  filters.price_min || filters.price_max || filters.in_stock
);

const activeFilterCount = $derived(
  ['search', 'category', 'brand', 'warehouse', 'price_min', 'price_max']
    .filter((key) => !!filters[key])
    .length + (filters.in_stock ? 1 : 0)
);

function getFilterLabel(count) {
  if (count === 1) return 'фильтр';
  if (count >= 2 && count <= 4) return 'фильтра';
  return 'фильтров';
}
  
  function debounceSearch(value) {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      handleInputChange('search', value);
    }, 500);
  }
  
  function handleInputChange(field, value) {
    onFilterChange({ ...filters, [field]: value });
  }
  
  function handleSearchInput(event) {
    const value = event.target.value;
    searchValue = value;
    if (searchError && value.trim().length > 0) {
      searchError = '';
    }
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
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) {
      searchError = 'Введите номер или название детали';
      return;
    }
    searchError = '';
    handleInputChange('search', trimmedValue);
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
  
  onMount(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  });
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-bold text-gray-900">Фильтры</h2>
      {#if hasActiveFilters}
        <span class="md:hidden inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">
          {activeFilterCount} {getFilterLabel(activeFilterCount)}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-2 ml-auto">
      {#if hasActiveFilters}
        <button 
          onclick={onClearFilters}
          class="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
        >
          Сбросить
        </button>
      {/if}
      <button
        onclick={toggleExpanded}
        class="md:hidden inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="catalog-filters-panel"
      >
        {isExpanded ? 'Скрыть' : 'Показать'}
        <svg class="w-4 h-4 transition-transform {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  </div>
  
  <div id="catalog-filters-panel" class="space-y-8 {isExpanded ? '' : 'hidden md:block'}">
    <!-- Search -->
    <div>
      <form onsubmit={handleSearchSubmit}>
        <div class="relative">
          <input
            id="search-input"
            type="text"
            placeholder="Поиск..."
            value={searchValue}
            oninput={handleSearchInput}
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 pl-10 text-sm transition-all shadow-inner"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {#if searchValue}
            <button
              type="button"
              onclick={() => { searchValue = ''; handleInputChange('search', ''); }}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
        {#if searchError}
          <p class="text-xs text-red-500 mt-2 ml-1">{searchError}</p>
        {/if}
      </form>
    </div>

    <!-- Category -->
    <div>
      <label for="category-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Категория</label>
      <select
        id="category-select"
        class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
        value={filters.category || ''}
        onchange={(e) => handleInputChange('category', e.target.value || '')}
      >
        <option value="">Все категории</option>
        <option value="electronics">Электроника</option>
        <option value="engine">Двигатель</option>
        <option value="suspension">Подвеска</option>
        <option value="brakes">Тормоза</option>
      </select>
    </div>
    
    <!-- Price -->
    <div>
      <div class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Цена, ₽</div>
      <div class="grid grid-cols-2 gap-3">
        <div class="relative">
          <input
            type="number"
            placeholder="От"
            value={priceMin}
            oninput={(e) => handlePriceChange('price_min', e.target.value)}
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm text-center"
            min="0"
          />
        </div>
        <div class="relative">
          <input
            type="number"
            placeholder="До"
            value={priceMax}
            oninput={(e) => handlePriceChange('price_max', e.target.value)}
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm text-center"
            min="0"
          />
        </div>
      </div>
    </div>
    
    <!-- Brands -->
    <div>
      <div class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Бренды</div>
      <div class="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {#each brands.slice(0, 10) as brand}
          <FilterCheckbox
            label={brand.name}
            checked={isBrandSelected(brand.id)}
            count={brand.parts_count}
            onToggle={(checked) => handleBrandToggle(brand.id, checked)}
          />
        {/each}
      </div>
    </div>
    
    <!-- In Stock Toggle -->
    <div class="pt-4 border-t border-gray-100">
      <FilterCheckbox
        label="Только в наличии"
        checked={filters.in_stock || false}
        onToggle={(checked) => handleInputChange('in_stock', checked)}
      />
    </div>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 20px;
  }
</style>
