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
  import { generateCollectionJsonLd } from '$lib/utils/seo.js';
  import { toastStore } from '$lib/stores/toast.js';
  
  let parts = $state([]);
  let brands = $state([]);
  let warehouses = $state([]);
  let isLoading = $state(true);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalCount = $state(0);
  let top100PartIds = $state(new Set());
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
  
  const currentUrl = $derived($page.url);
  
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
  
  const hasParts = $derived(parts.length > 0);
  
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
  
  const collectionJsonLd = $derived(generateCollectionJsonLd(parts, {
    url: currentUrl.href,
    totalCount: totalCount
  }));
  
  const breadcrumbs = $derived([
    { name: 'Главная', url: '/' },
    { name: 'Каталог', url: '/catalog' },
    ...(filters.search ? [{ name: `Поиск: ${filters.search}`, url: `/catalog?search=${encodeURIComponent(filters.search)}` }] : [])
  ]);
  
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
        const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (regex.test(title)) {
          score += 1;
        }
      }
    });
    
    return score;
  }
  
  const PAGE_SIZE = 12;

  async function loadParts() {
    if (!referencesLoaded) {
      await loadReferences();
    }
    isLoading = true;

    try {
      const params = {};
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
      
      const cleanParams = {};
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== '' && value !== null && value !== undefined) {
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
      
      delete cleanParams.page_size;
      delete cleanParams.page; 
      if (filters.ordering) {
        cleanParams.ordering = filters.ordering;
      }
      
      const response = await partsApi.getParts({
        ...cleanParams,
        page: currentPage,
        page_size: PAGE_SIZE
      });

      let allParts = Array.isArray(response?.results) ? response.results : [];
      const fetchedCount = response?.count ?? allParts.length ?? 0;
      
      const inStockParts = allParts.filter(p => (Number(p.available) || 0) > 0);
      const outOfStockParts = allParts.filter(p => (Number(p.available) || 0) <= 0);

      let sortedParts = [...inStockParts, ...outOfStockParts].map(part => ({
        ...part,
        available: Number(part.available) || 0
      }));
      
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

          const fallbackParams = {
            ...cleanParams,
            brand: fallbackBrandParam || cleanParams.brand || undefined,
            page: 1,
            page_size: PAGE_SIZE
          };
          delete fallbackParams.search;

          const fallbackResponse = await partsApi.getParts(fallbackParams);
          fallbackParts = Array.isArray(fallbackResponse?.results) ? fallbackResponse.results : [];
        }
        
        if (fallbackParts.length > 0) {
            const withScores = fallbackParts.map(part => ({
              ...part,
              available: Number(part.available) || 0,
              matchScore: calculateMatchScore(part, tokens)
            }));
            const fallbackInStock = withScores.filter(p => p.available > 0).sort((a, b) => b.matchScore - a.matchScore);
            const fallbackOutOfStock = withScores.filter(p => p.available <= 0).sort((a, b) => b.matchScore - a.matchScore);
            sortedParts = [...fallbackInStock, ...fallbackOutOfStock];
          }

        if (!sortedParts || sortedParts.length === 0) {
          sortedParts = [...inStockParts, ...outOfStockParts].map(part => ({
            ...part,
            available: Number(part.available) || 0
          }));
        }
      }
      
      if (currentPage === 1) {
        parts = sortedParts;
      } else {
        parts = [...parts, ...sortedParts];
      }

      totalPages = Math.ceil((fetchedCount || sortedParts.length) / PAGE_SIZE);
      totalCount = fetchedCount || sortedParts.length;
      
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
      let errorMessage = 'Ошибка загрузки товаров. Попробуйте позже.';
      if (error.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Ошибка подключения к серверу. Проверьте подключение к интернету.';
        }
      }
      
      toastStore.error(errorMessage);
      parts = [];
      totalCount = 0;
      totalPages = 1;
    } finally {
      isLoading = false;
    }
  }

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
  
  async function loadTop100Products() {
    try {
      const productsStats = await fetch('/api/analytics/products?limit=100').then(r => r.json());
      if (productsStats.success && productsStats.topProducts && productsStats.topProducts.length > 0) {
        top100PartIds = new Set(productsStats.topProducts.map(p => p.partId));
      }
    } catch (error) {
      console.error('Ошибка загрузки топ товаров:', error);
    }
  }

  function handleFilterChange(newFilters) {
    filters = newFilters;
    currentPage = 1;
    
    const url = new URL(currentUrl);
    Object.keys(newFilters).forEach(key => {
      const paramName = vehicleParamMap[key] || key;
      const value = newFilters[key];
      if (value && value !== false) {
        if (key === 'search' && typeof value === 'string') {
          url.searchParams.set(paramName, value.replace(/\s+/g, '+'));
        } else {
          url.searchParams.set(paramName, value);
        }
      } else {
        url.searchParams.delete(paramName);
      }
    });
    
    window.history.replaceState({}, '', url);
    loadParts();
  }

  function handleClearFilters() {
    filters = {
      search: '',
      category: '',
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
    
    const url = new URL(currentUrl);
    url.search = '';
    window.history.replaceState({}, '', url);
    
    loadParts();
  }

  function handlePageChange(page) {
    currentPage = page;
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
    toastStore.success(`Товар "${part.title}" добавлен в корзину`);
  }

  function updateFiltersFromUrl() {
    const urlSearch = ($page.url.searchParams.get('search') || '').replace(/\+/g, ' ');
    const urlCategory = $page.url.searchParams.get('category') || '';
    const urlBrand = $page.url.searchParams.get('brand') || '';
    const urlWarehouse = $page.url.searchParams.get('warehouse') || '';
    const urlPriceMin = $page.url.searchParams.get('price_min') || '';
    const urlPriceMax = $page.url.searchParams.get('price_max') || '';
    const urlInStock = $page.url.searchParams.get('in_stock') === 'true';
    const urlOrdering = $page.url.searchParams.get('ordering') || '-created_at';
    const urlPage = parseInt($page.url.searchParams.get('page') || '1');
    
    filters = {
      search: urlSearch,
      category: urlCategory,
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
  
  afterNavigate(async () => {
    updateFiltersFromUrl();
    await ensureReferencesLoaded();
    await loadTop100Products();
    await loadParts();
  });
  
  onMount(async () => {
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

<div class="container-custom py-8 md:py-12">
  <!-- Header & Title -->
  <div class="mb-8">
    <h1 class="text-2xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
      {filters.search ? `Результаты поиска: "${filters.search}"` : 'Каталог запчастей'}
    </h1>
    <p class="text-gray-500">
      {#if isLoading}
        Загрузка товаров...
      {:else}
        Найдено {formatUtils.formatNumber(totalCount)} товаров
      {/if}
    </p>
  </div>

  <div class="flex flex-col lg:flex-row gap-8">
    <!-- Filters Sidebar -->
    <aside class="lg:w-72 flex-shrink-0">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-32">
        <CatalogFilters
          {brands}
          {warehouses}
          {filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </div>
    </aside>

    <!-- Products Grid -->
    <main class="flex-1 min-w-0">
      {#if isLoading}
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {#each Array(9) as _}
            <div class="h-[380px] bg-white rounded-2xl animate-pulse border border-gray-100"></div>
          {/each}
        </div>
      {:else if hasParts}
        <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          {#each parts as part}
            <PartCard {part} isPopular={part.isPopular || false} on:addToCart={handleAddToCart} />
          {/each}
        </div>

        <Pagination
          {currentPage}
          {totalPages}
          onPageChange={handlePageChange}
        />
      {:else}
        <!-- Empty State (Styled) -->
        <div class="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">Ничего не найдено</h3>
          <p class="text-gray-500 mb-8 max-w-md mx-auto">
            К сожалению, по вашему запросу товаров не найдено. Попробуйте изменить параметры поиска или сбросить фильтры.
          </p>
          
          <button onclick={handleClearFilters} class="btn-primary px-8 py-3">
            Сбросить все фильтры
          </button>
        </div>
      {/if}
    </main>
  </div>
</div>
