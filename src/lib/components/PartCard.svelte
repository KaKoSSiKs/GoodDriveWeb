<script>
  import { createEventDispatcher } from 'svelte';
  import { formatUtils, imageUtils } from '$lib/utils/api.js';
  let {
    part,
    showWarehouse = false,
    compact = false,
    isPopular = false
  } = $props();
  
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
    // Проверяем все возможные поля для URL изображения
    const rawUrl = entry.image_url || entry.imageUrl || entry.url || entry.image || entry.path;
    // Если URL пустой, null или не строка - возвращаем null
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '' || rawUrl === 'null' || rawUrl === 'undefined') {
      return null;
    }
    const trimmedUrl = rawUrl.trim();
    // Проверяем, что это не пустая строка после trim
    if (!trimmedUrl) {
      return null;
    }
    return {
      rawUrl: trimmedUrl,
      alt: entry.alt_text || entry.altText || entry.description || null,
      entry
    };
  }

  function getImageCandidates(part) {
    if (!part) return [];
    const candidates = [];
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
    return null;
  });

  let hasImage = $derived(!!firstImageData?.rawUrl);

  let imageUrl = $derived.by(() => {
    if (!firstImageData?.rawUrl) {
      return null;
    }
    const rawUrl = firstImageData.rawUrl.trim();
    if (!rawUrl) {
      return null;
    }
    if (rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const absoluteUrl = imageUtils.getAbsoluteUrl(rawUrl);
    return absoluteUrl && absoluteUrl.trim() ? absoluteUrl : null;
  });
  
  let shouldShowPlaceholder = $derived(!hasImage || !imageUrl || imageError);
  
  let imageAlt = $derived(firstImageData?.alt || part.title);
  let brandName = $derived(part.brand?.name || part.brand_name || 'Неизвестный');
  let isInStock = $derived((Number(part.available) || 0) > 0);
  let stockStatus = $derived(
    (Number(part.available) || 0) === 0 ? 'Нет в наличии' : null
  );
  
  function handleImageLoad() {
    isImageLoading = false;
    imageError = false;
  }
  
  function handleImageError() {
    isImageLoading = false;
    imageError = true;
    console.warn('Failed to load image:', imageUrl);
  }
  
  // Сбрасываем состояние при изменении part
  $effect(() => {
    if (part) {
      isImageLoading = true;
      imageError = false;
    }
  });
  
  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!isInStock) return;
    dispatch('addToCart', { part });
  }
</script>

<article 
  class="group relative bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden"
  aria-labelledby="part-title-{part.id}"
>
  <!-- Image Area -->
  <a href="/product/{part.id}" class="block relative aspect-square overflow-hidden bg-gray-50 group-hover:bg-gray-100 transition-colors">
    {#if !shouldShowPlaceholder}
      <img 
        src={imageUrl} 
        alt={imageAlt}
        class="w-full h-full object-cover p-4 transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
        onload={handleImageLoad}
        onerror={handleImageError}
      />
    {:else}
      <img 
        src={imageUtils.getAbsoluteUrl('/images/parts/placeholder.svg')} 
        alt="Нет изображения"
        class="w-full h-full object-contain p-8 opacity-50"
      />
    {/if}
    
    <!-- Badges -->
    <div class="absolute top-3 left-3 flex flex-col gap-2">
      {#if isPopular}
        <span class="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase tracking-wider">
          Hit
        </span>
      {/if}
      {#if !isInStock}
        <span class="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase tracking-wider">
          Sold Out
        </span>
      {/if}
    </div>
  </a>
  
  <!-- Content Area -->
  <div class="px-4 py-4 sm:p-5 flex flex-col flex-grow">
    <!-- Brand & Meta -->
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <span class="text-[11px] sm:text-xs font-bold text-gray-900 uppercase tracking-wide bg-gray-100 px-2 py-1 rounded-md max-w-full truncate">
        {brandName}
      </span>
      {#if isInStock}
        <span class="flex items-center text-[11px] sm:text-xs font-medium text-green-600 whitespace-nowrap">
          <span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
          В наличии
        </span>
      {/if}
    </div>
    
    <!-- Title -->
    <h3 class="font-medium text-gray-900 mb-1 line-clamp-2 min-h-[2.75rem] group-hover:text-gray-600 transition-colors text-sm sm:text-base leading-snug break-words">
      <a href="/product/{part.id}">
        {part.title || 'Запчасть без названия'}
      </a>
    </h3>
    
    <!-- Part Numbers -->
    <div class="text-xs text-gray-500 mb-4 space-y-0.5 font-mono break-all">
      {#if part.original_number}
        <p class="truncate opacity-80">OEM: {part.original_number}</p>
      {/if}
    </div>
    
    <!-- Footer: Price & Action -->
    <div class="mt-auto flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs text-gray-500 mb-0.5">Цена</p>
        <p class="text-xl font-bold text-gray-900 leading-none">
          {part.price_opt ? formatUtils.formatPrice(Number(part.price_opt)) : 'По запросу'}
        </p>
      </div>
      
      <button
        onclick={handleAddToCart}
        disabled={!isInStock}
        class="w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm
          {isInStock 
            ? 'bg-gray-900 text-white hover:bg-black hover:scale-110 hover:shadow-lg' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
        aria-label="В корзину"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </button>
    </div>
  </div>
</article>
