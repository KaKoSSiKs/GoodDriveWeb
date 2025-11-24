<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { cartUtils } from '$lib/utils/api.js';
  import SearchAutocomplete from './SearchAutocomplete.svelte';
  
  let cartItemsCount = $state(0);
  let isMenuOpen = $state(false);
  let logoLoadFailed = $state(false);
  let isScrolled = $state(false);
  
  function loadCartCount() {
    cartItemsCount = cartUtils.getTotalItems();
  }
  
  function updateCartCount() {
    loadCartCount();
  }
  
  function handleSearch(query) {
    if (query.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(query)}`;
    }
  }
  
  function handleProductSelect(product) {
    window.location.href = `/product/${product.id}`;
  }
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  function handleScroll() {
    isScrolled = window.scrollY > 10;
  }
  
  onMount(() => {
    loadCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    
    return () => {
      window.removeEventListener('cartUpdated', updateCartCount);
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script>

<!-- Floating Glass Header -->
<header class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 {isScrolled ? 'py-2' : 'py-4 md:py-6'}">
  <div class="container-custom">
    <div class="relative bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm rounded-2xl px-6 transition-all duration-500 {isScrolled ? 'shadow-md bg-white/90' : ''}">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex-shrink-0 flex items-center">
          <a href="/" class="flex items-center gap-3 group">
            {#if !logoLoadFailed}
              <img src="/images/logo.jpg" alt="GoodDrive" class="h-10 w-auto rounded-lg group-hover:scale-105 transition-transform duration-300" onerror={() => logoLoadFailed = true} />
            {:else}
              <div class="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform duration-300">
                G
              </div>
            {/if}
            <span class="font-bold text-xl tracking-tight text-gray-900">GoodDrive</span>
          </a>
        </div>
        
        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-8">
          <a href="/catalog" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Каталог</a>
          <a href="/about" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">О нас</a>
          <a href="/faq" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
          <a href="/#contacts" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Контакты</a>
        </nav>
        
        <!-- Search & Cart -->
        <div class="flex items-center gap-4">
          <!-- Search (Desktop) -->
          <div class="hidden lg:block w-64">
            <SearchAutocomplete
              placeholder="Поиск..."
              onSelect={handleProductSelect}
              onSearch={handleSearch}
              variant="minimal"
            />
          </div>
          
          <!-- Cart Button -->
          <a href="/cart" class="relative p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors group">
            <svg class="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {#if cartItemsCount > 0}
              <span class="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg transform scale-100 transition-transform">
                {cartItemsCount}
              </span>
            {/if}
          </a>
          
          <!-- Mobile Menu Button -->
          <button onclick={toggleMenu} class="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if isMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Mobile Menu -->
      {#if isMenuOpen}
        <div class="md:hidden border-t border-gray-100/50 py-4 animate-in slide-in-from-top-5 fade-in duration-200">
          <div class="space-y-4 px-2">
            <SearchAutocomplete
              placeholder="Поиск запчастей..."
              onSelect={handleProductSelect}
              onSearch={handleSearch}
              variant="minimal"
            />
            <nav class="flex flex-col space-y-1">
              <a href="/catalog" class="block px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors" onclick={toggleMenu}>Каталог</a>
              <a href="/about" class="block px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors" onclick={toggleMenu}>О компании</a>
              <a href="/faq" class="block px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors" onclick={toggleMenu}>FAQ</a>
              <a href="/#contacts" class="block px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors" onclick={toggleMenu}>Контакты</a>
            </nav>
          </div>
        </div>
      {/if}
    </div>
  </div>
</header>
<!-- Spacer to prevent content from hiding behind fixed header -->
<div class="h-24 lg:h-28"></div>
