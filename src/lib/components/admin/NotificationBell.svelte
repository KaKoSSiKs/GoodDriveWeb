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
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
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
      
      if (newCount > lastCount && lastCount >= 0) {
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
    try {
      await notificationsApi.markAsRead(notification.id);
      notification.is_read = true;
      notifications = [...notifications];
      
      if (notification.link) {
        window.location.href = notification.link;
      }
      
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
      critical: 'text-red-600 bg-red-50 border-red-100',
      high: 'text-orange-600 bg-orange-50 border-orange-100',
      medium: 'text-blue-600 bg-blue-50 border-blue-100',
      low: 'text-gray-600 bg-gray-50 border-gray-100'
    };
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-100';
  }
  
  function getTypeIcon(type) {
    const icons = {
      new_order: '🛍️',
      low_stock: '⚠️',
      zero_stock: '🚫',
      stuck_order: '⏳',
      system: '⚙️'
    };
    return icons[type] || 'ℹ️';
  }
  
  onMount(() => {
    loadUnreadCount();
    pollingInterval = setInterval(loadUnreadCount, 10000);
    
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
    class="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
    aria-label="Уведомления"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    
    {#if unreadCount > 0}
      <span class="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-white animate-pulse">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    {/if}
  </button>
  
  <!-- Dropdown -->
  {#if showDropdown}
    <div class="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <!-- Заголовок -->
      <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
        <h3 class="font-bold text-gray-900">Уведомления</h3>
        <div class="flex items-center gap-3">
          {#if unreadCount > 0}
            <button
              onclick={handleMarkAllRead}
              class="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Прочитать все
            </button>
          {/if}
          <button
            onclick={handleClearAll}
            class="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            Очистить
          </button>
        </div>
      </div>
      
      <!-- Список -->
      <div class="max-h-[400px] overflow-y-auto">
        {#if isLoading}
          <div class="p-8 text-center flex justify-center">
            <div class="animate-spin w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full"></div>
          </div>
        {:else if notifications.length === 0}
          <div class="p-12 text-center text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p class="text-sm">Нет новых уведомлений</p>
          </div>
        {:else}
          <div class="divide-y divide-gray-50">
            {#each notifications as notification}
              <button
                onclick={() => handleNotificationClick(notification)}
                class="w-full text-left p-4 hover:bg-gray-50 transition-all duration-200 flex gap-3 group {notification.is_read ? 'opacity-60 grayscale-[0.5]' : ''}"
              >
                <div class="text-2xl flex-shrink-0 bg-gray-100 w-10 h-10 rounded-xl flex items-center justify-center">
                  {getTypeIcon(notification.type)}
                </div>
                
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <h4 class="text-sm font-bold text-gray-900 truncate pr-2">
                      {notification.title}
                    </h4>
                    <span class="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                      {new Date(notification.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p class="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                    {notification.message}
                  </p>
                  
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] px-2 py-0.5 rounded-md border font-medium {getPriorityColor(notification.priority)}">
                      {notification.priority_display}
                    </span>
                    {#if !notification.is_read}
                      <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {/if}
                  </div>
                </div>
              </button>
            {/each}
          </div>
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
