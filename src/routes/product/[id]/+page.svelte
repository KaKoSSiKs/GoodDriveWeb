<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { partsApi, cartUtils, formatUtils } from '$lib/utils/api.js';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import PartCard from '$lib/components/PartCard.svelte';

	// Состояние
	let part = $state(null);
	let similarParts = $state([]);
	let loading = $state(true);
	let selectedImageIndex = $state(0);
	let quantity = $state(1);
	let isAddingToCart = $state(false);
	let showNotification = $state(false);

	// Производные значения
	const productId = $derived($page.params.id);
	const hasImages = $derived(part?.images?.length > 0);
	const currentImage = $derived(part?.images?.[selectedImageIndex]);
	const brandName = $derived(part?.brand?.name || 'Неизвестный');
	const brandCountry = $derived(part?.brand?.country || '');
	const warehouseName = $derived(part?.warehouse?.name || '');
	const isInStock = $derived(part?.available > 0);
	const maxQuantity = $derived(Math.min(part?.available || 0, 99));
	const price = $derived(parseFloat(part?.price_opt) || 0);
	const totalPrice = $derived(price * quantity);

	// SEO данные
	const seoData = $derived({
		title: part?.title ? `${part.title} - ${brandName} | GoodDrive` : 'Загрузка...',
		description: part?.description || `Автозапчасть ${part?.title || ''} от ${brandName}. Наличие: ${part?.available || 0} шт. Быстрая доставка по России.`,
		keywords: part ? `${part.title}, ${brandName}, автозапчасти, ${part.original_number || ''}` : '',
		type: 'product'
	});

	// Загрузка товара
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

	// Загрузка похожих товаров
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

	// Добавление в корзину
	function handleAddToCart() {
		if (!part || !isInStock || isAddingToCart) return;

		isAddingToCart = true;
		cartUtils.addToCart(part, quantity);
		
		// Показываем уведомление
		showNotification = true;
		setTimeout(() => {
			showNotification = false;
			isAddingToCart = false;
		}, 2000);
	}

	// Изменение количества
	function updateQuantity(delta) {
		const newQuantity = quantity + delta;
		if (newQuantity >= 1 && newQuantity <= maxQuantity) {
			quantity = newQuantity;
		}
	}

	// Выбор изображения
	function selectImage(index) {
		selectedImageIndex = index;
	}

	// Инициализация
	onMount(() => {
		loadPart();
	});

	// Загрузка похожих при изменении товара
	$effect(() => {
		if (part) {
			loadSimilarParts();
		}
	});
</script>

<SeoHead data={seoData} />

