<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
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
  let top100PartIds = $state(new Set()); // ID топ 100 товаров для "Хит продаж"
  
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
    image: parts[0]?.images?.[0]?.image_url || '/images/catalog-og.jpg',
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
      const params = {};
      
      // Добавляем фильтры, если они есть
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }
      if (filters.brand) {
        params.brand = filters.brand;
      }
      if (filters.warehouse) {
        params.warehouse = filters.warehouse;
      }
      if (filters.price_min) {
        params.price_min = parseFloat(filters.price_min);
      }
      if (filters.price_max) {
        params.price_max = parseFloat(filters.price_max);
      }
      
      // Загружаем все товары с фильтрами (но без ограничения по наличию)
      const data = await partsApi.getParts({
        page: 1,
        page_size: 1000,
        ...params
      });
      
      let allParts = data.results || [];
      
      // Сортируем товары:
      // 1. Сначала популярные (из топ 100) в наличии
      // 2. Затем популярные без наличия  
      // 3. Затем не популярные в наличии (рандомные)
      // 4. Затем не популярные без наличия
      // Внутри каждой группы сортируем по доступному количеству (по убыванию)
      
      // Разделяем на группы
      const popularInStock = [];
      const popularOutOfStock = [];
      const randomInStock = [];
      const randomOutOfStock = [];
      
      allParts.forEach(part => {
        const isPopular = top100PartIds.has(part.id);
        const available = Number(part.available) || 0;
        const inStock = available > 0;
        
        if (isPopular && inStock) {
          popularInStock.push(part);
        } else if (isPopular && !inStock) {
          popularOutOfStock.push(part);
        } else if (!isPopular && inStock) {
          randomInStock.push(part);
        } else {
          randomOutOfStock.push(part);
        }
      });
      
      // Сортируем каждую группу по available (по убыванию)
      popularInStock.sort((a, b) => (Number(b.available) || 0) - (Number(a.available) || 0));
      popularOutOfStock.sort((a, b) => (Number(b.available) || 0) - (Number(a.available) || 0));
      
      // Перемешиваем не популярные товары в наличии (рандомные)
      randomInStock.sort(() => Math.random() - 0.5);
      randomOutOfStock.sort((a, b) => (Number(b.available) || 0) - (Number(a.available) || 0));
      
      // Объединяем все группы
      const sortedParts = [
        ...popularInStock,
        ...popularOutOfStock,
        ...randomInStock,
        ...randomOutOfStock
      ].map(part => ({
        ...part,
        isPopular: top100PartIds.has(part.id),
        available: Number(part.available) || 0
      }));
      
      // Пагинация на клиенте
      const startIndex = (currentPage - 1) * 12;
      const endIndex = startIndex + 12;
      const paginatedParts = sortedParts.slice(startIndex, endIndex);

      if (currentPage === 1) {
        parts = paginatedParts;
      } else {
        parts = [...parts, ...paginatedParts];
      }

      totalPages = Math.ceil(sortedParts.length / 12);
      totalCount = sortedParts.length;
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      console.error('Детали ошибки:', error.message, error.stack);
      // Показываем уведомление об ошибке
      alert('Ошибка загрузки товаров. Попробуйте позже.');
      parts = [];
      totalCount = 0;
      totalPages = 1;
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
  
  // Загрузка топ 100 товаров для "Хит продаж"
  async function loadTop100Products() {
    try {
      const productsStats = await fetch('/api/analytics/products?limit=100').then(r => r.json());
      if (productsStats.success && productsStats.topProducts && productsStats.topProducts.length > 0) {
        // Получаем ID топ 100 товаров
        top100PartIds = new Set(productsStats.topProducts.map(p => p.partId));
      }
    } catch (error) {
      console.error('Ошибка загрузки топ товаров:', error);
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

  // Функция для обновления фильтров из URL
  function updateFiltersFromUrl() {
    const urlSearch = ($page.url.searchParams.get('search') || '').replace(/\+/g, ' ');
    const urlBrand = $page.url.searchParams.get('brand') || '';
    const urlWarehouse = $page.url.searchParams.get('warehouse') || '';
    const urlPriceMin = $page.url.searchParams.get('price_min') || '';
    const urlPriceMax = $page.url.searchParams.get('price_max') || '';
    const urlInStock = $page.url.searchParams.get('in_stock') === 'true';
    const urlOrdering = $page.url.searchParams.get('ordering') || '-created_at';
    const urlPage = parseInt($page.url.searchParams.get('page') || '1');
    
    // Обновляем фильтры
    filters = {
      search: urlSearch,
      brand: urlBrand,
      warehouse: urlWarehouse,
      price_min: urlPriceMin,
      price_max: urlPriceMax,
      in_stock: urlInStock,
      ordering: urlOrdering
    };
    currentPage = urlPage;
  }
  
  // Обновление фильтров при изменении URL через afterNavigate
  afterNavigate(() => {
    updateFiltersFromUrl();
    // Загружаем товары после обновления фильтров
    loadTop100Products().then(() => {
      loadParts();
    });
  });
  
  // Инициализация
  onMount(() => {
    // Обновляем фильтры из URL при первой загрузке
    updateFiltersFromUrl();
    
    loadReferences();
    loadTop100Products().then(() => {
      loadParts();
    });
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
            <PartCard {part} isPopular={part.isPopular || false} on:addToCart={handleAddToCart} />
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