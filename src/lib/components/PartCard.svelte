<script>
  // Пропсы компонента (Svelte 5 синтаксис)
  import { createEventDispatcher } from 'svelte';
  import { formatUtils, imageUtils } from '$lib/utils/api.js';
  let {
    part,
    showWarehouse = false,
    compact = false,
    isPopular = false // Флаг популярности товара (топ 100)
  } = $props();
  
  // Реактивное состояние
  let isImageLoading = $state(true);
  let imageError = $state(false);
  const dispatch = createEventDispatcher();
  
  function normalizeImageEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      return trimmed ? { rawUrl: trimmed, alt: null } : null;
    }
    if (typeof entry !== 'object') {
      return null;
    }
    const rawUrl = entry.image_url || entry.imageUrl || entry.url || entry.image || entry.path;
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
      return null;
    }
    return {
      rawUrl: rawUrl.trim(),
      alt: entry.alt_text || entry.altText || entry.description || null,
      entry
    };
  }

  function getImageCandidates(part) {
    if (!part) return [];
    const candidates = [];

    // Приоритет: main image, первое изображение из массива, любые дополнительные поля
    if (part.main_image) candidates.push(part.main_image);
    if (part.mainImage) candidates.push(part.mainImage);
    if (Array.isArray(part.images)) {
      candidates.push(...part.images);
    }
    if (part.image) candidates.push({ image: part.image, alt_text: part.title });
    if (part.image_url) candidates.push({ image_url: part.image_url, alt_text: part.title });
    if (part.preview_image) candidates.push(part.preview_image);

    return candidates;
  }

  const firstImageData = $derived.by(() => {
    const candidates = getImageCandidates(part);
    for (const candidate of candidates) {
      const normalized = normalizeImageEntry(candidate);
      if (normalized) {
        return normalized;
      }
    }

    if (part?.id) {
      console.warn('PartCard: no valid images found', {
        partId: part.id,
        partTitle: part.title,
        images: part?.images,
        rawCandidates: candidates
      });
    }

    return null;
  });

  let hasImage = $derived(!!firstImageData?.rawUrl);

  let imageUrl = $derived.by(() => {
    if (!firstImageData?.rawUrl) {
      return null;
    }
    if (firstImageData.rawUrl.startsWith('data:')) {
      return firstImageData.rawUrl;
    }
    return imageUtils.getAbsoluteUrl(firstImageData.rawUrl);
  });
  
  let imageAlt = $derived(firstImageData?.alt || part.title);
  let brandName = $derived(part.brand?.name || part.brand_name || 'Неизвестный');
  let warehouseName = $derived(part.warehouse?.name || part.warehouse_name || '');
  let isInStock = $derived((Number(part.available) || 0) > 0);
  // Убираем статус "Мало на складе" - показываем только "Нет в наличии" или ничего
  let stockStatus = $derived(
    (Number(part.available) || 0) === 0 ? 'Нет в наличии' : null
  );
  let stockStatusClass = $derived(
    (Number(part.available) || 0) === 0 ? 'bg-red-100 text-red-800' : ''
  );
  
  // Обработчики
  function handleImageLoad() {
    isImageLoading = false;
    console.log('PartCard: Image loaded successfully', {
      partId: part.id,
      imageUrl: imageUrl?.substring(0, 50) + '...'
    });
  }
  
  function handleImageError() {
    isImageLoading = false;
    imageError = true;
    console.error('PartCard: Image load error', {
      partId: part.id,
      partTitle: part.title,
      hasImage,
      imageUrl: imageUrl?.substring(0, 100),
      images: part.images,
      firstImage: part.images?.[0]
    });
  }
  
  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isInStock) return;
    dispatch('addToCart', { part });
  }
</script>

<article 
  class="group block p-2 border border-gray-200 hover:border-primary-400 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all flex flex-col"
  aria-labelledby="part-title-{part.id}"
  style="height: 100%;"