<!-- Уведомление о добавлении в корзину -->
{#if showNotification}
	<div class="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-in-right">
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
		</svg>
		<span class="font-medium">Добавлено в корзину!</span>
	</div>
{/if}

<div class="container-custom py-8">
{#if loading}
	<!-- Загрузка -->
	<div class="flex items-center justify-center py-20">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
			<p class="text-gray-600 font-medium">Загрузка товара...</p>
		</div>
	</div>
{:else if !part}
	<!-- Товар не найден -->
	<div class="max-w-2xl mx-auto">
		<div class="card text-center py-16 px-8">
			<svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<h2 class="text-2xl font-bold text-gray-900 mb-2">Товар не найден</h2>
			<p class="text-gray-600 mb-6">К сожалению, этот товар не существует или был удален</p>
			<a href="/catalog" class="btn-primary inline-flex items-center gap-2">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
				</svg>
				Вернуться в каталог
			</a>
		</div>
	</div>
{:else}
	<!-- Хлебные крошки -->
	<nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
		<a href="/" class="hover:text-primary-600 transition-colors">Главная</a>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
		</svg>
		<a href="/catalog" class="hover:text-primary-600 transition-colors">Каталог</a>
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
		</svg>
		<span class="text-gray-900 font-medium truncate">{part.title}</span>
	</nav>

	<!-- Основной контент -->
	<div class="grid lg:grid-cols-2 gap-10 mb-16">
		<!-- Левая колонка: Галерея изображений -->
		<div class="space-y-4">
			<!-- Основное изображение -->
			<div class="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-lg border border-gray-200" role="img" aria-label="Изображение товара {part.title}">
				{#if hasImages && currentImage}
					<img
						src={currentImage.image_url}
						alt={currentImage.alt_text || `${part.title}${brandName ? ` от ${brandName}` : ''}`}
						class="w-full h-full object-contain p-4 transition-opacity duration-300"
						loading={selectedImageIndex === 0 ? 'eager' : 'lazy'}
						decoding="async"
						width="800"
						height="800"
						onerror={(e) => {
							console.error('Image load error:', currentImage.image_url);
							e.currentTarget.style.display = 'none';
						}}
					/>
				{:else}
					<div class="w-full h-full flex items-center justify-center" role="img" aria-label="Изображение товара отсутствует">
						<div class="text-center">
							<svg class="w-32 h-32 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
							</svg>
							<p class="text-gray-400 font-medium">Изображение отсутствует</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Миниатюры -->
			{#if part.images && part.images.length > 1}
				<div class="grid grid-cols-4 gap-3" role="group" aria-label="Миниатюры изображений товара">
					{#each part.images as image, index}
						<button
							onclick={() => selectImage(index)}
							aria-label="Показать изображение {index + 1} из {part.images.length}: {image.alt_text || part.title}"
							aria-pressed={selectedImageIndex === index}
							class="aspect-square bg-gray-50 rounded-xl overflow-hidden border-2 transition-all duration-200
								   {selectedImageIndex === index ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200 hover:border-primary-300'}"
						>
							<img
								src={image.image_url}
								alt={image.alt_text || `${part.title} - изображение ${index + 1}`}
								class="w-full h-full object-contain p-2"
								loading="lazy"
								decoding="async"
								width="200"
								height="200"
								onerror={(e) => {
									console.error('Thumbnail load error:', image.image_url);
									e.currentTarget.style.display = 'none';
								}}
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Правая колонка: Информация -->
		<div class="space-y-6">
			<!-- Заголовок и бейдж -->
			<div>
				<div class="flex items-center gap-3 mb-3">
					<span class="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-50 text-primary-700 border border-primary-100">
						{brandName}
					</span>
					{#if brandCountry}
						<span class="text-sm text-gray-500">🌍 {brandCountry}</span>
					{/if}
				</div>
				
				<h1 class="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
					{part.title}
				</h1>
			</div>

			<!-- Артикулы -->
			{#if part.original_number || part.manufacturer_number}
				<div class="card p-4 bg-gray-50 space-y-2">
					{#if part.original_number}
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-600 font-medium">Оригинальный номер:</span>
							<code class="font-mono bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-gray-900">
								{part.original_number}
							</code>
						</div>
					{/if}
					{#if part.manufacturer_number}
						<div class="flex items-center justify-between text-sm">
							<span class="text-gray-600 font-medium">Номер производителя:</span>
							<code class="font-mono bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-gray-900">
								{part.manufacturer_number}
							</code>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Наличие и склад -->
			<div class="flex items-center gap-4 flex-wrap">
				{#if isInStock}
					<div class="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
						<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-sm font-semibold text-green-700">В наличии: {part.available} шт</span>
					</div>
				{:else}
					<div class="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
						<svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						<span class="text-sm font-semibold text-orange-700">Под заказ</span>
					</div>
				{/if}

				{#if warehouseName}
					<div class="flex items-center gap-2 text-sm text-gray-600">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
						</svg>
						{warehouseName}
					</div>
				{/if}
			</div>

			<!-- Описание (если есть) -->
			{#if part.description}
				<div class="card p-6 bg-blue-50 border-blue-100">
					<h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
						<svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
						</svg>
						Описание
					</h3>
					<p class="text-gray-700 leading-relaxed">{part.description}</p>
				</div>
			{/if}

			<!-- Блок покупки -->
			<div class="card p-6 bg-gradient-to-br from-white to-gray-50 border-2 border-primary-100 sticky top-20">
				<!-- Цена -->
				<div class="mb-6">
					<div class="flex items-baseline gap-3 mb-2">
						<span class="text-5xl font-bold text-gradient">
							{formatUtils.formatPrice(price)}
						</span>
					</div>
					<p class="text-sm text-gray-500">Цена указана за 1 шт.</p>
				</div>

				<!-- Количество -->
				<div class="mb-6">
					<label class="block text-sm font-semibold text-gray-700 mb-3">Количество</label>
					<div class="flex items-center gap-3">
						<button
							onclick={() => updateQuantity(-1)}
							disabled={quantity <= 1}
							class="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
							</svg>
						</button>
						
						<input
							type="number"
							bind:value={quantity}
							min="1"
							max={maxQuantity}
							class="flex-1 text-center text-2xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
						/>
						
						<button
							onclick={() => updateQuantity(1)}
							disabled={quantity >= maxQuantity}
							class="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
							</svg>
						</button>
					</div>
					{#if maxQuantity < 99}
						<p class="text-xs text-gray-500 mt-2">Максимум: {maxQuantity} шт</p>
					{/if}
				</div>

				<!-- Итоговая стоимость -->
				<div class="bg-gray-100 rounded-xl p-4 mb-6">
					<div class="flex items-center justify-between">
						<span class="text-gray-700 font-medium">Итого:</span>
						<span class="text-3xl font-bold text-gray-900">
							{formatUtils.formatPrice(totalPrice)}
						</span>
					</div>
				</div>

				<!-- Кнопка В корзину -->
				<button
					onclick={handleAddToCart}
					disabled={!isInStock || isAddingToCart}
					class="w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3
						   {isInStock 
						     ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:shadow-2xl hover:scale-105 active:scale-95' 
						     : 'bg-gray-200 text-gray-500 cursor-not-allowed'}"
				>
					{#if isAddingToCart}
						<svg class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Добавление...
					{:else if isInStock}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
						</svg>
						Добавить в корзину
					{:else}
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
						</svg>
						Нет в наличии
					{/if}
				</button>

				<!-- Дополнительные кнопки -->
				<div class="grid grid-cols-2 gap-3 mt-4">
					<a href="/catalog" class="btn-outline text-center">
						← К каталогу
					</a>
					<button class="btn-ghost">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Похожие товары -->
	{#if similarParts.length > 0}
		<div class="border-t border-gray-200 pt-12">
			<h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
				<svg class="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
				</svg>
				Похожие товары
			</h2>
			<div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
				{#each similarParts as similarPart}
					<PartCard part={similarPart} />
				{/each}
			</div>
		</div>
	{/if}
{/if}
</div>

<style>
	@keyframes slide-in-right {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	.animate-slide-in-right {
		animation: slide-in-right 0.3s ease-out;
	}
</style>

