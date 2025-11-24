<script>
  import { ordersApi, formatUtils } from '$lib/utils/api.js';
  import { getStatusLabel } from '$lib/utils/status-labels.js';
  
  let { order, isOpen, onClose, onUpdate } = $props();
  
  let isUpdating = $state(false);
  let statusComment = $state('');
  let selectedStatus = $state(order?.status || 'new');
  let orderDetails = $state(null);
  let isLoadingDetails = $state(false);
  
  const statusOptions = [
    { value: 'new', label: 'Новый заказ', color: 'orange' },
    { value: 'processing', label: 'В обработке', color: 'indigo' },
    { value: 'shipped', label: 'Отправлен', color: 'purple' },
    { value: 'completed', label: 'Завершён', color: 'green' },
    { value: 'canceled', label: 'Отменён', color: 'red' }
  ];
  
  // Загрузка полной информации о заказе
  async function loadOrderDetails() {
    if (!order) return;
    
    try {
      isLoadingDetails = true;
      const response = await ordersApi.getOrder(order.id);
      orderDetails = response.data || response; // Поддержка обоих форматов
      selectedStatus = orderDetails.status;
    } catch (error) {
      console.error('Ошибка загрузки деталей заказа:', error);
    } finally {
      isLoadingDetails = false;
    }
  }
  
  // Изменение статуса
  async function handleStatusChange() {
    if (!orderDetails || selectedStatus === orderDetails.status) return;
    
    try {
      isUpdating = true;
      await ordersApi.updateOrderStatus(orderDetails.id, selectedStatus, statusComment);
      
      // Перезагружаем детали
      await loadOrderDetails();
      statusComment = '';
      
      // Уведомляем родителя
      if (onUpdate) onUpdate();
      
      alert('Статус успешно изменён');
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Ошибка изменения статуса');
    } finally {
      isUpdating = false;
    }
  }

  // Удаление заказа
  async function handleDeleteOrder() {
    if (!orderDetails) return;

    const confirmed = confirm('Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.');
    if (!confirmed) return;

    try {
      isUpdating = true;
      await ordersApi.deleteOrder(orderDetails.id);

      if (onUpdate) onUpdate();
      alert('Заказ успешно удалён');
      handleClose();
    } catch (error) {
      console.error('Ошибка удаления заказа:', error);
      alert('Ошибка удаления заказа');
    } finally {
      isUpdating = false;
    }
  }
  
  // Закрытие модалки
  function handleClose() {
    if (onClose) onClose();
  }
  
  // Загрузка при открытии
  $effect(() => {
    if (isOpen && order) {
      loadOrderDetails();
    }
  });
</script>

