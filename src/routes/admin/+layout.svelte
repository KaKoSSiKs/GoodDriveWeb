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
  
  // Проверка при монтировании
  onMount(() => {
    isAuthenticated = checkAuth();
    currentUser = adminAuth.getUser();
    
    // Если авторизован и на странице логина - редирект в дашборд
    if (isAuthenticated && currentPath === '/admin') {
      goto('/admin/dashboard');
    }
    // Если не авторизован и НЕ на странице логина - редирект на логин
    else if (!isAuthenticated && currentPath !== '/admin') {
      goto('/admin');
    }
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
  <div class="min-h-screen bg-gray-100 w-full">
    <!-- Шапка админки -->
    <header class="bg-white shadow-sm border-b border-gray-200 w-full">
      <div class="container-fluid px-2 sm:px-4 lg:px-6">
        <div class="flex items-center justify-between min-h-[64px] py-2 gap-2 flex-wrap">
          <!-- Логотип -->
          <div class="flex items-center">
            <a href="/admin/dashboard" class="flex items-center space-x-2 group">
              <div class="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary-600 to-brand-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
                <span class="text-white font-bold text-sm sm:text-base">A</span>
              </div>
              <span class="text-base sm:text-xl font-bold bg-gradient-to-r from-primary-700 to-brand-700 bg-clip-text text-transparent whitespace-nowrap">Admin</span>
            </a>
          </div>
          
          <!-- Навигация (только >= 1024px) -->
          <nav class="hidden lg:flex items-center space-x-4 flex-1">
            <a 
              href="/admin/dashboard" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/dashboard') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Главная
            </a>
            <a 
              href="/admin/orders" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/orders') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Заказы
            </a>
            <a 
              href="/admin/inventory" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/inventory') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Остатки
            </a>
            <a 
              href="/admin/analytics" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/analytics') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Аналитика
            </a>
            <a 
              href="/admin/finance" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/finance') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Финансы
            </a>
            <a 
              href="/admin/customers" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/customers') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Клиенты
            </a>
            <a 
              href="/admin/help-requests" 
              class="px-3 py-2 rounded-lg transition-colors whitespace-nowrap text-sm {isActive('/admin/help-requests') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              Запросы
            </a>
          </nav>
          
          <!-- Кнопка бургера (< 1024px) -->
          <button
            onclick={toggleMobileMenu}
            class="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Меню"
          >
            <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if isMobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              {/if}
            </svg>
          </button>
          
          <!-- Пользователь -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <!-- Уведомления -->
            <NotificationBell />
            
            <a href="/" class="hidden sm:block text-gray-600 hover:text-gray-900 text-sm" target="_blank">
              На сайт
            </a>
            <button 
              onclick={handleLogout}
              class="px-2 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
      
      <!-- Бургер-меню (< 1024px) -->
      {#if isMobileMenuOpen}
        <div class="lg:hidden bg-white border-b border-gray-200">
          <nav class="px-4 py-3 space-y-1">
            <a 
              href="/admin/dashboard"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/dashboard') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              📊 Главная
            </a>
            <a 
              href="/admin/orders"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/orders') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              📦 Заказы
            </a>
            <a 
              href="/admin/inventory"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/inventory') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              📦 Остатки
            </a>
            <a 
              href="/admin/analytics"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/analytics') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              📈 Аналитика
            </a>
            <a 
              href="/admin/finance"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/finance') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              💰 Финансы
            </a>
            <a 
              href="/admin/customers"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/customers') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              👥 Клиенты
            </a>
            <a 
              href="/admin/help-requests"
              onclick={closeMobileMenu}
              class="block px-4 py-3 rounded-lg transition-colors {isActive('/admin/help-requests') ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}"
            >
              💬 Запросы
            </a>
            
            <div class="border-t border-gray-200 my-2 pt-2">
              <a 
                href="/" 
                target="_blank"
                onclick={closeMobileMenu}
                class="block px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                🌐 На сайт
              </a>
            </div>
          </nav>
        </div>
      {/if}
    </header>
    
    <!-- Контент -->
    <main class="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <div class="w-full">
        {@render children()}
      </div>
    </main>
  </div>
{:else}
  <!-- Страница логина или загрузка -->
  {@render children()}
{/if}

