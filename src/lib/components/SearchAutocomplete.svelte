<script>
  import { onMount } from 'svelte';
  import { partsApi, imageUtils } from '$lib/utils/api.js';
  
  let {
    placeholder = 'Поиск автозапчастей...',
    onSelect = () => {},
    onSearch = () => {},
    debounceMs = 300,
    variant = 'default' // 'default' | 'minimal'
  } = $props();
  
  let searchQuery = $state('');
  let suggestions = $state([]);
  let isLoading = $state(false);
  let isOpen = $state(false);
  let selectedIndex = $state(-1);
  let timeoutId = $state(null);
  let searchMessage = $state('');
  
  let hasSuggestions = $derived(suggestions.length > 0 && isOpen);
  let hasQuery = $derived(searchQuery.trim().length > 0);
  
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
  
  function debouncedSearch(query) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      loadSuggestions(query);
    }, debounceMs);
  }
  
  function handleInput(event) {
    searchQuery = event.target.value;
    if (searchMessage) {
      searchMessage = '';
    }
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
    setTimeout(() => {
      isOpen = false;
      selectedIndex = -1;
    }, 150);
  }
  
  function selectSuggestion(suggestion) {
    searchQuery = suggestion.title;
    if (searchMessage) {
      searchMessage = '';
    }
    isOpen = false;
    selectedIndex = -1;
    onSelect(suggestion);
  }
  
  function performSearch() {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      searchMessage = 'Введите номер или название детали';
      isOpen = false;
      selectedIndex = -1;
      return;
    }
    
    isOpen = false;
    searchMessage = '';
    onSearch(trimmedQuery);
  }
  
  function clearSearch() {
    searchQuery = '';
    suggestions = [];
    isOpen = false;
    selectedIndex = -1;
  }
  
  onMount(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

<div class="relative w-full">
  <!-- Input Field -->
  <div class="relative">
    <input
      type="text"
      placeholder={placeholder}
      bind:value={searchQuery}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      onfocus={handleFocus}
      onblur={handleBlur}
      class="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-transparent rounded-full focus:bg-white focus:border-gray-300 focus:ring-0 transition-all text-sm text-gray-900 placeholder-gray-500 shadow-inner"
    />
    
    <!-- Search Icon -->
    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    
    <!-- Clear/Action Button -->
    {#if hasQuery}
      <button
        onclick={clearSearch}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        aria-label="Очистить"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {:else}
      <button
        onclick={performSearch}
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        aria-label="Найти"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    {/if}
  </div>
  
  {#if searchMessage}
    <p class="text-xs text-red-500 mt-1 ml-2" aria-live="polite">{searchMessage}</p>
  {/if}
  
  <!-- Suggestions Dropdown (Glassmorphism) -->
  {#if hasSuggestions}
    <div class="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
      {#each suggestions as suggestion, index}
        <button
          onclick={() => selectSuggestion(suggestion)}
          class="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0 transition-colors {selectedIndex === index ? 'bg-gray-50' : ''}"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
              {#if suggestion.main_image}
                <img 
                  src={imageUtils.getAbsoluteUrl(suggestion.main_image.url)} 
                  alt={suggestion.title}
                  class="w-full h-full object-cover"
                />
              {:else}
                <div class="w-full h-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              {/if}
            </div>
            
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-sm text-gray-900 truncate">{suggestion.title}</h3>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{suggestion.brand_name}</span>
                {#if suggestion.original_number}
                  <span class="text-xs text-gray-400 font-mono">{suggestion.original_number}</span>
                {/if}
              </div>
            </div>
            
            <div class="text-right">
              <p class="text-sm font-bold text-gray-900">{suggestion.price_opt.toLocaleString()} ₽</p>
              <p class="text-xs text-green-600 mt-0.5">В наличии</p>
            </div>
          </div>
        </button>
      {/each}
      
      <div class="p-2 bg-gray-50 border-t border-gray-100">
        <button
          onclick={performSearch}
          class="w-full py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
        >
          Все результаты ({suggestions.length}+)
        </button>
      </div>
    </div>
  {/if}
  
  {#if isLoading}
    <div class="absolute inset-y-0 right-10 flex items-center pointer-events-none">
      <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  {/if}
</div>