>
  <!-- Изображение товара (ссылка) -->
  <a href="/product/{part.id}" aria-label="Перейти к товару {part.title}" class="block mb-2 flex-shrink-0">
    <div class="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-md flex items-center justify-center overflow-hidden relative w-full">
      {#if hasImage && !imageError && imageUrl}
        {@const imgSrc = String(imageUrl || '')}
        {#if imgSrc && imgSrc.trim() !== ''}
          <img 
            src={imgSrc} 
            alt={imageAlt || part.title || 'Изображение товара'}
            class="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            width="200"
            height="200"
            crossorigin="anonymous"
            style="max-width: 100%; max-height: 100%;"
            onload={handleImageLoad}
            onerror={(e) => {
              console.error('Image load error in PartCard:', {
                partId: part.id,
                partTitle: part.title,
                imageUrl: imgSrc.substring(0, 100),
                hasImage,
                imageError,
                images: part.images,
                firstImage: part.images?.[0]
              });
              handleImageError();
            }}
          />
        {:else}
          <div class="text-center flex flex-col items-center justify-center h-full w-full" role="img" aria-label="URL изображения отсутствует">
            <svg class="text-gray-300 w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-[9px] text-gray-400">URL отсутствует</p>
          </div>
        {/if}
      {:else if !hasImage}
        <div class="text-center flex flex-col items-center justify-center h-full w-full" role="img" aria-label="Изображение товара отсутствует">
          <svg class="text-gray-300 w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-[9px] text-gray-400">Нет изображения</p>
        </div>
        {#if isImageLoading}
          <div class="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse rounded-md"></div>
        {/if}
      {:else}
        <div class="text-center flex flex-col items-center justify-center h-full w-full" role="img" aria-label="Изображение товара отсутствует">
          <svg class="text-gray-300 w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-[9px] text-gray-400">Изображение</p>
        </div>
      {/if}
      
      <!-- Бейджи: Хит продаж (если товар в топе) и статус наличия (только если нет в наличии) -->
      <div class="absolute top-1 right-1 flex flex-col gap-0.5 items-end z-10">
        <!-- Хит продаж - только для топ 100 товаров -->
        {#if isPopular}
          <span class="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm font-bold px-1.5 py-0.5 text-[9px] uppercase leading-tight rounded" role="status" aria-label="Хит продаж">
            ★ ХИТ
          </span>
        {/if}
        
        <!-- Статус наличия - только если товар отсутствует -->
        {#if stockStatus}
          <span class="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded leading-tight" role="status" aria-label="{stockStatus}">
            {stockStatus}
          </span>
        {/if}
      </div>
    </div>
  </a>
  
  <!-- Информация о товаре (вне ссылки для работы кнопки) -->
  <div class="flex flex-col flex-grow space-y-1 mt-2 min-h-0">
    <!-- Бренд - фиксированная высота -->
    <div class="flex items-center gap-1 h-4">
      <span class="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-tight truncate max-w-full">
        {brandName}
      </span>
    </div>
    
    <!-- Название товара - до 4 строк -->
    <h3 id="part-title-{part.id}" class="font-medium text-gray-900 line-clamp-4 group-hover:text-primary-600 transition-colors text-[11px] leading-[1.3] min-h-[3.5rem] overflow-hidden">
      <a href="/product/{part.id}" class="block">{part.title || 'Без названия'}</a>
    </h3>
    
    <!-- Номера товара - фиксированная высота, всегда показываем -->
    <div class="space-y-0.5 min-h-[1.75rem] flex flex-col justify-start">
      {#if part.original_number}
        <div class="text-[9px] text-gray-500 leading-tight truncate">
          <span class="font-medium">Оригинал:</span> {part.original_number}
        </div>
      {:else}
        <div class="text-[9px] text-gray-400 leading-tight h-3.5"></div>
      {/if}
      {#if part.manufacturer_number && part.manufacturer_number !== part.original_number}
        <div class="text-[9px] text-gray-500 leading-tight truncate">
          <span class="font-medium">Производитель:</span> {part.manufacturer_number}
        </div>
      {:else}
        <div class="text-[9px] text-gray-400 leading-tight h-3.5"></div>
      {/if}
    </div>
    
    <!-- Цена - фиксированная высота -->
    <div class="mt-auto">
      <div class="text-base font-bold text-gray-900 leading-tight h-5 flex items-center">
        {part.price_opt ? formatUtils.formatPrice(Number(part.price_opt)) : 'Цена по запросу'}
      </div>
      <div class="text-[10px] text-gray-500 mt-0.5 h-3.5 flex items-center">
        {#if part.available > 0}
          Остаток: <span class="font-semibold">{part.available} шт.</span>
        {:else}
          <span class="text-gray-400">Нет в наличии</span>
        {/if}
      </div>
    </div>
    
    <!-- Кнопка - фиксированная высота -->
    <button
      onclick={handleAddToCart}
      disabled={!isInStock}
      aria-label="Добавить {part.title} в корзину"
      aria-disabled={!isInStock}
      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium py-1.5 px-2 rounded-md transition-colors mt-1.5 flex items-center justify-center gap-1 h-7 flex-shrink-0"
    >
      {#if isInStock}
        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span class="truncate">В корзину</span>
      {:else}
        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="truncate">Нет в наличии</span>
      {/if}
    </button>
  </div>
</article>