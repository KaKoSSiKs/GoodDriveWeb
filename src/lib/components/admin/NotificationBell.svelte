<script>
  import { onMount, onDestroy } from 'svelte';
  import { notificationsApi } from '$lib/utils/api.js';
  
  let unreadCount = $state(0);
  let showDropdown = $state(false);
  let notifications = $state([]);
  let isLoading = $state(false);
  let pollingInterval = null;
  let audioContext = null;
  let lastCount = 0;
  
  // Звук уведомления
  function playNotificationSound() {
    try {
      // Создаём простой бип
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Частота звука
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }
  
  async function loadUnreadCount() {
    try {
      const response = await notificationsApi.getUnreadCount();
      const newCount = response.count || 0;
      
      // Если количество увеличилось - воспроизводим звук
      if (newCount > lastCount && lastCount > 0) {
        playNotificationSound();
      }
      
      lastCount = newCount;
      unreadCount = newCount;
    } catch (error) {
      console.error('Error loading notifications count:', error);
    }
  }
  
  async function loadNotifications() {
    try {
      isLoading = true;
      const response = await notificationsApi.getNotifications({ page_size: 10 });
      notifications = response.results || response;
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      isLoading = false;
    }
  }
  
  async function handleNotificationClick(notification) {
    // Отмечаем как прочитанное
    try {
      await notificationsApi.markAsRead(notification.id);
      notification.is_read = true;
      notifications = [...notifications];
      
      // Переходим по ссылке если есть
      if (notification.link) {
        window.location.href = notification.link;
      }
      
      // Обновляем счётчик
      loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead();
      notifications.forEach(n => n.is_read = true);
      notifications = [...notifications];
      unreadCount = 0;
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }
  
  async function handleClearAll() {
    if (!confirm('Удалить все уведомления?')) return;
    
    try {
      await notificationsApi.clearAll();
      notifications = [];
      unreadCount = 0;
      showDropdown = false;
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
  
  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (showDropdown && notifications.length === 0) {
      loadNotifications();
    }
  }
  
  function getPriorityColor(priority) {
    const colors = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-blue-600',
      low: 'text-gray-600'
    };
    return colors[priority] || 'text-gray-600';
  }
  
  function getTypeIcon(type) {
    const icons = {
      new_order: '🛒',
      low_stock: '⚠️',
      zero_stock: '🚫',
      stuck_order: '⏰',
      system: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }
  
  onMount(() => {
    // Загружаем при монтировании
    loadUnreadCount();
    
    // Опрашиваем сервер каждые 10 секунд
    pollingInterval = setInterval(loadUnreadCount, 10000);
    
    // Закрываем dropdown при клике вне его
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.notification-bell')) {
        showDropdown = false;
      }
    };
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
  
  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
</script>

<div class="notification-bell relative">
  <button
    onclick={toggleDropdown}
    class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
    aria-label="Уведомления"
  >
    <!-- Иконка колокольчика -->
    <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    
    <!-- Счётчик непрочитанных -->
    {#if unreadCount > 0}
      <span class="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    {/if}
  </button>
  
  <!-- Dropdown с уведомлениями -->
  {#if showDropdown}
    <div class="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
      <!-- Заголовок -->
      <div class="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">Уведомления</h3>
        <div class="flex items-center space-x-2">
          {#if unreadCount > 0}
            <button
              onclick={handleMarkAllRead}
              class="text-xs text-primary-600 hover:text-primary-700"
            >
              Прочитать все
            </button>
          {/if}
          <button
            onclick={handleClearAll}
            class="text-xs text-gray-600 hover:text-gray-700"
          >
            Очистить
          </button>
        </div>
      </div>
      
      <!-- Список уведомлений -->
      <div class="max-h-96 overflow-y-auto">
        {#if isLoading}
          <div class="p-8 text-center">
            <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
          </div>
        {:else if notifications.length === 0}
          <div class="p-8 text-center text-gray-500">
            <p>Нет уведомлений</p>
          </div>
        {:else}
          {#each notifications as notification}
            <button
              onclick={() => handleNotificationClick(notification)}
              class="w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 {notification.is_read ? 'opacity-60' : ''}"
            >
              <div class="flex items-start space-x-3">
                <span class="text-2xl flex-shrink-0">{getTypeIcon(notification.type)}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between mb-1">
                    <h4 class="text-sm font-semibold text-gray-900 truncate">
                      {notification.title}
                    </h4>
                    {#if !notification.is_read}
                      <span class="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 ml-2"></span>
                    {/if}
                  </div>
                  <p class="text-xs text-gray-600 line-clamp-2 mb-1">
                    {notification.message}
                  </p>
                  <div class="flex items-center justify-between">
                    <span class="text-xs {getPriorityColor(notification.priority)}">
                      {notification.priority_display}
                    </span>
                    <span class="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleString('ru-RU', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

