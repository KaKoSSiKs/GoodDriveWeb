<script>
  import { onMount } from 'svelte';
  import { partsApi, imageUtils } from '$lib/utils/api.js';
  
  // Пропсы компонента (Svelte 5 синтаксис)
  let {
    placeholder = 'Поиск автозапчастей...',
    onSelect = () => {},
    onSearch = () => {},
    debounceMs = 300
  } = $props();
  
  // Реактивное состояние
  let searchQuery = $state('');
  let suggestions = $state([]);
  let isLoading = $state(false);
  let isOpen = $state(false);
  let selectedIndex = $state(-1);
  let timeoutId = $state(null);
  
  // Производные значения
  let hasSuggestions = $derived(suggestions.length > 0 && isOpen);
  let hasQuery = $derived(searchQuery.trim().length > 0);
  
  // Загрузка предложений
  async function loadSuggestions(query) {
    if (!query.trim() || query.length < 2) {
      suggestions = [];
      return;
    }
    
    isLoading = true;
    try {
      const data = await partsApi.getParts({
        search: query,
        page_size: 5,
        ordering: '-available'
      });
      
      suggestions = data.results || [];
    } catch (error) {
      console.error('Ошибка загрузки предложений:', error);
      suggestions = [];
    } finally {
      isLoading = false;
    }
  }
  
  // Debounced поиск
  function debouncedSearch(query) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      loadSuggestions(query);
    }, debounceMs);
  }
  
  // Обработчики
  function handleInput(event) {
    searchQuery = event.target.value;
    isOpen = true;
    selectedIndex = -1;
    debouncedSearch(searchQuery);
  }
  
  function handleKeyDown(event) {
    if (!hasSuggestions) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          performSearch();
        }
        break;
      case 'Escape':
        isOpen = false;
        selectedIndex = -1;
        break;
    }
  }
  
  function handleFocus() {
    if (hasQuery) {
      isOpen = true;
    }
  }
  
  function handleBlur() {
    // Задержка для обработки клика по предложению
    setTimeout(() => {
      isOpen = false;
      selectedIndex = -1;
    }, 150);
  }
  
  function selectSuggestion(suggestion) {
    searchQuery = suggestion.title;
    isOpen = false;
    selectedIndex = -1;
    onSelect(suggestion);
  }
  
  function performSearch() {
    if (!hasQuery) return;
    
    isOpen = false;
    onSearch(searchQuery);
  }
  
  function clearSearch() {
    searchQuery = '';
    suggestions = [];
    isOpen = false;
    selectedIndex = -1;
  }
  
  // Инициализация
  onMount(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

<div class="relative w-full">
  <!-- Поле поиска -->
  <div class="relative">
    <input
      type="text"
      placeholder={placeholder}
      bind:value={searchQuery}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      onfocus={handleFocus}
      onblur={handleBlur}
      class="input pl-10 pr-10 w-full"
    />
    
    <!-- Иконка поиска -->
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg class="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    
    <!-- Кнопка очистки -->
    {#if hasQuery}
      <button
        onclick={clearSearch}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
        aria-label="Очистить поиск"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {:else}
      <!-- Кнопка поиска -->
      <button
        onclick={performSearch}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-primary-500"
        aria-label="Поиск"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    {/if}
  </div>
  
  <!-- Выпадающий список предложений -->
  {#if hasSuggestions}
    <div class="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
      {#each suggestions as suggestion, index}
        <button
          onclick={() => selectSuggestion(suggestion)}
          class="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 {selectedIndex === index ? 'bg-primary-50' : ''}"
        >
          <div class="flex items-center space-x-3">
            <!-- Изображение товара -->
            <div class="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {#if suggestion.main_image}
                <img 
                  src={imageUtils.getAbsoluteUrl(suggestion.main_image.url)} 
                  alt={suggestion.main_image.alt || suggestion.title}
                  class="w-full h-full object-cover rounded-lg"
                />
              {:else}
                <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              {/if}
            </div>
            
            <!-- Информация о товаре -->
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-neutral-900 truncate">{suggestion.title}</h3>
              <p class="text-sm text-neutral-600">{suggestion.brand_name}</p>
              {#if suggestion.original_number}
                <p class="text-xs text-neutral-500 font-mono">{suggestion.original_number}</p>
              {/if}
            </div>
            
            <!-- Цена и наличие -->
            <div class="text-right flex-shrink-0">
              <p class="font-semibold text-primary-500">{suggestion.price_opt.toLocaleString()} ₽</p>
              <p class="text-xs text-neutral-500">
                {suggestion.available > 0 ? `${suggestion.available} шт.` : 'Нет в наличии'}
              </p>
            </div>
          </div>
        </button>
      {/each}
      
      <!-- Кнопка "Показать все результаты" -->
      <div class="px-4 py-2 border-t border-neutral-200">
        <button
          onclick={performSearch}
          class="w-full text-center text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          Показать все результаты для "{searchQuery}"
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Индикатор загрузки -->
  {#if isLoading}
    <div class="absolute inset-y-0 right-0 pr-10 flex items-center pointer-events-none">
      <svg class="animate-spin h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  {/if}
</div>



