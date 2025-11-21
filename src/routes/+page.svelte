<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { partsApi, brandsApi, cartUtils, helpRequestsApi, validationUtils } from '$lib/utils/api.js';
  import PartCard from '$lib/components/PartCard.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { generateOrganizationJsonLd } from '$lib/utils/seo.js';
  import { vehicleYears, vehicleBrands, getModelsByBrand, getModificationsByBrandAndModel } from '$lib/utils/vehicle-data';

  // SEO данные
  const seoData = $state({
    title: 'GoodDrive - Интернет-магазин автозапчастей | Быстрая доставка по России',
    description: 'Магазин автозапчастей GoodDrive. Широкий ассортимент оригинальных и совместимых запчастей. Быстрая доставка, гарантия качества, консультации специалистов.',
    keywords: 'автозапчасти, запчасти для авто, интернет магазин запчастей, доставка запчастей, оригинальные запчасти',
    image: '/images/home-og.jpg',
    type: 'website'
  });

  // JSON-LD для организации
  const organizationJsonLd = generateOrganizationJsonLd();

  // Реактивное состояние
let featuredParts = $state([]);
  let loading = $state(true);
  let stats = $state({
    totalParts: 0,
    brands: 0,
    customers: 50000
  });
  let consultationForm = $state({
    vin: '',
    name: '',
    phone: '',
    message: ''
  });
  let consultationErrors = $state({});
  let isConsultationSubmitting = $state(false);
  let consultationSuccess = $state(false);
  let heroImageFailed = $state(false);
  
  // Состояние для подбора по автомобилю
  let vehicleSelection = $state({
    year: '',
    brand: '',
    model: '',
    modification: ''
  });
  
  // Вычисляемые значения для моделей и модификаций
  let availableModels = $derived(vehicleSelection.brand ? getModelsByBrand(vehicleSelection.brand) : []);
  let availableModifications = $derived(
    vehicleSelection.brand && vehicleSelection.model 
      ? getModificationsByBrandAndModel(vehicleSelection.brand, vehicleSelection.model)
      : []
  );
  
  function handleAddToCart(event) {
    const { part } = event.detail;
    cartUtils.addToCart(part);
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = `Добавлено в корзину: ${part.title}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }

  // Загрузка данных
  const MAX_PAGE_SIZE = 100;

  async function loadData() {
    try {
      loading = true;
      
      // Загружаем популярные товары из аналитики (опционально, не блокируем если не работает)
      let popularPartIds = new Map(); // Map для хранения порядка популярности
      try {
        const productsStats = await fetch('/api/analytics/products?limit=100').then(r => r.json());
        if (productsStats.success && productsStats.topProducts && productsStats.topProducts.length > 0) {
          productsStats.topProducts.forEach((p, index) => {
            popularPartIds.set(p.partId, index + 1); // Сохраняем порядок (1 = самый популярный)
          });
          console.log('Загружено популярных товаров:', popularPartIds.size);
        }
      } catch (error) {
        console.warn('Не удалось загрузить аналитику популярности (продолжаем без неё):', error);
      }
      
      // Загружаем товары в наличии, отсортированные по наличию (по убыванию)
      let allParts = [];
      let totalPartsCount = 0;
      try {
        const response = await partsApi.getParts({
          in_stock: true,
          ordering: '-available',
          page_size: MAX_PAGE_SIZE
        });
        allParts = response.results || [];
        totalPartsCount = response.count ?? allParts.length ?? 0;
        console.log('Загружено товаров в наличии:', allParts.length);
      } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        try {
          const response = await partsApi.getParts({
            ordering: '-available',
            page_size: MAX_PAGE_SIZE
          });
          const all = response.results || [];
          allParts = all.filter(p => (Number(p.available) || 0) > 0);
          totalPartsCount = response.count ?? allParts.length ?? 0;
          console.log('Загружено всех товаров (отфильтровано на клиенте):', allParts.length);
        } catch (fallbackError) {
          console.error('Ошибка загрузки всех товаров:', fallbackError);
          allParts = [];
        }
      }
      
      // Если нет товаров, выходим
      if (allParts.length === 0) {
        console.warn('Нет товаров в наличии');
        featuredParts = [];
        loading = false;
        return;
      }
      
      // Сортируем товары: сначала по популярности (если есть данные), затем по наличию
      allParts.sort((a, b) => {
        const aPopular = popularPartIds.get(a.id) || Infinity; // Если нет в топе, ставим в конец
        const bPopular = popularPartIds.get(b.id) || Infinity;
        
        // Сначала сортируем по популярности
        if (aPopular !== bPopular) {
          return aPopular - bPopular;
        }
        
        // Если популярность одинаковая, сортируем по наличию (больше = выше)
        const aAvailable = Number(a.available) || 0;
        const bAvailable = Number(b.available) || 0;
        return bAvailable - aAvailable;
      });
      
      // Берем топ 8 товаров
      featuredParts = allParts.slice(0, 8).map(p => ({
        ...p,
        isPopular: popularPartIds.has(p.id) // Флаг популярности для отображения "Хит продаж"
      }));
      
      console.log('Отображается товаров:', featuredParts.length);

      // Загружаем статистику товаров
      if (totalPartsCount) {
        stats.totalParts = totalPartsCount;
      } else {
        const partsResponse = await partsApi.getParts({
          page_size: 1
        });
        stats.totalParts = partsResponse.count;
      }

      // Загружаем статистику брендов
      const brandsResponse = await brandsApi.getBrands({
        page_size: 1
      });
      stats.brands = brandsResponse.count;
      
      loading = false;
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      loading = false;
    }
  }

  // Валидация телефона (11-12 цифр)
  function validatePhone(phone) {
    if (!phone || phone.trim() === '') {
      return 'Телефон обязателен';
    }
    
    // Нормализуем телефон: удаляем все кроме цифр и +
    const cleanedPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    const digitsOnly = cleanedPhone.replace(/\+/g, '');
    
    // Проверяем количество цифр (11-12)
    if (digitsOnly.length < 11 || digitsOnly.length > 12) {
      return 'Телефон должен содержать от 11 до 12 цифр';
    }
    
    return null;
  }

  // Валидация VIN-номера (ровно 17 символов, только буквы и цифры)
  function validateVin(vin) {
    if (!vin || vin.trim() === '') {
      return null; // VIN необязателен
    }
    
    const normalizedVin = vin.trim().toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
    
    // Проверяем длину (должно быть ровно 17 символов)
    if (normalizedVin.length !== 17) {
      return 'Проверьте VIN-номер ещё раз. VIN должен содержать ровно 17 символов.';
    }
    
    // Проверяем, что все символы - это буквы латиницы и цифры
    if (!/^[A-Z0-9]{17}$/.test(normalizedVin)) {
      return 'Проверьте VIN-номер ещё раз. VIN должен содержать только буквы латиницы и цифры.';
    }
    
    return null;
  }

  async function handleConsultationSubmit(event) {
    event.preventDefault();
    
    // Сбрасываем ошибки и состояние успеха
    consultationErrors = {};
    consultationSuccess = false;
    
    // Валидация
    let isValid = true;
    
    if (!consultationForm.name || consultationForm.name.trim() === '') {
      consultationErrors.name = 'Имя обязательно';
      isValid = false;
    }
    
    const phoneError = validatePhone(consultationForm.phone);
    if (phoneError) {
      consultationErrors.phone = phoneError;
      isValid = false;
    }
    
    if (consultationForm.message && consultationForm.message.length > 300) {
      consultationErrors.message = 'Комментарий не должен превышать 300 символов';
      isValid = false;
    }

    // Валидация VIN (если указан)
    if (consultationForm.vin && consultationForm.vin.trim() !== '') {
      const vinError = validateVin(consultationForm.vin);
      if (vinError) {
        consultationErrors.vin = vinError;
        isValid = false;
      }
    }
    
    if (!isValid) {
      return;
    }
    
    // Блокируем повторную отправку
    if (isConsultationSubmitting) {
      return;
    }
    
    isConsultationSubmitting = true;
    
    try {
      // Нормализуем телефон
      const cleanedPhone = consultationForm.phone.trim().replace(/[\s\-\(\)]/g, '');
      
      // Нормализуем VIN: преобразуем в верхний регистр и удаляем пробелы
      const normalizedVin = consultationForm.vin.trim().toUpperCase().replace(/\s/g, '') || null;
      
      // Отправляем запрос на сервер
      const response = await helpRequestsApi.createHelpRequest({
        name: consultationForm.name.trim(),
        phone: cleanedPhone,
        vin: normalizedVin,
        message: consultationForm.message.trim() || null
      });
      
      if (response.success) {
        // Успех
        consultationSuccess = true;
        
        // Очищаем форму
        consultationForm = {
          vin: '',
          name: '',
          phone: '',
          message: ''
        };
        
        // Показываем сообщение
        setTimeout(() => {
          consultationSuccess = false;
        }, 5000);
      } else {
        // Ошибка от сервера
        consultationErrors.general = response.error || 'Произошла ошибка при отправке заявки. Попробуйте позже.';
      }
    } catch (error) {
      console.error('Ошибка отправки формы консультации:', error);
      consultationErrors.general = 'Произошла ошибка при отправке заявки. Попробуйте позже или свяжитесь с нами по телефону.';
    } finally {
      isConsultationSubmitting = false;
    }
  }

  function goToCatalogWithFilter(filter) {
    goto(`/catalog?${filter}=`);
  }

  // Обработчик подбора по автомобилю
  function handleVehicleSearch() {
    if (!vehicleSelection.year || !vehicleSelection.brand) {
      alert('Пожалуйста, выберите год выпуска и марку автомобиля');
      return;
    }
    
    const params = new URLSearchParams();
    
    // Запрос по модели/модификации/году
    const searchTerms = [
      vehicleSelection.model,
      vehicleSelection.modification
    ].filter(Boolean);
    if (searchTerms.length > 0) {
      params.set('search', searchTerms.join(' '));
    } else {
      params.delete('search');
    }
    
    params.set('vehicleBrand', vehicleSelection.brand);
    if (vehicleSelection.model) params.set('vehicleModel', vehicleSelection.model);
    if (vehicleSelection.modification) params.set('vehicleModification', vehicleSelection.modification);
    if (vehicleSelection.year) params.set('vehicleYear', vehicleSelection.year);
    
    // Переходим в каталог с параметрами
    goto(`/catalog?${params.toString()}`);
  }

  // Обработчик изменения марки (сброс модели и модификации)
  function handleBrandChange() {
    vehicleSelection.model = '';
    vehicleSelection.modification = '';
  }

  // Обработчик изменения модели (сброс модификации)
  function handleModelChange() {
    vehicleSelection.modification = '';
  }

  onMount(() => {
    loadData();
  });
</script>

<SeoHead
  title={seoData.title}
  description={seoData.description}
  keywords={seoData.keywords}
  image={seoData.image}
  type={seoData.type}
  jsonLd={organizationJsonLd}
/>

<!-- Hero секция -->
<section class="relative bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden" style="min-height: 55vh; max-height: 85vh;">
  <!-- Декоративные элементы -->
  {#if !heroImageFailed}
    <img
      src="/images/img_car.jpg"
      alt="Быстрая доставка автозапчастей по всей России"
      class="absolute inset-0 w-full h-full object-cover object-center opacity-10"
      loading="eager"
      decoding="async"
      width="1920"
      height="1080"
      onerror={() => heroImageFailed = true}
      aria-hidden="true"
    />
  {/if}
  
  <div class="relative container-custom py-10 md:py-14 lg:py-16">
    <div class="max-w-4xl mx-auto text-center">
      <h1 class="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight text-gray-900">
        Автозапчасти
        <br>
        <span class="text-primary-700">для вашего автомобиля</span>
      </h1>
      <p class="text-sm sm:text-base md:text-lg mb-6 md:mb-8 text-gray-800 max-w-2xl mx-auto leading-relaxed">
        Широкий выбор оригинальных и совместимых запчастей от ведущих производителей. 
        Быстрая доставка по всей России. Консультации специалистов.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <a href="/catalog" class="btn-primary text-base sm:text-lg px-6 py-2.5">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Перейти в каталог
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Категории товаров -->
<section class="section-padding bg-white">
  <div class="container-custom">
    <h2 class="text-3xl font-semibold text-gray-900 mb-10 text-center">Категории запчастей</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      <a href="/catalog?category=electronics" class="card group hover:border-primary-300 hover:shadow-lg transition-all duration-200">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <img src="/icons/electronics_ic.png" alt="Электроника" class="w-10 h-10 object-contain icon-primary" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Электроника</h3>
          <p class="text-sm text-gray-700">Датчики, модули, провода</p>
        </div>
      </a>
      
      <a href="/catalog?category=engine" class="card group hover:border-primary-300 hover:shadow-lg transition-all duration-200">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <img src="/icons/engine_ic.png" alt="Двигатель" class="w-10 h-10 object-contain icon-primary" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Двигатель</h3>
          <p class="text-sm text-gray-700">Фильтры, масла, ремни</p>
        </div>
      </a>
      
      <a href="/catalog?category=suspension" class="card group hover:border-primary-300 hover:shadow-lg transition-all duration-200">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <img src="/icons/suspension_ic.png" alt="Подвеска" class="w-10 h-10 object-contain icon-primary" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Подвеска</h3>
          <p class="text-sm text-gray-700">Стойки, амортизаторы, пружины</p>
        </div>
      </a>
      
      <a href="/catalog?category=brakes" class="card group hover:border-primary-300 hover:shadow-lg transition-all duration-200">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <img src="/icons/brake_ic.png" alt="Тормоза" class="w-10 h-10 object-contain icon-primary" />
          </div>
          <h3 class="font-semibold text-gray-900 mb-2">Тормоза</h3>
          <p class="text-sm text-gray-700">Колодки, диски, суппорты</p>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- Популярные товары -->
<section class="section-padding bg-gray-50">
  <div class="container-custom">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 sm:mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-semibold text-gray-900 mb-1">Популярные товары</h2>
        <p class="text-sm md:text-base text-gray-800">Выбирают большинство покупателей</p>
      </div>
      <a href="/catalog" class="btn-outline text-sm md:text-base">
        Смотреть все
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
    
    {#if loading}
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 items-stretch">
        {#each Array(8) as _}
          <div class="card p-3 animate-pulse">
            <div class="aspect-square bg-gray-200 rounded-lg mb-2"></div>
            <div class="h-3 bg-gray-200 rounded mb-1.5"></div>
            <div class="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        {/each}
      </div>
    {:else if featuredParts.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 items-stretch">
        {#each featuredParts as part}
          <PartCard {part} isPopular={part.isPopular || false} on:addToCart={handleAddToCart} />
        {/each}
      </div>
    {/if}
  </div>
</section>

<!-- Онлайн-помощь специалиста -->
<section class="section-padding bg-gray-900">
  <div class="container-custom">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold mb-3 text-white">Онлайн-помощь специалиста</h2>
        <p class="text-lg text-gray-200">
          Более 10 специалистов прямо сейчас готовы вас проконсультировать
        </p>
        <p class="text-sm text-gray-300 mt-2">
          Примерное время ожидания ответа на Ваш запрос 3-10 минут
        </p>
      </div>

      {#if consultationSuccess}
        <div class="bg-green-500 text-white rounded-xl border border-green-600 p-6 mb-6">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <p class="font-medium">Ваша заявка отправлена. Специалист свяжется с вами в ближайшее время.</p>
          </div>
        </div>
      {/if}

      {#if consultationErrors.general}
        <div class="bg-red-500 text-white rounded-xl border border-red-600 p-6 mb-6">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="font-medium">{consultationErrors.general}</p>
          </div>
        </div>
      {/if}

      <form onsubmit={handleConsultationSubmit} class="bg-gray-800 rounded-xl border border-gray-700 p-8">
        <div class="mb-6">
          <label for="consultation-vin" class="block text-sm font-medium text-gray-200 mb-2">
            VIN-код вашего автомобиля (необязательно)
            <span class="text-gray-400 text-xs ml-1">(17 символов)</span>
          </label>
          <input
            id="consultation-vin"
            type="text"
            bind:value={consultationForm.vin}
            oninput={(e) => {
              // Автоматически преобразуем VIN в верхний регистр при вводе и удаляем недопустимые символы
              let value = e.target.value.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
              
              // Ограничиваем длину до 17 символов
              if (value.length > 17) {
                value = value.substring(0, 17);
              }
              
              consultationForm.vin = value;
              e.target.value = value;
              
              // Валидируем в реальном времени, если введено 17 символов
              if (value.length === 17) {
                const vinError = validateVin(value);
                if (vinError) {
                  consultationErrors = { ...consultationErrors, vin: vinError };
                } else {
                  // Очищаем ошибку VIN, если она была
                  const { vin, ...rest } = consultationErrors;
                  consultationErrors = rest;
                }
              } else if (value.length > 0 && value.length < 17) {
                // Очищаем ошибку VIN, пока вводим (если была)
                const { vin, ...rest } = consultationErrors;
                consultationErrors = rest;
              } else if (value.length === 0) {
                // Очищаем ошибку VIN, если поле пустое
                const { vin, ...rest } = consultationErrors;
                consultationErrors = rest;
              }
            }}
            onblur={() => {
              // Валидируем при потере фокуса, если VIN указан
              if (consultationForm.vin && consultationForm.vin.trim() !== '') {
                const vinError = validateVin(consultationForm.vin);
                if (vinError) {
                  consultationErrors.vin = vinError;
                }
              }
            }}
            placeholder="Например: WVWZZZ1KZAW123456"
            maxlength="17"
            class="block w-full px-4 py-3 border-2 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 bg-gray-700 text-white uppercase font-mono {consultationErrors.vin ? 'border-red-500' : 'border-gray-600 hover:border-gray-500'}"
          />
          {#if consultationErrors.vin}
            <p class="text-red-400 text-sm mt-1">{consultationErrors.vin}</p>
          {/if}
          {#if consultationForm.vin && !consultationErrors.vin}
            <p class="text-gray-400 text-xs mt-1">
              {consultationForm.vin.length}/17 символов
              {#if consultationForm.vin.length === 17}
                <span class="text-green-400 ml-1">✓</span>
              {/if}
            </p>
          {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label for="consultation-name" class="block text-sm font-medium text-gray-200 mb-2">
              Ваше имя <span class="text-red-400">*</span>
            </label>
            <input
              id="consultation-name"
              type="text"
              bind:value={consultationForm.name}
              placeholder="Иван"
              class="block w-full px-4 py-3 border-2 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 bg-gray-700 text-white {consultationErrors.name ? 'border-red-500' : 'border-gray-600 hover:border-gray-500'}"
              required
            />
            {#if consultationErrors.name}
              <p class="text-red-400 text-sm mt-1">{consultationErrors.name}</p>
            {/if}
          </div>
          <div>
            <label for="consultation-phone" class="block text-sm font-medium text-gray-200 mb-2">
              Телефон <span class="text-red-400">*</span>
            </label>
            <input
              id="consultation-phone"
              type="tel"
              bind:value={consultationForm.phone}
              placeholder="+7 (999) 123-45-67"
              class="block w-full px-4 py-3 border-2 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 bg-gray-700 text-white {consultationErrors.phone ? 'border-red-500' : 'border-gray-600 hover:border-gray-500'}"
              required
            />
            {#if consultationErrors.phone}
              <p class="text-red-400 text-sm mt-1">{consultationErrors.phone}</p>
            {/if}
            <p class="text-gray-400 text-xs mt-1">Введите от 11 до 12 цифр</p>
          </div>
        </div>

        <div class="mb-6">
          <label for="consultation-message" class="block text-sm font-medium text-gray-200 mb-2">
            Комментарий / сообщение (необязательно, до 300 символов)
          </label>
          <textarea
            id="consultation-message"
            bind:value={consultationForm.message}
            placeholder="Опишите ваш вопрос или проблему..."
            rows="4"
            maxlength="300"
            class="block w-full px-4 py-3 border-2 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 bg-gray-700 text-white resize-none {consultationErrors.message ? 'border-red-500' : 'border-gray-600 hover:border-gray-500'}"
          ></textarea>
          {#if consultationErrors.message}
            <p class="text-red-400 text-sm mt-1">{consultationErrors.message}</p>
          {/if}
          <p class="text-gray-400 text-xs mt-1">
            {consultationForm.message.length}/300 символов
          </p>
        </div>

        <button 
          type="submit" 
          disabled={isConsultationSubmitting}
          class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isConsultationSubmitting}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Отправка...
          {:else}
            <svg class="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Получить консультацию
          {/if}
        </button>
      </form>
    </div>
  </div>
</section>

<!-- Контакты и карта -->
<section id="contacts" class="section-padding bg-white">
  <div class="container-custom">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-semibold text-gray-900 mb-3">Контакты</h2>
      <p class="text-lg text-gray-800">Приезжайте к нам или свяжитесь удобным способом</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Информация о контактах -->
      <div class="space-y-6">
        <div class="card p-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 mb-2">Адрес магазина</h3>
              <p class="text-gray-800 text-sm">г. Челябинск</p>
              <p class="text-gray-800 text-sm">ул. Артиллерийская, дом 15, корпус 2</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 mb-2">Телефон</h3>
              <a href="tel:+79227081553" class="text-primary-700 hover:text-primary-800 font-medium text-sm">+7 (922) 708-15-53</a>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 mb-2">Время работы</h3>
              <p class="text-gray-800 text-sm">Пн-Пт: 09:00 - 18:00</p>
              <p class="text-gray-800 text-sm">Сб: 10:00 - 16:00</p>
              <p class="text-gray-700 font-medium text-sm">Вс: Выходной</p>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-base font-semibold text-gray-900 mb-2">Email</h3>
              <a href="mailto:89227081553@mail.ru" class="text-primary-700 hover:text-primary-800 font-medium text-sm">89227081553@mail.ru</a>
            </div>
          </div>
        </div>
      </div>

      <!-- Яндекс карта -->
      <div class="card overflow-hidden">
        <div class="relative w-full h-56 sm:h-64 md:h-[400px]">
          <iframe 
            src="https://yandex.ru/map-widget/v1/?ll=61.424401%2C55.187617&z=17&l=map&pt=61.424401,55.187617,pm2rdm" 
            width="100%" 
            height="100%" 
            frameborder="0" 
            allowfullscreen="true" 
            style="position:relative;"
            title="Карта расположения магазина GoodDrive"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Подбор по автомобилю -->
<section class="section-padding bg-white">
  <div class="container-custom">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-semibold text-gray-900 mb-3">Подбор по автомобилю</h2>
        <p class="text-lg text-gray-800">
          Найдите запчасти для вашего автомобиля за несколько минут
        </p>
      </div>

      <div class="card p-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="vehicle-year" class="block text-sm font-medium text-dark-500 mb-2">
              Год выпуска <span class="text-red-500">*</span>
            </label>
            <select 
              id="vehicle-year" 
              class="input"
              bind:value={vehicleSelection.year}
            >
              <option value="">Выберите год</option>
              {#each vehicleYears as year}
                <option value={year}>{year}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="vehicle-brand" class="block text-sm font-medium text-dark-500 mb-2">
              Марка <span class="text-red-500">*</span>
            </label>
            <select 
              id="vehicle-brand" 
              class="input"
              bind:value={vehicleSelection.brand}
              onchange={handleBrandChange}
            >
              <option value="">Выберите марку</option>
              {#each vehicleBrands as brand}
                <option value={brand}>{brand}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="vehicle-model" class="block text-sm font-medium text-dark-500 mb-2">
              Модель
            </label>
            <select 
              id="vehicle-model" 
              class="input"
              bind:value={vehicleSelection.model}
              onchange={handleModelChange}
              disabled={!vehicleSelection.brand}
            >
              <option value="">{vehicleSelection.brand ? 'Выберите модель' : 'Сначала выберите марку'}</option>
              {#if vehicleSelection.brand}
                {#each availableModels as model}
                  <option value={model}>{model}</option>
                {/each}
              {/if}
            </select>
          </div>

          <div>
            <label for="vehicle-modification" class="block text-sm font-medium text-dark-500 mb-2">
              Модификация
            </label>
            <select 
              id="vehicle-modification" 
              class="input"
              bind:value={vehicleSelection.modification}
              disabled={!vehicleSelection.model}
            >
              {#if !vehicleSelection.model}
                <option value="">Сначала выберите модель</option>
              {:else if availableModifications.length === 0}
                <option value="">Нет данных о модификациях</option>
              {:else}
                <option value="">Выберите модификацию (необязательно)</option>
                {#each availableModifications as modification}
                  <option value={modification}>{modification}</option>
                {/each}
              {/if}
            </select>
          </div>
        </div>

        <button 
          class="w-full btn-primary mt-6"
          onclick={handleVehicleSearch}
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Найти запчасти
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Почему выбирают нас -->
<section class="section-padding bg-gradient-to-br from-gray-50 to-white">
  <div class="container-custom">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-semibold text-gray-900 mb-3">Почему выбирают нас</h2>
        <p class="text-lg text-gray-800">
          Мы работаем, чтобы вы были довольны
        </p>
      </div>

      <!-- Статистика -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="card p-6 text-center group hover:border-primary-300 hover:shadow-lg transition-all">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <svg class="w-8 h-8 text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2 text-xl">Доступные цены</h3>
          <p class="text-gray-800 text-sm">
            Конкурентные цены на весь ассортимент. Работаем напрямую с поставщиками
          </p>
        </div>

        <div class="card p-6 text-center group hover:border-primary-300 hover:shadow-lg transition-all">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <svg class="w-8 h-8 text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2 text-xl">Быстрая доставка</h3>
          <p class="text-gray-800 text-sm">
            Доставляем заказы в кратчайшие сроки по всей России
          </p>
        </div>

        <div class="card p-6 text-center group hover:border-primary-300 hover:shadow-lg transition-all">
          <div class="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary-50 transition-colors">
            <svg class="w-8 h-8 text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="font-semibold text-gray-900 mb-2 text-xl">Гарантия качества</h3>
          <p class="text-gray-800 text-sm">
            Все товары сертифицированы и проходят проверку качества
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Отзывы клиентов с Яндекс.Карт -->
<section class="section-padding bg-gray-50">
  <div class="container-custom">
    <div class="text-center mb-10">
      <h2 class="text-3xl font-semibold text-gray-900 mb-3">Отзывы наших клиентов</h2>
      <p class="text-lg text-gray-800">
        Нам доверяют тысячи автовладельцев
      </p>
    </div>

    <!-- Виджет отзывов Яндекс.Карт -->
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div style="min-height:500px;">
        <iframe 
          src="https://yandex.ru/maps-reviews-widget/229678936575?comments" 
          style="width:100%;height:600px;border:none;display:block;"
          title="Отзывы клиентов на Яндекс.Картах"
        ></iframe>
      </div>
      <div class="p-6 bg-gray-50 border-t border-gray-200">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <p class="text-gray-600 flex items-center justify-center">
            <svg class="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Реальные отзывы с Яндекс.Карт
          </p>
          <a 
            href="https://yandex.ru/maps/56/chelyabinsk/?ll=61.424521%2C55.187700&mode=poi&poi%5Bpoint%5D=61.424401%2C55.187617&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D229678936575&tab=reviews&z=20" 
            target="_blank" 
            rel="noopener noreferrer"
            class="btn-outline text-sm flex items-center"
          >
            Посмотреть все отзывы
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <!-- Призыв к действию -->
    <div class="mt-8 text-center">
      <p class="text-gray-600 mb-4 text-lg">Оставьте свой отзыв о нашей работе</p>
      <a 
        href="https://yandex.ru/maps/56/chelyabinsk/?ll=61.424521%2C55.187700&mode=poi&poi%5Bpoint%5D=61.424401%2C55.187617&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D229678936575&tab=reviews&z=20" 
        target="_blank" 
        rel="noopener noreferrer"
        class="btn-primary inline-flex items-center justify-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Написать отзыв
      </a>
    </div>
  </div>
</section>