{#if isOpen}
  <!-- Overlay -->
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Modal -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-gray-100"
      onclick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Содержимое модального окна"
      tabindex="0"
    >
      {#if isLoadingDetails}
        <!-- Загрузка -->
        <div class="p-12 text-center flex-1 flex flex-col items-center justify-center">
          <div class="animate-spin w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"></div>
          <p class="text-gray-500 font-medium">Загрузка деталей заказа...</p>
        </div>
      {:else if orderDetails}
        <!-- Заголовок -->
        <div class="p-6 border-b border-gray-100 bg-white flex-shrink-0">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold text-gray-900">Заказ #{orderDetails.orderNumber}</h2>
                <span class="px-3 py-1 rounded-full text-sm font-bold {
                  orderDetails.status === 'new' ? 'bg-orange-100 text-orange-700' :
                  orderDetails.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                  orderDetails.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                  orderDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }">
                  {getStatusLabel(orderDetails.status)}
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-1 font-medium">
                Создан: {new Date(orderDetails.createdAt).toLocaleString('ru-RU')}
              </p>
            </div>
            <button 
              onclick={handleClose}
              aria-label="Закрыть"
              class="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-500"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Кнопки действий -->
          <div class="flex flex-wrap gap-3">
            <a 
              href={`/api/orders/${orderDetails.id}/invoice`}
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Накладная
            </a>
            <a 
              href={`/api/orders/${orderDetails.id}/receipt`}
              target="_blank"
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Чек
            </a>
            <button
              onclick={handleDeleteOrder}
              class="inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
              disabled={isUpdating}
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить заказ
            </button>
          </div>
        </div>
        
        <!-- Контент (скроллируемый) -->
        <div class="p-6 overflow-y-auto flex-1 bg-white space-y-8">
          <!-- Информация о клиенте -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Контактная информация</h3>
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-400 mb-1">Имя клиента</p>
                  <p class="text-sm font-bold text-gray-900">{orderDetails.customerName}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Телефон</p>
                  <a href="tel:{orderDetails.customerPhone}" class="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    {orderDetails.customerPhone}
                  </a>
                </div>
                {#if orderDetails.customerEmail}
                  <div>
                    <p class="text-xs text-gray-400 mb-1">Email</p>
                    <a href="mailto:{orderDetails.customerEmail}" class="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                      {orderDetails.customerEmail}
                    </a>
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Адрес доставки</h3>
              <div class="space-y-3">
                <div>
                  <p class="text-xs text-gray-400 mb-1">Город</p>
                  <p class="text-sm font-bold text-gray-900">{orderDetails.deliveryCity || 'Не указан'}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Адрес</p>
                  <p class="text-sm font-medium text-gray-900">{orderDetails.deliveryAddress || 'Не указан'}</p>
                </div>
                {#if orderDetails.deliveryPostalCode}
                  <div>
                    <p class="text-xs text-gray-400 mb-1">Индекс</p>
                    <p class="text-sm font-mono text-gray-900">{orderDetails.deliveryPostalCode}</p>
                  </div>
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Товары -->
          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4">Состав заказа</h3>
            <div class="border border-gray-100 rounded-2xl overflow-hidden">
              <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th class="px-4 py-3 font-medium text-gray-500">Товар</th>
                    <th class="px-4 py-3 font-medium text-gray-500 text-right">Кол-во</th>
                    <th class="px-4 py-3 font-medium text-gray-500 text-right">Цена</th>
                    <th class="px-4 py-3 font-medium text-gray-500 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  {#each orderDetails.items as item}
                    <tr>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                          {#if item.part?.images?.[0]?.imageUrl}
                            <img 
                              src={item.part.images[0].imageUrl} 
                              alt="" 
                              class="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200"
                            />
                          {:else}
                            <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            </div>
                          {/if}
                          <div>
                            <p class="font-medium text-gray-900 line-clamp-1">{item.partTitle}</p>
                            <p class="text-xs text-gray-500">{item.part?.brand || 'Бренд'} <span class="text-gray-300 mx-1">|</span> <span class="font-mono">{item.part?.originalNumber || item.part?.manufacturerNumber || '-'}</span></p>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-right text-gray-900 font-medium">{item.quantity} шт.</td>
                      <td class="px-4 py-3 text-right text-gray-500">{formatUtils.formatPrice(Number(item.price))}</td>
                      <td class="px-4 py-3 text-right text-gray-900 font-bold">{formatUtils.formatPrice(Number(item.subtotal))}</td>
                    </tr>
                  {/each}
                </tbody>
                <tfoot class="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <td colspan="3" class="px-4 py-3 text-right font-bold text-gray-900">Итого:</td>
                    <td class="px-4 py-3 text-right font-bold text-xl text-gray-900">{formatUtils.formatPrice(Number(orderDetails.totalAmount))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <!-- Управление статусом -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white border border-gray-200 rounded-2xl p-5">
              <h3 class="text-sm font-bold text-gray-900 mb-4">Изменить статус</h3>
              <div class="space-y-4">
                <div>
                  <label for="status" class="block text-xs font-medium text-gray-500 mb-1">Новый статус</label>
                  <select
                    id="status"
                    bind:value={selectedStatus}
                    class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-2.5 text-sm transition-all shadow-inner cursor-pointer"
                  >
                    {#each statusOptions as option}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
                
                <div>
                  <label for="comment" class="block text-xs font-medium text-gray-500 mb-1">Комментарий к смене статуса</label>
                  <input
                    type="text"
                    id="comment"
                    bind:value={statusComment}
                    class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-2.5 text-sm transition-all shadow-inner"
                    placeholder="Причина или заметка..."
                  />
                </div>
                
                <button
                  onclick={handleStatusChange}
                  disabled={isUpdating || selectedStatus === orderDetails.status}
                  class="w-full btn-primary py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isUpdating ? 'Обновление...' : 'Сохранить новый статус'}
                </button>
              </div>
            </div>
            
            <!-- История -->
            <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <h3 class="text-sm font-bold text-gray-900 mb-4">История изменений</h3>
              {#if orderDetails.statusHistory && orderDetails.statusHistory.length > 0}
                <div class="relative pl-4 border-l-2 border-gray-200 space-y-6">
                  {#each orderDetails.statusHistory as history}
                    <div class="relative">
                      <div class="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div>
                      <p class="text-sm font-bold text-gray-900">
                        {getStatusLabel(history.status)}
                      </p>
                      {#if history.comment}
                        <p class="text-xs text-gray-600 mt-0.5 bg-white px-2 py-1 rounded border border-gray-200 inline-block">{history.comment}</p>
                      {/if}
                      <p class="text-xs text-gray-400 mt-1">
                        {new Date(history.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  {/each}
                </div>
              {:else}
                <p class="text-sm text-gray-500 italic">История пуста</p>
              {/if}
            </div>
          </div>
          
          <!-- Комментарий клиента -->
          {#if orderDetails.notes}
            <div class="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
              <h3 class="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
                Комментарий клиента
              </h3>
              <p class="text-sm text-yellow-900 italic">{orderDetails.notes}</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
