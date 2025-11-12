<script>
  // Пропсы компонента (Svelte 5 синтаксис)
  import { createEventDispatcher } from 'svelte';
  import { formatUtils, imageUtils } from '$lib/utils/api.js';
  let {
    part,
    showWarehouse = false,
    compact = false
  } = $props();
  
  // Реактивное состояние
  let isImageLoading = $state(true);
  let imageError = $state(false);
  const dispatch = createEventDispatcher();
  
  // Производные значения
  let hasImage = $derived(part.images && part.images.length > 0 && part.images[0].image_url);
  let imageUrl = $derived(hasImage ? imageUtils.getAbsoluteUrl(part.images[0].image_url) : null);
  let imageAlt = $derived(part.images?.[0]?.alt_text || part.title);
  let brandName = $derived(part.brand?.name || part.brand_name || 'Неизвестный');
  let warehouseName = $derived(part.warehouse?.name || part.warehouse_name || '');
  let isInStock = $derived(part.available > 0);
  let stockStatus = $derived(
    part.available === 0 ? 'Нет в наличии' :
    part.available <= 5 ? 'Мало на складе' :
    'В наличии'
  );
  let stockStatusClass = $derived(
    part.available === 0 ? 'bg-red-100 text-red-800' :
    part.available <= 5 ? 'badge-accent' :
    'badge-success'
  );
  
  // Обработчики
  function handleImageLoad() {
    isImageLoading = false;
  }
  
  function handleImageError() {
    isImageLoading = false;
    imageError = true;
  }
  
  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isInStock) return;
    dispatch('addToCart', { part });
  }
</script>

<article 
  class="card-hover group block {compact ? 'p-4' : 'p-6'} border-2 border-transparent hover:border-primary-200"
  aria-labelledby="part-title-{part.id}"
>
  <a href="/product/{part.id}" aria-label="Перейти к товару {part.title}">
    <!-- Изображение товара -->
    <div class="aspect-square bg-gradient-to-br from-primary-50/30 to-secondary-50 rounded-xl mb-6 flex items-center justify-center overflow-hidden relative">
      {#if hasImage && !imageError}
        <img 
          src={imageUrl} 
          alt="{part.title} от {brandName}"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          width="400"
          height="400"
          onload={handleImageLoad}
          onerror={handleImageError}
        />
        {#if isImageLoading}
          <div class="absolute inset-0 bg-gradient-to-br from-secondary-100 to-secondary-200 animate-pulse rounded-xl"></div>
        {/if}
      {:else}
        <div class="text-center" role="img" aria-label="Изображение товара отсутствует">
          <svg class="text-secondary-400 mx-auto mb-2 {compact ? 'w-12 h-12' : 'w-16 h-16'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-xs text-secondary-500">Изображение</p>
        </div>
      {/if}
      
      <!-- Статус наличия -->
      <div class="absolute top-3 right-3">
        <span class="badge {stockStatusClass}" role="status" aria-label="{stockStatus}">
          {stockStatus}
        </span>
      </div>
    </div>
  </a>
  
  <!-- Информация о товаре -->
  <div class="space-y-4">
    <div>
      <h3 id="part-title-{part.id}" class="font-bold text-secondary-900 line-clamp-2 group-hover:text-primary-600 transition-colors text-lg leading-tight">
        <a href="/product/{part.id}">{part.title}</a>
      </h3>
      
      <div class="flex items-center justify-between mt-2">
        <span class="text-sm font-semibold text-primary-700 bg-gradient-to-r from-primary-50 to-primary-100 px-3 py-1.5 rounded-lg border border-primary-200">
          <span class="sr-only">Производитель:</span>
          {brandName}
        </span>
        {#if showWarehouse && warehouseName}
          <span class="text-xs text-secondary-600 bg-secondary-100 px-2 py-1 rounded-lg border border-secondary-200">
            <span class="sr-only">Склад:</span>
            {warehouseName}
          </span>
        {/if}
      </div>
    </div>
    
    <!-- Номера товара -->
    {#if part.original_number || part.manufacturer_number}
      <div class="space-y-2">
        {#if part.original_number}
          <div class="text-xs text-secondary-600 bg-secondary-50 px-3 py-2 rounded-lg">
            <span class="font-medium text-secondary-700">Оригинал:</span> {part.original_number}
          </div>
        {/if}
        {#if part.manufacturer_number}
          <div class="text-xs text-secondary-600 bg-secondary-50 px-3 py-2 rounded-lg">
            <span class="font-medium text-secondary-700">Производитель:</span> {part.manufacturer_number}
          </div>
        {/if}
      </div>
    {/if}
    
    <!-- Цена и кнопка -->
    <div class="space-y-4">
      <div class="text-center bg-gradient-to-br from-primary-50/50 to-transparent rounded-xl p-3 border border-primary-100">
        <div class="text-2xl font-bold bg-gradient-to-r from-primary-700 to-brand-700 bg-clip-text text-transparent mb-1">
          {part.price_opt ? formatUtils.formatPrice(Number(part.price_opt)) : 'Цена по запросу'}
        </div>
        {#if part.available > 0}
          <div class="text-sm text-secondary-600">
            Остаток: <span class="font-semibold text-primary-700">{part.available} шт.</span>
          </div>
        {/if}
      </div>
      
      <button
        onclick={handleAddToCart}
        disabled={!isInStock}
        aria-label="Добавить {part.title} в корзину"
        aria-disabled={!isInStock}
        class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
      >
        {#if isInStock}
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>В корзину</span>
        {:else}
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Нет в наличии</span>
        {/if}
      </button>
    </div>
  </div>
</article>