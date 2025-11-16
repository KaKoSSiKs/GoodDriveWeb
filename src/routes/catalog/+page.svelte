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
  let referencesLoaded = $state(false);
  function normalizeString(value) {
    return value?.toString().trim().toLowerCase().replace(/[\s\-_/]+/g, '');
  }
  
  function getBrandIdsByName(name) {
    const normalized = normalizeString(name);
    if (!normalized) return [];
    
    return (brands || [])
      .filter((brand) => {
        const brandName = normalizeString(brand.name);
        return brandName === normalized ||
          brandName?.includes(normalized) ||
          normalized.includes(brandName);
      })
      .map((brand) => brand.id?.toString())
      .filter(Boolean);
  }
  
  // Получаем текущий URL из store (только на верхнем уровне)
  const currentUrl = $derived($page.url);
  
  // Получаем начальные значения фильтров из URL (на верхнем уровне)
  const initialFilters = {
    search: ($page.url.searchParams.get('search') || '').replace(/\+/g, ' '),
    category: $page.url.searchParams.get('category') || '',
    brand: $page.url.searchParams.get('brand') || '',
    warehouse: $page.url.searchParams.get('warehouse') || '',
    price_min: $page.url.searchParams.get('price_min') || '',
    price_max: $page.url.searchParams.get('price_max') || '',
    in_stock: $page.url.searchParams.get('in_stock') === 'true',
    ordering: $page.url.searchParams.get('ordering') || '-created_at',
    vehicle_brand: $page.url.searchParams.get('vehicleBrand') || '',
    vehicle_model: $page.url.searchParams.get('vehicleModel') || '',
    vehicle_modification: $page.url.searchParams.get('vehicleModification') || '',
    vehicle_year: $page.url.searchParams.get('vehicleYear') || ''
  };
  
  const vehicleParamMap = {
    vehicle_brand: 'vehicleBrand',
    vehicle_model: 'vehicleModel',
    vehicle_modification: 'vehicleModification',
    vehicle_year: 'vehicleYear'
  };
  
  let filters = $state(initialFilters);
  
  // Производные значения
  const hasParts = $derived(parts.length > 0);
  const hasFilters = $derived(
    filters.search || filters.brand || filters.warehouse ||
    filters.price_min || filters.price_max || filters.in_stock ||
    filters.vehicle_brand || filters.vehicle_model ||
    filters.vehicle_modification || filters.vehicle_year
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
  function getVehicleTokens() {
    const tokens = [];
    const addTokens = (value) => {
      if (!value) return;
      value
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => tokens.push(token.toLowerCase()));
    };
    
    addTokens(filters.vehicle_model);
    addTokens(filters.vehicle_modification);
    addTokens(filters.vehicle_year);
    addTokens(filters.search);
    return Array.from(new Set(tokens));
  }
  
  function calculateMatchScore(part, tokens) {
    if (!tokens.length) return 0;
    const title = part.title?.toLowerCase() || '';
    let score = 0;
    
    tokens.forEach((token) => {
      if (!token) return;
      if (title.includes(token)) {
        score += token.length >= 4 ? 3 : 2;
      } else {
        // проверяем совпадение по словам
        const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (regex.test(title)) {
          score += 1;
        }
      }
    });
    
    return score;
  }
  
  async function loadParts() {
    if (!referencesLoaded) {
      await loadReferences();
    }
    if (currentPage === 1) {
      isLoading = true;
    } else {
      isLoadingMore = true;
    }

    try {
      // Строим параметры запроса
      const params = {};
      
      // Добавляем фильтры, если они есть
      let searchTerm = filters.search && filters.search.trim() ? filters.search.trim() : '';
      if (!searchTerm) {
        const vehicleSearchTerms = [
          filters.vehicle_model,
          filters.vehicle_modification
        ].filter(Boolean);
        if (vehicleSearchTerms.length > 0) {
          searchTerm = vehicleSearchTerms.join(' ');
        }
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      if (filters.category && filters.category.trim()) {
        params.category = filters.category.trim();
      }
      if (filters.brand) {
        params.brand = filters.brand;
      } else if (filters.vehicle_brand) {
        const brandIds = getBrandIdsByName(filters.vehicle_brand);
        if (brandIds.length > 0) {
          params.brand = brandIds.join(',');
        }
      }
      if (filters.warehouse) {
        params.warehouse = filters.warehouse;
      }
      // Цена может приходить как строка или как число — обрабатываем безопасно
      const rawPriceMin = filters.price_min;
      const rawPriceMax = filters.price_max;

      if (rawPriceMin !== '' && rawPriceMin !== null && rawPriceMin !== undefined) {
        const priceMin = typeof rawPriceMin === 'string' ? parseFloat(rawPriceMin) : Number(rawPriceMin);
        if (!isNaN(priceMin) && priceMin >= 0) {
          params.price_min = priceMin;
        }
      }
      if (rawPriceMax !== '' && rawPriceMax !== null && rawPriceMax !== undefined) {
        const priceMax = typeof rawPriceMax === 'string' ? parseFloat(rawPriceMax) : Number(rawPriceMax);
        if (!isNaN(priceMax) && priceMax >= 0) {
          params.price_max = priceMax;
        }
      }
      
      // Загружаем все товары с фильтрами (но без ограничения по наличию)
      // Очищаем пустые значения из параметров
      const cleanParams = {};
      Object.keys(params).forEach(key => {
        const value = params[key];
        // Пропускаем пустые строки, null, undefined
        if (value !== '' && value !== null && value !== undefined) {
          // Для числовых параметров проверяем, что это валидное число
          if ((key === 'price_min' || key === 'price_max') && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0) {
              cleanParams[key] = numValue;
            }
          } else {
            cleanParams[key] = value;
          }
        }
      });
      
      // Удаляем page_size из cleanParams, если он там есть, чтобы использовать наш фиксированный размер
      delete cleanParams.page_size;
      delete cleanParams.page; // Также удаляем page, так как мы всегда используем page: 1
      // Пробрасываем выбранную сортировку на backend
      if (filters.ordering) {
        cleanParams.ordering = filters.ordering;
      }
      
      console.log('Загрузка товаров с параметрами:', cleanParams);
      const loadData = async (extraParams = {}) => {
        return partsApi.getParts({
          page: 1,
          page_size: 100, // Используем максимальное допустимое значение
          ...cleanParams,
          ...extraParams
        });
      };

      const data = await loadData();
      console.log('Получены данные от API:', { 
        hasData: !!data, 
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        hasResults: !!(data?.results), 
        resultsCount: data?.results?.length || 0,
        totalCount: data?.count || 0,
        fullData: data
      });
      
      // Обрабатываем различные форматы ответа
      let allParts = [];
      if (data) {
        if (Array.isArray(data)) {
          // Если ответ - массив напрямую
          allParts = data;
        } else if (Array.isArray(data.results)) {
          // Стандартный формат с results
          allParts = data.results;
        } else if (Array.isArray(data.data)) {
          // Альтернативный формат с data
          allParts = data.data;
        } else if (data.results && typeof data.results === 'object' && !Array.isArray(data.results)) {
          // Если results это объект, пытаемся извлечь массив
          console.warn('Неожиданный формат results:', data.results);
          allParts = [];
        }
      }
      
      if (!Array.isArray(allParts)) {
        console.error('Ошибка: не удалось извлечь массив товаров из ответа:', {
          data,
          allParts,
          allPartsType: typeof allParts
        });
        allParts = [];
      }
      
      console.log('Извлечено товаров:', allParts.length);
      
      // Логируем первые несколько товаров для проверки структуры изображений
      if (allParts.length > 0) {
        console.log('Товары с изображениями (первые 3):', 
          allParts.slice(0, 3).map(p => ({
            id: p.id,
            title: p.title,
            hasImages: !!p.images,
            imagesLength: p.images?.length || 0,
            firstImage: p.images?.[0] ? {
              id: p.images[0].id,
              image_url: p.images[0].image_url?.substring(0, 100),
              imageUrl: p.images[0].imageUrl?.substring(0, 100),
              url: p.images[0].url?.substring(0, 100),
              alt_text: p.images[0].alt_text,
              order_index: p.images[0].order_index
            } : null,
            allImageKeys: p.images?.[0] ? Object.keys(p.images[0]) : []
          }))
        );
      }
      
      // Поддержка сортировки: backend отдаёт в выбранном порядке,
      // здесь лишь гарантируем, что товары без наличия идут внизу,
      // сохраняя относительный порядок из результата API.
      const inStockParts = allParts.filter(p => (Number(p.available) || 0) > 0);
      const outOfStockParts = allParts.filter(p => (Number(p.available) || 0) <= 0);

      let sortedParts = [...inStockParts, ...outOfStockParts].map(part => ({
        ...part,
        available: Number(part.available) || 0
      }));
      
      // Fallback: если нет товаров, пробуем подгрузить по бренду и ранжировать по совпадению
      if (sortedParts.length === 0) {
        const tokens = getVehicleTokens();
        let fallbackParts = [];
        
        if (tokens.length > 0 || filters.vehicle_brand) {
          let fallbackBrandParam = cleanParams.brand;
          if (!fallbackBrandParam && filters.vehicle_brand) {
            const brandIds = getBrandIdsByName(filters.vehicle_brand);
            if (brandIds.length > 0) {
              fallbackBrandParam = brandIds.join(',');
            }
          }
          
          const fallbackData = await loadData({
            brand: fallbackBrandParam || cleanParams.brand || undefined,
            search: undefined
          });
          
          if (fallbackData) {
            if (Array.isArray(fallbackData.results)) {
              fallbackParts = fallbackData.results;
            } else if (Array.isArray(fallbackData.data)) {
              fallbackParts = fallbackData.data;
            }
          }
          
          if (fallbackParts.length > 0) {
            // Ранжируем по релевантности, но сохраняем правило "в наличии сверху"
            const withScores = fallbackParts.map(part => ({
              ...part,
              available: Number(part.available) || 0,
              matchScore: calculateMatchScore(part, tokens)
            }));
            const fallbackInStock = withScores.filter(p => p.available > 0).sort((a, b) => b.matchScore - a.matchScore);
            const fallbackOutOfStock = withScores.filter(p => p.available <= 0).sort((a, b) => b.matchScore - a.matchScore);
            sortedParts = [...fallbackInStock, ...fallbackOutOfStock];
          }
        }

        if (!sortedParts || sortedParts.length === 0) {
          // Если даже fallback ничего не дал, показываем все товары,
          // при этом "нет в наличии" внизу без дополнительной сортировки
          sortedParts = [...inStockParts, ...outOfStockParts].map(part => ({
            ...part,
            available: Number(part.available) || 0
          }));
        }
      }
      
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
      
      console.log('Товары обработаны:', {
        allPartsCount: allParts.length,
        sortedPartsCount: sortedParts.length,
        paginatedPartsCount: paginatedParts.length,
        currentPage,
        totalPages,
        totalCount
      });
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      console.error('Детали ошибки:', error.message, error.stack);
      
      // Определяем тип ошибки для более понятного сообщения
      let errorMessage = 'Ошибка загрузки товаров. Попробуйте позже.';
      if (error.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Ошибка подключения к серверу. Проверьте подключение к интернету.';
        } else if (error.message.includes('Database') || error.message.includes('Prisma')) {
          errorMessage = 'Ошибка подключения к базе данных. Обратитесь к администратору.';
        } else if (error.message.includes('Validation')) {
          errorMessage = 'Ошибка валидации данных. Попробуйте обновить страницу.';
        } else {
          errorMessage = `Ошибка: ${error.message}`;
        }
      }
      
      // Показываем уведомление об ошибке
      alert(errorMessage);
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
      referencesLoaded = true;
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  }

  async function ensureReferencesLoaded() {
    if (!referencesLoaded) {
      await loadReferences();
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
      const paramName = vehicleParamMap[key] || key;
      const value = newFilters[key];
      if (value && value !== false) {
        // Правильно кодируем search параметр (пробелы в +)
        if (key === 'search' && typeof value === 'string') {
          url.searchParams.set(paramName, value.replace(/\s+/g, '+'));
        } else {
          url.searchParams.set(paramName, value);
        }
      } else {
        url.searchParams.delete(paramName);
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
      ordering: '-created_at',
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_modification: '',
      vehicle_year: ''
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
      ordering: urlOrdering,
      vehicle_brand: $page.url.searchParams.get('vehicleBrand') || '',
      vehicle_model: $page.url.searchParams.get('vehicleModel') || '',
      vehicle_modification: $page.url.searchParams.get('vehicleModification') || '',
      vehicle_year: $page.url.searchParams.get('vehicleYear') || ''
    };
    currentPage = urlPage;
  }
  
  // Обновление фильтров при изменении URL через afterNavigate
  afterNavigate(async () => {
    updateFiltersFromUrl();
    // Загружаем товары после обновления фильтров
    await ensureReferencesLoaded();
    await loadTop100Products();
    await loadParts();
  });
  
  // Инициализация
  onMount(async () => {
    // Обновляем фильтры из URL при первой загрузке
    updateFiltersFromUrl();
    
    await ensureReferencesLoaded();
    await loadTop100Products();
    await loadParts();
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

<div class="container-custom py-4 md:py-6">
  <!-- Заголовок -->
  <div class="mb-4 md:mb-6">
    <h1 class="text-xl md:text-2xl font-bold text-neutral-900 mb-1">
      {filters.search ? `Поиск: "${filters.search}"` : 'Каталог автозапчастей'}
    </h1>
    <p class="text-sm md:text-base text-neutral-600">
      {#if isLoading}
        Загрузка...
      {:else}
        Найдено товаров: {formatUtils.formatNumber(totalCount)}
      {/if}
    </p>
  </div>

  <div class="flex flex-col lg:flex-row gap-4 lg:gap-6">
    <!-- Фильтры -->
    <aside class="lg:w-64 xl:w-72">
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
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 items-stretch">
          {#each Array(12) as _}
            <div class="card p-3 animate-pulse">
              <div class="bg-neutral-200 h-32 rounded-lg mb-2"></div>
              <div class="bg-neutral-200 h-3 rounded mb-1.5"></div>
              <div class="bg-neutral-200 h-3 rounded w-3/4 mb-2"></div>
              <div class="bg-neutral-200 h-5 rounded w-1/2"></div>
            </div>
          {/each}
        </div>
      {:else if hasParts}
        <!-- Сетка товаров -->
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 mb-8 items-stretch">
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
          {#if filters.search && filters.search.trim().length > 0}
            {#if filters.search.trim().length < 2}
              <!-- Поисковый запрос слишком короткий -->
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">Поисковый запрос слишком короткий</h3>
              <p class="text-neutral-600 mb-4">
                Введите минимум 2 символа для поиска
              </p>
              <p class="text-sm text-neutral-500 mb-4">
                Попробуйте ввести название товара, артикул или номер детали
              </p>
            {:else}
              <!-- Товары не найдены по запросу -->
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">
                По запросу "{filters.search}" ничего не найдено
              </h3>
              <p class="text-neutral-600 mb-2">
                Попробуйте:
              </p>
              <ul class="text-left max-w-md mx-auto text-neutral-600 mb-4 space-y-1">
                <li>• Проверить правильность написания</li>
                <li>• Использовать другие ключевые слова</li>
                <li>• Поискать по артикулу или номеру детали</li>
                <li>• Изменить фильтры (бренд, склад, цена)</li>
              </ul>
            {/if}
          {:else if filters.brand || filters.warehouse || filters.price_min || filters.price_max}
            <!-- Товары не найдены с применёнными фильтрами -->
            <h3 class="text-lg font-semibold text-neutral-900 mb-2">Товары не найдены</h3>
            <p class="text-neutral-600 mb-4">
              Попробуйте изменить параметры фильтров или сбросить их
            </p>
          {:else}
            <!-- Общий случай - нет товаров -->
            <h3 class="text-lg font-semibold text-neutral-900 mb-2">Товары не найдены</h3>
            <p class="text-neutral-600 mb-4">
              В каталоге пока нет товаров, соответствующих вашим критериям
            </p>
          {/if}
          <button onclick={handleClearFilters} class="btn-primary">
            Сбросить фильтры
          </button>
        </div>
      {/if}
    </main>
  </div>
</div>