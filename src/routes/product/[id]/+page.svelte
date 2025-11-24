<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { partsApi, cartUtils, formatUtils, imageUtils } from '$lib/utils/api.js';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import PartCard from '$lib/components/PartCard.svelte';
  import { toastStore } from '$lib/stores/toast.js';

  let part = $state(null);
  let similarParts = $state([]);
  let loading = $state(true);
  let selectedImageIndex = $state(0);
  let quantity = $state(1);
  let isAddingToCart = $state(false);

  const productId = $derived($page.params.id);
  const hasImages = $derived(part?.images?.length > 0);
  const currentImage = $derived(part?.images?.[selectedImageIndex]);
  const currentImageUrl = $derived.by(() => {
    if (!currentImage) return null;
    const url = currentImage.image_url || currentImage.imageUrl || currentImage.url;
    return url ? imageUtils.getAbsoluteUrl(url) : null;
  });
  const brandName = $derived(part?.brand?.name || 'Неизвестный');
  const brandCountry = $derived(part?.brand?.country || '');
  const warehouseName = $derived(part?.warehouse?.name || '');
  const isInStock = $derived(part?.available > 0);
  
  let cartItems = $state(cartUtils.getCart());
  
  const cartQuantity = $derived(() => {
    if (!part) return 0;
    const cartItem = cartItems.find(item => item.id === part.id);
    return cartItem ? cartItem.quantity : 0;
  });
  
  const maxQuantity = $derived(() => {
    if (!part) return 0;
    const available = part.available || 0;
    const inCart = cartQuantity();
    return Math.max(0, Math.min(available - inCart, 99));
  });
  
  function updateCart() {
    cartItems = cartUtils.getCart();
  }
  
  const price = $derived(parseFloat(part?.price_opt) || 0);
  const totalPrice = $derived(price * quantity);

  const seoData = $derived({
    title: part?.title ? `${part.title} - ${brandName} | GoodDrive` : 'Загрузка...',
    description: part?.description || `Автозапчасть ${part?.title || ''} от ${brandName}. Наличие: ${part?.available || 0} шт. Быстрая доставка по России.`,
    keywords: part ? `${part.title}, ${brandName}, автозапчасти, ${part.original_number || ''}` : '',
    type: 'product'
  });

  async function loadPart() {
    if (!productId) return;

    loading = true;
    try {
      part = await partsApi.getPart(productId);
      quantity = 1;
      selectedImageIndex = 0;
    } catch (error) {
      console.error('Ошибка загрузки товара:', error);
      goto('/catalog');
    } finally {
      loading = false;
    }
  }

  async function loadSimilarParts() {
    if (!part) return;

    try {
      const response = await partsApi.getParts({ 
        brand: part.brand?.id,
        page_size: 4 
      });
      similarParts = (response.results || []).filter(p => p.id !== part.id).slice(0, 4);
    } catch (error) {
      console.error('Ошибка загрузки похожих товаров:', error);
    }
  }

  function handleAddToCart() {
    if (!part || !isInStock || isAddingToCart || maxQuantity() <= 0) return;

    isAddingToCart = true;
    cartUtils.addToCart(part, quantity);
    updateCart();
    
    toastStore.success('Товар добавлен в корзину');
    
    setTimeout(() => {
      isAddingToCart = false;
    }, 500);
  }

  function updateQuantity(delta) {
    const newQuantity = quantity + delta;
    const maxQty = maxQuantity();
    if (newQuantity >= 1 && newQuantity <= maxQty) {
      quantity = newQuantity;
    } else if (newQuantity > maxQty) {
      quantity = maxQty;
    }
  }

  function selectImage(index) {
    selectedImageIndex = index;
  }

  onMount(() => {
    loadPart();
    updateCart();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', updateCart);
    }
  });
  
  $effect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('cartUpdated', updateCart);
      }
    };
  });

  $effect(() => {
    if (part) {
      loadSimilarParts();
    }
  });
</script>

<SeoHead data={seoData} />

