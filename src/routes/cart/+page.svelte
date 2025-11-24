<script>
  import { onMount } from 'svelte';
  import { cartUtils, formatUtils, imageUtils } from '$lib/utils/api.js';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { toastStore } from '$lib/stores/toast.js';

  let cart = $state([]);
  let isLoading = $state(false);
  
  const totalItems = $derived(cart.reduce((total, item) => total + item.quantity, 0));
  const totalPrice = $derived(cart.reduce((total, item) => total + (item.price * item.quantity), 0));
  const isEmpty = $derived(cart.length === 0);
  
  const seoData = {
    title: 'Корзина | GoodDrive',
    description: 'Ваша корзина покупок в магазине GoodDrive.',
    type: 'website'
  };

  function loadCart() {
    cart = cartUtils.getCart();
  }
  
  function updateQuantity(itemId, delta) {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      const available = item.available || 0;
      const actualQuantity = Math.min(newQuantity, available);
      
      if (actualQuantity < newQuantity) {
        toastStore.warning(`Недостаточно товара. Доступно: ${available} шт.`);
      }
      
      cart = cartUtils.updateQuantity(itemId, actualQuantity);
    }
  }
  
  function removeItem(itemId) {
    cart = cartUtils.removeFromCart(itemId);
    toastStore.info('Товар удален из корзины');
  }
  
  function clearCart() {
    if (confirm('Вы уверены, что хотите очистить корзину?')) {
      cart = cartUtils.clearCart();
      toastStore.info('Корзина очищена');
    }
  }
  
  function proceedToCheckout() {
    if (isEmpty) return;
    window.location.href = '/checkout';
  }
  
  onMount(() => {
    loadCart();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', loadCart);
    }
  });
  
  $effect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cartUpdated', loadCart);
      }
    };
  });
</script>

<SeoHead data={seoData} />

<div class="container-custom py-8 md:py-12">
  <h1 class="text-3xl font-bold text-gray-900 mb-8">Корзина</h1>

  {#if isEmpty}
    <div class="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
      <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-900 mb-2">Ваша корзина пуста</h2>
      <p class="text-gray-500 mb-8">Но это легко исправить! Загляните в каталог, там много интересного.</p>
      <a href="/catalog" class="btn-primary px-8 py-3 text-base">
        Перейти в каталог
      </a>
    </div>
  {:else}
    <div class="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
      <!-- Cart Items -->
      <div class="space-y-4">
        <div class="flex justify-between items-center mb-2 px-2">
          <span class="text-sm text-gray-500 font-medium">Товаров: {totalItems}</span>
          <button onclick={clearCart} class="text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
            Очистить корзину
          </button>
        </div>

        {#each cart as item (item.id)}
          {@const imageUrl = item.image ? imageUtils.getAbsoluteUrl(item.image) : null}
          <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:gap-6 group hover:border-gray-200 transition-all">
            <!-- Image -->
            <div class="w-24 h-24 bg-gray-50 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center">
              {#if imageUrl}
                <img src={imageUrl} alt={item.title} class="w-full h-full object-cover" />
              {:else}
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              {/if}
            </div>

            <!-- Info -->
            <div class="flex-1 text-center sm:text-left min-w-0 w-full">
              <div class="flex justify-between items-start gap-4">
                <div>
                  <h3 class="font-bold text-gray-900 line-clamp-2 mb-1">
                    <a href="/product/{item.id}" class="hover:text-primary-600 transition-colors">
                      {item.title}
                    </a>
                  </h3>
                  <p class="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded-md font-medium uppercase tracking-wide">
                    {item.brand}
                  </p>
                </div>
                <button onclick={() => removeItem(item.id)} class="text-gray-400 hover:text-red-500 transition-colors p-1">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div class="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
                <!-- Quantity -->
                <div class="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                  <button 
                    onclick={() => updateQuantity(item.id, -1)} 
                    disabled={item.quantity <= 1}
                    class="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span class="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onclick={() => updateQuantity(item.id, 1)}
                    disabled={item.quantity >= (item.available || 0)}
                    class="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                <!-- Price -->
                <div class="text-right">
                  <div class="text-lg font-bold text-gray-900">
                    {formatUtils.formatPrice(item.price * item.quantity)}
                  </div>
                  {#if item.quantity > 1}
                    <div class="text-xs text-gray-500">
                      {formatUtils.formatPrice(item.price)} / шт.
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Summary -->
      <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-fit sticky top-32">
        <h3 class="text-lg font-bold text-gray-900 mb-6">Сумма заказа</h3>
        
        <div class="space-y-3 mb-6 pb-6 border-b border-gray-100">
          <div class="flex justify-between text-sm text-gray-600">
            <span>Товары ({totalItems})</span>
            <span>{formatUtils.formatPrice(totalPrice)}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>Скидка</span>
            <span class="text-green-600 font-medium">0 ₽</span>
          </div>
        </div>
        
        <div class="flex justify-between items-end mb-8">
          <span class="text-lg font-bold text-gray-900">Итого</span>
          <span class="text-2xl font-bold text-gray-900">{formatUtils.formatPrice(totalPrice)}</span>
        </div>
        
        <button 
          onclick={proceedToCheckout} 
          class="w-full btn-primary py-3.5 text-base font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
        >
          Перейти к оформлению
        </button>
        
        <p class="text-xs text-gray-400 text-center mt-4">
          Нажимая кнопку, вы соглашаетесь с условиями обработки данных
        </p>
      </div>
    </div>
  {/if}
</div>
