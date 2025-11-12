<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { cartUtils } from '$lib/utils/api.js';
  import SearchAutocomplete from './SearchAutocomplete.svelte';
  
  // Реактивное состояние с новой реактивностью Svelte 5
  let cartItemsCount = $state(0);
  let isMenuOpen = $state(false);
  let logoLoadFailed = $state(false);
  
  // Загрузка количества товаров в корзине
  function loadCartCount() {
    cartItemsCount = cartUtils.getTotalItems();
  }
  
  // Обновление счетчика корзины при изменении
  function updateCartCount() {
    loadCartCount();
  }
  
  function handleSearch(query) {
    if (query.trim()) {
      // Переход на страницу поиска с параметрами
      window.location.href = `/catalog?search=${encodeURIComponent(query)}`;
    }
  }
  
  function handleProductSelect(product) {
    // Переход на страницу товара
    window.location.href = `/product/${product.id}`;
  }
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  // Инициализация
  onMount(() => {
    loadCartCount();
    
    // Слушаем изменения в корзине
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  });
</script>

<header class="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-50">
  <div class="container-custom">
    <div class="flex items-center justify-between h-16">
      <!-- Логотип -->
      <div class="flex items-center">
        <a href="/" class="flex items-center space-x-3 group" aria-label="GoodDrive">
          {#if !logoLoadFailed}
            <img src="/images/logo.jpg" alt="GoodDrive" class="h-12 w-auto group-hover:scale-105 transition-transform" onerror={() => logoLoadFailed = true} />
          {:else}
            <div class="w-12 h-12 bg-primary-700 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xl">G</span>
            </div>
          {/if}
          <span class="text-2xl font-bold text-primary-700">GoodDrive</span>
        </a>
      </div>
      
      <!-- Поиск (скрыт на мобильных) -->
      <div class="hidden md:flex flex-1 max-w-lg mx-8">
        <SearchAutocomplete
          placeholder="Поиск автозапчастей..."
          onSelect={handleProductSelect}
          onSearch={handleSearch}
        />
      </div>
      
      <!-- Навигация и корзина -->
      <div class="flex items-center space-x-4">
        <!-- Навигационные ссылки (скрыты на мобильных) -->
        <nav class="hidden md:flex items-center space-x-6" aria-label="Основная навигация">
          <a href="/catalog" class="text-neutral-700 hover:text-primary-700 transition-colors font-medium">
            Каталог
          </a>
          <a href="/about" class="text-neutral-700 hover:text-primary-700 transition-colors font-medium">
            О компании
          </a>
          <a href="/faq" class="text-neutral-700 hover:text-primary-700 transition-colors font-medium">
            FAQ
          </a>
          <a href="/#contacts" class="text-neutral-700 hover:text-primary-700 transition-colors font-medium">
            Контакты
          </a>
        </nav>
        
        <!-- Корзина -->
        <a href="/cart" class="relative p-2 text-neutral-700 hover:text-primary-700 transition-all" aria-label="Корзина">
          <img src="/icons/shoping_cart.png" alt="Корзина" class="h-6 w-6" />
          {#if cartItemsCount > 0}
            <span class="absolute -top-1 -right-1 bg-primary-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
              {cartItemsCount}
            </span>
          {/if}
        </a>
        
        <!-- Мобильное меню -->
        <button 
          onclick={toggleMenu}
          class="md:hidden p-2 text-neutral-700 hover:text-primary-700 transition-colors"
          aria-label="Toggle menu"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Мобильное меню -->
    {#if isMenuOpen}
      <div class="md:hidden border-t border-neutral-200 py-4 animate-slide-up">
        <div class="space-y-4">
          <!-- Мобильный поиск -->
          <SearchAutocomplete
            placeholder="Поиск автозапчастей..."
            onSelect={handleProductSelect}
            onSearch={handleSearch}
          />
          
          <!-- Мобильная навигация -->
          <nav class="space-y-2" aria-label="Мобильная навигация">
            <a href="/catalog" class="block py-2 text-neutral-700 hover:text-primary-700 transition-colors font-medium">
              Каталог
            </a>
            <a href="/about" class="block py-2 text-neutral-700 hover:text-primary-700 transition-colors font-medium">
              О компании
            </a>
            <a href="/faq" class="block py-2 text-neutral-700 hover:text-primary-700 transition-colors font-medium">
              FAQ
            </a>
            <a href="/#contacts" class="block py-2 text-neutral-700 hover:text-primary-700 transition-colors font-medium">
              Контакты
            </a>
          </nav>
        </div>
      </div>
    {/if}
  </div>
</header>
