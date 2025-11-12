<script>
  import { onMount } from 'svelte';
  import { cartUtils, formatUtils } from '$lib/utils/api.js';
  
  // Реактивное состояние
  let cart = $state([]);
  let isLoading = $state(false);
  
  // Производные значения
  const totalItems = $derived(cart.reduce((total, item) => total + item.quantity, 0));
  const totalPrice = $derived(cart.reduce((total, item) => total + (item.price * item.quantity), 0));
  const isEmpty = $derived(cart.length === 0);
  
  // Загрузка корзины
  function loadCart() {
    cart = cartUtils.getCart();
  }
  
  // Обновление количества товара
  function updateQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      cart = cartUtils.updateQuantity(itemId, newQuantity);
    }
  }
  
  // Удаление товара
  function removeItem(itemId) {
    cart = cartUtils.removeFromCart(itemId);
  }
  
  // Очистка корзины
  function clearCart() {
    if (confirm('Вы уверены, что хотите очистить корзину?')) {
      cart = cartUtils.clearCart();
    }
  }
  
  // Переход к оформлению заказа
  function proceedToCheckout() {
    if (isEmpty) return;
    window.location.href = '/checkout';
  }
  
  // Инициализация
  onMount(() => {
    loadCart();
  });
</script>

<div class="container-custom py-8">
  <div class="max-w-4xl mx-auto">
    <!-- Заголовок -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Корзина</h1>
      <p class="text-neutral-600">
        {#if isEmpty}
          Ваша корзина пуста
        {:else}
          Товаров в корзине: {totalItems}
        {/if}
      </p>
    </div>
    
    {#if isEmpty}
      <!-- Пустая корзина -->
      <div class="text-center py-16">
        <svg class="w-24 h-24 text-neutral-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 class="text-2xl font-bold text-neutral-900 mb-4">Корзина пуста</h2>
        <p class="text-neutral-600 mb-8">Добавьте товары в корзину, чтобы продолжить покупки</p>
        <a href="/catalog" class="btn-primary">
          Перейти в каталог
        </a>
      </div>
    {:else}
      <!-- Содержимое корзины -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Список товаров -->
        <div class="lg:col-span-2">
          <div class="card p-6">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-neutral-900">Товары в корзине</h2>
              <button
                onclick={clearCart}
                class="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Очистить корзину
              </button>
            </div>
            
            <div class="space-y-4">
              {#each cart as item}
                <div class="flex items-center space-x-4 p-4 border border-neutral-200 rounded-lg">
                  <!-- Изображение товара -->
                  <div class="w-20 h-20 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {#if item.image}
                      <img 
                        src={item.image} 
                        alt={item.title}
                        class="w-full h-full object-cover rounded-lg"
                      />
                    {:else}
                      <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    {/if}
                  </div>
                  
                  <!-- Информация о товаре -->
                  <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-neutral-900 truncate">{item.title}</h3>
                    <p class="text-sm text-neutral-600">{item.brand}</p>
                    <p class="text-lg font-bold text-primary-500">
                      {formatUtils.formatPrice(item.price)}
                    </p>
                  </div>
                  
                  <!-- Управление количеством -->
                  <div class="flex items-center space-x-2">
                    <button
                      onclick={() => updateQuantity(item.id, item.quantity - 1)}
                      class="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                      </svg>
                    </button>
                    
                    <span class="w-12 text-center font-medium">{item.quantity}</span>
                    
                    <button
                      onclick={() => updateQuantity(item.id, item.quantity + 1)}
                      class="w-8 h-8 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-50"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                  
                  <!-- Общая цена -->
                  <div class="text-right">
                    <p class="text-lg font-bold text-neutral-900">
                      {formatUtils.formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                  
                  <!-- Кнопка удаления -->
                  <button
                    onclick={() => removeItem(item.id)}
                    class="text-neutral-400 hover:text-red-600 p-1"
                    title="Удалить товар"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>
        
        <!-- Итоговая информация -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="text-xl font-semibold text-neutral-900 mb-6">Итого</h2>
            
            <div class="space-y-4 mb-6">
              <div class="flex justify-between">
                <span class="text-neutral-600">Товары ({totalItems} шт.)</span>
                <span class="font-medium">{formatUtils.formatPrice(totalPrice)}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-neutral-600">Доставка</span>
                <span class="font-medium text-green-600">Бесплатно</span>
              </div>
              
              <div class="border-t border-neutral-200 pt-4">
                <div class="flex justify-between">
                  <span class="text-lg font-semibold text-neutral-900">Общая сумма</span>
                  <span class="text-lg font-bold text-primary-500">{formatUtils.formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
            
            <button
              onclick={proceedToCheckout}
              disabled={isLoading}
              class="btn-primary w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Обработка...' : 'Оформить заказ'}
            </button>
            
            <a href="/catalog" class="btn-outline w-full text-center">
              Продолжить покупки
            </a>
            
            <!-- Дополнительная информация -->
            <div class="mt-6 text-sm text-neutral-600 space-y-2">
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Гарантия качества
              </div>
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Быстрая доставка
              </div>
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Возврат в течение 14 дней
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>