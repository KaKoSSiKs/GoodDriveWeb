<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { adminAuth } from '$lib/utils/admin-auth.js';
  import NotificationBell from '$lib/components/admin/NotificationBell.svelte';
  
  let { children } = $props();
  
  let isAuthenticated = $state(false);
  let currentPath = $derived($page.url.pathname);
  let currentUser = $state(null);
  let isMobileMenuOpen = $state(false);
  let isScrolled = $state(false);
  
  // Проверка авторизации
  function checkAuth() {
    if (typeof window === 'undefined') return false;
    return adminAuth.isAuthenticated();
  }
  
  // Выход
  function handleLogout() {
    adminAuth.logout();
    goto('/admin');
  }

  function handleScroll() {
    isScrolled = window.scrollY > 10;
  }
  
  // Проверка при монтировании
  onMount(() => {
    isAuthenticated = checkAuth();
    currentUser = adminAuth.getUser();
    
    window.addEventListener('scroll', handleScroll);

    // Если авторизован и на странице логина - редирект в дашборд
    if (isAuthenticated && currentPath === '/admin') {
      goto('/admin/dashboard');
    }
    // Если не авторизован и НЕ на странице логина - редирект на логин
    else if (!isAuthenticated && currentPath !== '/admin') {
      goto('/admin');
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
  
  // Активная ссылка
  function isActive(path) {
    return currentPath === path || currentPath.startsWith(path + '/');
  }
  
  // Переключение мобильного меню
  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }
  
  // Закрытие меню при переходе
  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }
</script>

{#if isAuthenticated && currentPath !== '/admin'}
  <!-- Админ панель layout -->
  <div class="min-h-screen bg-[#F8F9FA] w-full flex flex-col">
    <!-- Шапка админки -->
    <header class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {isScrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm' : 'bg-white/50 backdrop-blur-md'} border-b border-gray-100">
      <div class="container-fluid px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 gap-4">
          <!-- Логотип -->
          <div class="flex items-center flex-shrink-0">
            <a href="/admin/dashboard" class="flex items-center gap-3 group">
              <div class="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <span class="text-white font-bold text-lg">A</span>
              </div>
              <span class="text-lg font-bold text-gray-900 tracking-tight hidden sm:block">Admin Panel</span>
            </a>
          </div>
          
          <!-- Навигация (только >= 1024px) -->
          <nav class="hidden lg:flex items-center gap-1 overflow-x-auto flex-1 justify-center">
            <a 
              href="/admin/dashboard" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/dashboard') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Главная
            </a>
            <a 
              href="/admin/orders" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/orders') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Заказы
            </a>
            <a 
              href="/admin/inventory" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/inventory') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Остатки
            </a>
            <a 
              href="/admin/analytics" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/analytics') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Аналитика
            </a>
            <a 
              href="/admin/finance" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/finance') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Финансы
            </a>
            <a 
              href="/admin/customers" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/customers') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Клиенты
            </a>
            <a 
              href="/admin/help-requests" 
              class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 {isActive('/admin/help-requests') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
            >
              Запросы
            </a>
          </nav>
          
          <!-- Кнопка бургера (< 1024px) -->
          <button
            onclick={toggleMobileMenu}
            class="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
            aria-label="Меню"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if isMobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
          
          <!-- Пользователь -->
          <div class="flex items-center gap-4">
            <!-- Уведомления -->
            <div class="hidden sm:block">
              <NotificationBell />
            </div>
            
            <div class="h-6 w-px bg-gray-200 hidden sm:block"></div>

            <a href="/" class="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors" target="_blank">
              <span>На сайт</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
            
            <button 
              onclick={handleLogout}
              class="p-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
            >
              <span class="hidden sm:inline">Выйти</span>
              <svg class="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Бургер-меню (< 1024px) -->
      {#if isMobileMenuOpen}
        <div class="lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 animate-in slide-in-from-top-5">
          <nav class="px-4 py-6 space-y-2">
            <a 
              href="/admin/dashboard"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/dashboard') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">📊</span> Главная
            </a>
            <a 
              href="/admin/orders"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/orders') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">📦</span> Заказы
            </a>
            <a 
              href="/admin/inventory"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/inventory') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">🏷️</span> Остатки
            </a>
            <a 
              href="/admin/analytics"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/analytics') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">📈</span> Аналитика
            </a>
            <a 
              href="/admin/finance"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/finance') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">💰</span> Финансы
            </a>
            <a 
              href="/admin/customers"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/customers') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">👥</span> Клиенты
            </a>
            <a 
              href="/admin/help-requests"
              onclick={closeMobileMenu}
              class="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all {isActive('/admin/help-requests') ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}"
            >
              <span class="text-lg">💬</span> Запросы
            </a>
            
            <div class="border-t border-gray-100 my-4 pt-4">
              <a 
                href="/" 
                target="_blank"
                onclick={closeMobileMenu}
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-medium"
              >
                <span class="text-lg">🌐</span> На сайт
              </a>
            </div>
          </nav>
        </div>
      {/if}
    </header>
    
    <!-- Контент -->
    <main class="flex-1 w-full pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
      <div class="w-full animate-in fade-in duration-500 slide-in-from-bottom-4">
        {@render children()}
      </div>
    </main>
  </div>
{:else}
  <!-- Страница логина или загрузка -->
  {@render children()}
{/if}
