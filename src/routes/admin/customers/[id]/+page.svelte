<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { crmApi, formatUtils } from '$lib/utils/api.js';
  
  let customer = $state(null);
  let isLoading = $state(true);
  let isAddingNote = $state(false);
  let newNote = $state('');
  let notes = $state([]);
  let error = $state(null);
  
  // Получаем ID клиента из URL
  const customerId = parseInt($page.params.id);
  
  async function loadCustomer() {
    try {
      isLoading = true;
      error = null;
      const response = await crmApi.getCustomer(customerId);
      if (response.success && response.data) {
        customer = response.data;
        notes = customer.customerNotes || [];
        
        // Категория уже определена в API на основе totalOrders
        // Если category_display не пришло, определяем локально
        if (!customer.category_display) {
          // Определяем категорию клиента: 1 заказ = новый, 2+ = постоянный
          if (customer.totalOrders === 1) {
            customer.category = 'new';
            customer.category_display = 'Новый клиент';
          } else if (customer.totalOrders >= 2) {
            customer.category = 'regular';
            customer.category_display = 'Постоянный клиент';
          } else {
            customer.category = 'new';
            customer.category_display = 'Новый клиент';
          }
        }
      } else {
        error = 'Клиент не найден';
      }
    } catch (err) {
      console.error('Ошибка загрузки клиента:', err);
      error = 'Ошибка загрузки данных клиента';
    } finally {
      isLoading = false;
    }
  }
  
  async function addNote() {
    if (!newNote.trim()) {
      alert('Введите комментарий');
      return;
    }
    
    try {
      isAddingNote = true;
      const response = await fetch(`/api/crm/customers/${customerId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: newNote })
      });
      
      const result = await response.json();
      
      if (result.success) {
        newNote = '';
        await loadCustomer(); // Перезагружаем данные клиента
      } else {
        alert('Ошибка добавления комментария: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      alert('Ошибка добавления комментария');
    } finally {
      isAddingNote = false;
    }
  }
  
  function getCategoryColor(category) {
    switch (category) {
      case 'new':
        return 'bg-green-100 text-green-700';
      case 'regular':
        return 'bg-blue-100 text-blue-700';
      case 'vip':
        return 'bg-purple-100 text-purple-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
  
  onMount(() => {
    loadCustomer();
  });
</script>

<svelte:head>
  <title>Клиент {customer?.name || ''} - Admin</title>
</svelte:head>

<div class="space-y-6 w-full">
  <!-- Заголовок -->
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <button
        onclick={() => goto('/admin/customers')}
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Назад к списку клиентов"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Карточка клиента</h1>
        <p class="text-gray-600 mt-1">Детальная информация о клиенте</p>
      </div>
    </div>
  </div>
  
  {#if isLoading}
    <div class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-600 mt-4">Загрузка данных клиента...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <p class="text-red-700">{error}</p>
      <button
        onclick={() => goto('/admin/customers')}
        class="btn-outline mt-4"
      >
        Вернуться к списку клиентов
      </button>
    </div>
  {:else if customer}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Основная информация -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Информация о клиенте -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Информация о клиенте</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span class="text-sm font-medium text-gray-700">Имя</span>
              <p class="text-base text-gray-900 mt-1">{customer.name}</p>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-700">Телефон</span>
              <p class="text-base text-gray-900 mt-1">
                <a href="tel:{customer.phone}" class="text-primary-600 hover:text-primary-700">
                  {customer.phone}
                </a>
              </p>
            </div>
            {#if customer.email}
              <div>
                <span class="text-sm font-medium text-gray-700">Email</span>
                <p class="text-base text-gray-900 mt-1">
                  <a href="mailto:{customer.email}" class="text-primary-600 hover:text-primary-700">
                    {customer.email}
                  </a>
                </p>
              </div>
            {/if}
            <div>
              <span class="text-sm font-medium text-gray-700">Категория</span>
              <p class="mt-1">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {getCategoryColor(customer.category)}">
                  {customer.category_display || (customer.totalOrders === 1 ? 'Новый клиент' : customer.totalOrders >= 2 ? 'Постоянный клиент' : 'Новый клиент')}
                </span>
              </p>
            </div>
            {#if customer.city}
              <div>
                <span class="text-sm font-medium text-gray-700">Город</span>
                <p class="text-base text-gray-900 mt-1">{customer.city}</p>
              </div>
            {/if}
            {#if customer.address}
              <div class="md:col-span-2">
                <span class="text-sm font-medium text-gray-700">Адрес</span>
                <p class="text-base text-gray-900 mt-1">{customer.address}</p>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Статистика -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Статистика</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-1">Заказов</p>
              <p class="text-2xl font-bold text-blue-700">{customer.totalOrders || 0}</p>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-1">Потрачено</p>
              <p class="text-2xl font-bold text-green-700">{formatUtils.formatPrice(Number(customer.totalSpent || 0))}</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-1">Средний чек</p>
              <p class="text-2xl font-bold text-purple-700">{formatUtils.formatPrice(Number(customer.averageOrder || 0))}</p>
            </div>
          </div>
          {#if customer.lastOrderDate}
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-sm text-gray-600">Последний заказ</p>
              <p class="text-base text-gray-900 mt-1">
                {new Date(customer.lastOrderDate).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          {/if}
        </div>
        
        <!-- Комментарии -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Комментарии</h2>
          
          <!-- Форма добавления комментария -->
          <div class="mb-6 p-4 bg-gray-50 rounded-lg">
            <label for="newNote" class="block text-sm font-medium text-gray-700 mb-2">
              Добавить комментарий
            </label>
            <textarea
              id="newNote"
              bind:value={newNote}
              placeholder="Введите комментарий о клиенте..."
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
            ></textarea>
            <button
              onclick={addNote}
              disabled={isAddingNote || !newNote.trim()}
              class="mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAddingNote ? 'Добавление...' : 'Добавить комментарий'}
            </button>
          </div>
          
          <!-- Список комментариев -->
          {#if notes.length > 0}
            <div class="space-y-4">
              {#each notes as note}
                <div class="border border-gray-200 rounded-lg p-4">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <p class="text-sm text-gray-900 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  </div>
                  <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p class="text-xs text-gray-500">
                      {note.user ? `${note.user.firstName || ''} ${note.user.lastName || ''}`.trim() || note.user.email : 'Система'}
                    </p>
                    <p class="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="text-center py-8 text-gray-500">
              <p>Комментариев пока нет</p>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Боковая панель -->
      <div class="space-y-6">
        <!-- Действия -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
          <div class="space-y-2">
            <button
              onclick={() => goto(`/admin/orders?search=${customer.phone}`)}
              class="w-full btn-outline text-left"
            >
              Просмотреть заказы
            </button>
          </div>
        </div>
        
        <!-- Дополнительная информация -->
        <div class="bg-white rounded-xl shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Дополнительно</h3>
          <div class="space-y-3 text-sm">
            <div>
              <p class="text-gray-600">Дата создания</p>
              <p class="text-gray-900 mt-1">
                {new Date(customer.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
            {#if customer.notes}
              <div>
                <p class="text-gray-600">Примечания</p>
                <p class="text-gray-900 mt-1 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