<div class="container-custom py-8 md:py-12">
  <!-- Breadcrumbs -->
  <nav class="flex items-center gap-2 text-sm text-gray-500 mb-8">
    <a href="/" class="hover:text-gray-900 transition-colors">Главная</a>
    <span class="text-gray-300">/</span>
    <a href="/catalog" class="hover:text-gray-900 transition-colors">Каталог</a>
    <span class="text-gray-300">/</span>
    <span class="text-gray-900 font-medium truncate max-w-[200px]">{part?.title || 'Товар'}</span>
  </nav>

  {#if loading}
    <div class="grid lg:grid-cols-2 gap-12">
      <div class="aspect-square bg-gray-100 rounded-3xl animate-pulse"></div>
      <div class="space-y-6">
        <div class="h-8 bg-gray-100 rounded-lg w-3/4 animate-pulse"></div>
        <div class="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div>
        <div class="h-20 bg-gray-100 rounded-xl animate-pulse"></div>
      </div>
    </div>
  {:else if !part}
    <div class="text-center py-20">
      <h2 class="text-2xl font-bold text-gray-900">Товар не найден</h2>
      <a href="/catalog" class="btn-primary mt-4">Вернуться в каталог</a>
    </div>
  {:else}
    <div class="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-start">
      <!-- Gallery Section -->
      <div class="space-y-6">
        <div class="aspect-square bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden relative group">
          {#if hasImages && currentImageUrl}
            <img
              src={currentImageUrl}
              alt={currentImage?.alt_text || part.title}
              class="w-full h-full object-contain p-8 transition-transform duration-500 group-hover:scale-105"
            />
          {:else}
            <div class="flex flex-col items-center text-gray-300">
              <svg class="w-20 h-20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="text-sm">Нет фото</span>
            </div>
          {/if}
          
          <!-- Stock Badge -->
          {#if !isInStock}
            <div class="absolute top-6 right-6 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Нет в наличии
            </div>
          {/if}
        </div>

        {#if hasImages && part.images.length > 1}
          <div class="flex gap-4 overflow-x-auto pb-2 snap-x">
            {#each part.images as image, index}
              {@const thumbUrl = imageUtils.getAbsoluteUrl(image.image_url || image.imageUrl || image.url)}
              {#if thumbUrl}
                <button
                  onclick={() => selectImage(index)}
                  class="w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden transition-all {selectedImageIndex === index ? 'border-gray-900 ring-2 ring-gray-100' : 'border-gray-100 hover:border-gray-300'}"
                >
                  <img
                    src={thumbUrl}
                    alt=""
                    class="w-full h-full object-cover"
                  />
                </button>
              {/if}
            {/each}
          </div>
        {/if}
      </div>

      <!-- Info Section -->
      <div class="space-y-8">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full">
              {brandName}
            </span>
            {#if brandCountry}
              <span class="text-xs text-gray-500 flex items-center gap-1">
                <span class="w-1 h-1 rounded-full bg-gray-300"></span>
                {brandCountry}
              </span>
            {/if}
          </div>
          
          <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            {part.title}
          </h1>
          
          <!-- Part Numbers -->
          <div class="flex flex-wrap gap-4 text-sm text-gray-500 font-mono">
            {#if part.original_number}
              <div class="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                OEM: <span class="text-gray-900 font-medium">{part.original_number}</span>
              </div>
            {/if}
            {#if part.manufacturer_number}
              <div class="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                MPN: <span class="text-gray-900 font-medium">{part.manufacturer_number}</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Price & Cart -->
        <div class="bg-gray-50 rounded-3xl p-6 lg:p-8 border border-gray-100">
          <div class="flex items-end gap-4 mb-6">
            <div class="text-4xl font-bold text-gray-900">
              {formatUtils.formatPrice(price)}
            </div>
            <div class="text-sm text-gray-500 mb-2">
              / шт.
            </div>
          </div>

          {#if isInStock}
            <div class="space-y-6">
              <!-- Quantity Control -->
              <div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                <span class="text-sm font-medium text-gray-700">Количество</span>
                <div class="flex items-center gap-4">
                  <button onclick={() => updateQuantity(-1)} disabled={quantity <= 1} class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                  </button>
                  <span class="text-lg font-bold w-8 text-center">{quantity}</span>
                  <button onclick={() => updateQuantity(1)} disabled={quantity >= maxQuantity()} class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  </button>
                </div>
              </div>

              <!-- Add to Cart -->
              <button
                onclick={handleAddToCart}
                disabled={isAddingToCart}
                class="w-full btn-primary py-4 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
              >
                {#if isAddingToCart}
                  Добавлено ✓
                {:else}
                  Добавить в корзину — {formatUtils.formatPrice(totalPrice)}
                {/if}
              </button>
              
              <div class="flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                В наличии на складе {warehouseName} ({part.available} шт.)
              </div>
            </div>
          {:else}
            <button disabled class="w-full btn bg-gray-200 text-gray-500 cursor-not-allowed py-4 text-lg font-bold">
              Нет в наличии
            </button>
          {/if}
        </div>

        <!-- Description -->
        {#if part.description}
          <div class="prose prose-gray max-w-none">
            <h3 class="text-lg font-bold text-gray-900 mb-3">Описание</h3>
            <p class="text-gray-600 leading-relaxed">{part.description}</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Similar Products -->
    {#if similarParts.length > 0}
      <div class="mt-24 border-t border-gray-100 pt-16">
        <h2 class="text-2xl font-bold text-gray-900 mb-8">Похожие товары</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
          {#each similarParts as item}
            <PartCard part={item} />
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>
