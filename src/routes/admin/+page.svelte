<script>
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { adminAuth } from '$lib/utils/admin-auth.js';
  
  let form = $state({
    username: '',
    password: ''
  });
  
  let error = $state('');
  let isLoading = $state(false);
  
  // Проверка существующей авторизации
  onMount(() => {
    if (adminAuth.isAuthenticated()) {
      goto('/admin/dashboard');
    }
  });
  
  // Обработка входа
  async function handleLogin(event) {
    event.preventDefault();
    error = '';
    isLoading = true;
    
    try {
      await adminAuth.login(form.username, form.password);
      
      // Переход в админку
      goto('/admin/dashboard');
    } catch (err) {
      error = err.message || 'Неверный логин или пароль';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Вход в админ-панель - GoodDrive</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
  <div class="max-w-md w-full">
    <!-- Логотип -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-600 to-brand-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
        <span class="text-white font-bold text-3xl">A</span>
      </div>
      <h1 class="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent mb-2">Admin Panel</h1>
      <p class="text-gray-400">GoodDrive</p>
    </div>
    
    <!-- Форма входа -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Вход в систему</h2>
      
      <form onsubmit={handleLogin} class="space-y-6">
        <!-- Логин -->
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
            Логин
          </label>
          <input
            type="text"
            id="username"
            bind:value={form.username}
            class="input w-full"
            placeholder="admin"
            required
            autocomplete="username"
          />
        </div>
        
        <!-- Пароль -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            Пароль
          </label>
          <input
            type="password"
            id="password"
            bind:value={form.password}
            class="input w-full"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
        </div>
        
        <!-- Ошибка -->
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-red-600 text-sm">{error}</p>
          </div>
        {/if}
        
        <!-- Кнопка входа -->
        <button
          type="submit"
          disabled={isLoading}
          class="w-full btn-primary py-3 disabled:opacity-50"
        >
          {isLoading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      
      <!-- Ссылка на сайт -->
      <div class="mt-6 text-center">
        <a href="/" class="text-sm text-gray-600 hover:text-primary-600">
          ← Вернуться на сайт
        </a>
      </div>
    </div>
    
    <!-- Информация -->
    <div class="mt-6 text-center text-sm text-gray-400">
      <p>Доступ только для администраторов</p>
    </div>
  </div>
</div>

