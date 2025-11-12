<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import PartCard from '$lib/components/PartCard.svelte';
  import CatalogFilters from '$lib/components/CatalogFilters.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { partsApi, brandsApi, warehousesApi, cartUtils } from '$lib/utils/api.js';
  import { formatUtils } from '$lib/utils/api.js';
  import { generateCollectionJsonLd, generateBreadcrumbJsonLd } from '$lib/utils/seo.js';
  
  // Реактивное состояние
  let parts = $state([]);
  let brands = $state([]);
  let warehouses = $state([]);
  let isLoading = $state(true);
  let isLoadingMore = $state(false);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalCount = $state(0);
  
  // Получаем текущий URL из store (только на верхнем уровне)
  const currentUrl = $derived($page.url);
  
  // Получаем начальные значения фильтров из URL (на верхнем уровне)
  const initialFilters = {
    search: ($page.url.searchParams.get('search') || '').replace(/\+/g, ' '),
    brand: $page.url.searchParams.get('brand') || '',
    warehouse: $page.url.searchParams.get('warehouse') || '',
    price_min: $page.url.searchParams.get('price_min') || '',
    price_max: $page.url.searchParams.get('price_max') || '',
    in_stock: $page.url.searchParams.get('in_stock') === 'true',
    ordering: $page.url.searchParams.get('ordering') || '-created_at'
  };
  
  let filters = $state(initialFilters);
  
  // Производные значения
  const hasParts = $derived(parts.length > 0);
  const hasFilters = $derived(
    filters.search || filters.brand || filters.warehouse ||
    filters.price_min || filters.price_max || filters.in_stock
  );
  
  // SEO данные
  const seoData = $derived({
    title: filters.search ? `Поиск "${filters.search}"` : 'Каталог автозапчастей',
    description: filters.search 
      ? `Результаты поиска "${filters.search}" в каталоге автозапчастей GoodDrive. Найдено ${totalCount} товаров.`
      : 'Каталог автозапчастей GoodDrive. Широкий ассортимент деталей от ведущих производителей.',
    keywords: filters.search 
      ? `поиск, ${filters.search}, автозапчасти, каталог`
      : 'каталог, автозапчасти, фильтры, бренды, цены',
    image: parts[0]?.main_image?.url || '/images/catalog-og.jpg',
    type: 'website'
  });
  
  // JSON-LD для коллекции товаров
  const collectionJsonLd = $derived(generateCollectionJsonLd(parts, {
    url: currentUrl.href,
    totalCount: totalCount
  }));
  
  // Хлебные крошки
  const breadcrumbs = $derived([
    { name: 'Главная', url: '/' },
    { name: 'Каталог', url: '/catalog' },
    ...(filters.search ? [{ name: `Поиск: ${filters.search}`, url: `/catalog?search=${encodeURIComponent(filters.search)}` }] : [])
  ]);
  
  // Загрузка данных товаров
  async function loadParts() {
    if (currentPage === 1) {
      isLoading = true;
    } else {
      isLoadingMore = true;
    }

    try {
      // Строим параметры запроса
      const params = {
        page: currentPage,
        page_size: 12,
        ...filters
      };

      // Убираем пустые значения
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === false) {
          delete params[key];
        }
      });

      const data = await partsApi.getParts(params);

      if (currentPage === 1) {
        parts = data.results || [];
      } else {
        parts = [...parts, ...(data.results || [])];
      }

      totalPages = Math.ceil(data.count / 12);
      totalCount = data.count;
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      // Показываем уведомление об ошибке
      alert('Ошибка загрузки товаров. Попробуйте позже.');
    } finally {
      isLoading = false;
      isLoadingMore = false;
    }
  }

  // Загрузка справочников
  async function loadReferences() {
    try {
      const [brandsData, warehousesData] = await Promise.all([
        brandsApi.getBrands(),
        warehousesApi.getWarehouses()
      ]);

      brands = brandsData.results || brandsData;
      warehouses = warehousesData.results || warehousesData;
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  }

  // Обработчики
  function handleFilterChange(newFilters) {
    filters = newFilters;
    currentPage = 1;
    
    // Обновляем URL без перезагрузки страницы
    const url = new URL(currentUrl);
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key] && newFilters[key] !== false) {
        // Правильно кодируем search параметр (пробелы в +)
        if (key === 'search' && typeof newFilters[key] === 'string') {
          url.searchParams.set(key, newFilters[key].replace(/\s+/g, '+'));
        } else {
          url.searchParams.set(key, newFilters[key]);
        }
      } else {
        url.searchParams.delete(key);
      }
    });
    
    // Обновляем URL
    window.history.replaceState({}, '', url);
    
    loadParts();
  }

  function handleClearFilters() {
    filters = {
      search: '',
      brand: '',
      warehouse: '',
      price_min: '',
      price_max: '',
      in_stock: false,
      ordering: '-created_at'
    };
    currentPage = 1;
    
    // Очищаем URL параметры
    const url = new URL(currentUrl);
    url.search = '';
    window.history.replaceState({}, '', url);
    
    loadParts();
  }

  function handlePageChange(page) {
    currentPage = page;
    
    // Обновляем URL с номером страницы
    const url = new URL(currentUrl);
    if (page > 1) {
      url.searchParams.set('page', page);
    } else {
      url.searchParams.delete('page');
    }
    window.history.replaceState({}, '', url);
    
    loadParts();
  }

  function handleAddToCart(event) {
    const { part } = event.detail;
    cartUtils.addToCart(part);

    // Показываем уведомление
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = `Добавлено в корзину: ${part.title}`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Инициализация
  onMount(() => {
    loadReferences();
    loadParts();
  });
</script>

<SeoHead
  title={seoData.title}
  description={seoData.description}
  keywords={seoData.keywords}
  image={seoData.image}
  type={seoData.type}
  breadcrumbs={breadcrumbs}
  jsonLd={collectionJsonLd}
/>

<div class="container-custom py-8">
  <!-- Заголовок -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-neutral-900 mb-2">
      {filters.search ? `Поиск: "${filters.search}"` : 'Каталог автозапчастей'}
    </h1>
    <p class="text-neutral-600">
      {#if isLoading}
        Загрузка...
      {:else}
        Найдено товаров: {formatUtils.formatNumber(totalCount)}
      {/if}
    </p>
  </div>

  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Фильтры -->
    <aside class="lg:w-80">
      <CatalogFilters
        {brands}
        {warehouses}
        {filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
    </aside>

    <!-- Товары -->
    <main class="flex-1">
      {#if isLoading}
        <!-- Скелетон загрузки -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each Array(12) as _}
            <div class="card p-6 animate-pulse">
              <div class="bg-neutral-200 h-48 rounded-lg mb-4"></div>
              <div class="bg-neutral-200 h-4 rounded mb-2"></div>
              <div class="bg-neutral-200 h-4 rounded w-3/4 mb-4"></div>
              <div class="bg-neutral-200 h-6 rounded w-1/2"></div>
            </div>
          {/each}
        </div>
      {:else if hasParts}
        <!-- Сетка товаров -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {#each parts as part}
            <PartCard
              {part}
              on:addToCart={handleAddToCart}
            />
          {/each}
        </div>

        <!-- Пагинация -->
        <Pagination
          {currentPage}
          {totalPages}
          onPageChange={handlePageChange}
        />
      {:else}
        <!-- Пустое состояние -->
        <div class="text-center py-16">
          <svg class="w-16 h-16 text-neutral-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Товары не найдены</h3>
          <p class="text-neutral-600 mb-4">Попробуйте изменить параметры поиска</p>
          <button onclick={handleClearFilters} class="btn-primary">
            Сбросить фильтры
          </button>
        </div>
      {/if}
    </main>
  </div>
</div>