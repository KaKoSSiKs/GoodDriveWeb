<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { partsApi, brandsApi, cartUtils, helpRequestsApi, validationUtils } from '$lib/utils/api.js';
  import PartCard from '$lib/components/PartCard.svelte';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { generateOrganizationJsonLd } from '$lib/utils/seo.js';
  import { vehicleYears, vehicleBrands, getModelsByBrand, getModificationsByBrandAndModel } from '$lib/utils/vehicle-data';
  import { toastStore } from '$lib/stores/toast.js';

  // SEO данные
  const seoData = $state({
    title: 'GoodDrive - Премиальные автозапчасти | Качество и Надежность',
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
    toastStore.success(`Товар "${part.title}" добавлен в корзину`);
  }

  // Загрузка данных
  const MAX_PAGE_SIZE = 100;

  async function loadData() {
    try {
      loading = true;
      
      let popularPartIds = new Map();
      try {
        const productsStats = await fetch('/api/analytics/products?limit=100').then(r => r.json());
        if (productsStats.success && productsStats.topProducts && productsStats.topProducts.length > 0) {
          productsStats.topProducts.forEach((p, index) => {
            popularPartIds.set(p.partId, index + 1);
          });
        }
      } catch (error) {
        console.warn('Не удалось загрузить аналитику популярности:', error);
      }
      
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
        } catch (fallbackError) {
          console.error('Ошибка загрузки всех товаров:', fallbackError);
          allParts = [];
        }
      }
      
      if (allParts.length === 0) {
        featuredParts = [];
        loading = false;
        return;
      }
      
      allParts.sort((a, b) => {
        const aPopular = popularPartIds.get(a.id) || Infinity;
        const bPopular = popularPartIds.get(b.id) || Infinity;
        
        if (aPopular !== bPopular) {
          return aPopular - bPopular;
        }
        
        const aAvailable = Number(a.available) || 0;
        const bAvailable = Number(b.available) || 0;
        return bAvailable - aAvailable;
      });
      
      featuredParts = allParts.slice(0, 8).map(p => ({
        ...p,
        isPopular: popularPartIds.has(p.id)
      }));
      
      if (totalPartsCount) {
        stats.totalParts = totalPartsCount;
      } else {
        const partsResponse = await partsApi.getParts({
          page_size: 1
        });
        stats.totalParts = partsResponse.count;
      }

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

  function validatePhone(phone) {
    if (!phone || phone.trim() === '') return 'Телефон обязателен';
    const cleanedPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    const digitsOnly = cleanedPhone.replace(/\+/g, '');
    if (digitsOnly.length < 11 || digitsOnly.length > 12) return 'Телефон должен содержать от 11 до 12 цифр';
    return null;
  }

  function validateVin(vin) {
    if (!vin || vin.trim() === '') return null;
    const normalizedVin = vin.trim().toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
    if (normalizedVin.length !== 17) return 'Проверьте VIN-номер ещё раз. VIN должен содержать ровно 17 символов.';
    if (!/^[A-Z0-9]{17}$/.test(normalizedVin)) return 'Проверьте VIN-номер ещё раз. VIN должен содержать только буквы латиницы и цифры.';
    return null;
  }

  async function handleConsultationSubmit(event) {
    event.preventDefault();
    consultationErrors = {};
    consultationSuccess = false;
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

    if (consultationForm.vin && consultationForm.vin.trim() !== '') {
      const vinError = validateVin(consultationForm.vin);
      if (vinError) {
        consultationErrors.vin = vinError;
        isValid = false;
      }
    }
    
    if (!isValid) return;
    if (isConsultationSubmitting) return;
    
    isConsultationSubmitting = true;
    
    try {
      const cleanedPhone = consultationForm.phone.trim().replace(/[\s\-\(\)]/g, '');
      const normalizedVin = consultationForm.vin.trim().toUpperCase().replace(/\s/g, '') || null;
      
      const response = await helpRequestsApi.createHelpRequest({
        name: consultationForm.name.trim(),
        phone: cleanedPhone,
        vin: normalizedVin,
        message: consultationForm.message.trim() || null
      });
      
      if (response.success) {
        consultationSuccess = true;
        consultationForm = { vin: '', name: '', phone: '', message: '' };
        setTimeout(() => { consultationSuccess = false; }, 5000);
      } else {
        consultationErrors.general = response.error || 'Произошла ошибка при отправке заявки.';
      }
    } catch (error) {
      console.error('Ошибка отправки формы:', error);
      consultationErrors.general = 'Произошла ошибка при отправке заявки.';
    } finally {
      isConsultationSubmitting = false;
    }
  }

  function handleVehicleSearch() {
    if (!vehicleSelection.year || !vehicleSelection.brand) {
      alert('Пожалуйста, выберите год выпуска и марку автомобиля');
      return;
    }
    
    const params = new URLSearchParams();
    const searchTerms = [vehicleSelection.model, vehicleSelection.modification].filter(Boolean);
    if (searchTerms.length > 0) params.set('search', searchTerms.join(' '));
    else params.delete('search');
    
    params.set('vehicleBrand', vehicleSelection.brand);
    if (vehicleSelection.model) params.set('vehicleModel', vehicleSelection.model);
    if (vehicleSelection.modification) params.set('vehicleModification', vehicleSelection.modification);
    if (vehicleSelection.year) params.set('vehicleYear', vehicleSelection.year);
    
    goto(`/catalog?${params.toString()}`);
  }

  function handleBrandChange() {
    vehicleSelection.model = '';
    vehicleSelection.modification = '';
  }

  function handleModelChange() {
    vehicleSelection.modification = '';
  }

  function scrollToVehicleSelection() {
    const element = document.getElementById('vehicle-selection');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  let heroEl;
  function handleMouseMove(e) {
    if (!heroEl) return;
    const rect = heroEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    heroEl.style.setProperty('--x', `${x}px`);
    heroEl.style.setProperty('--y', `${y}px`);
  }

  function handleMouseEnter() {
    if (heroEl) heroEl.style.setProperty('--r', '400px');
  }

  function handleMouseLeave() {
    if (heroEl) heroEl.style.setProperty('--r', '0px');
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

<!-- Hero Section -->
<section 
  bind:this={heroEl}
  onmousemove={handleMouseMove}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  role="region"
  aria-label="Главный раздел"
  class="relative min-h-screen flex items-center overflow-hidden bg-[#F8F9FA] -mt-24 lg:-mt-28"
  style="--x: 50%; --y: 50%; --r: 0px;"
>
  <!-- Background Image Layer -->
  <div class="absolute inset-0 z-0">
    <!-- Base: Grayscale Image (Faded for text readability) -->
    <img 
      src="/images/img_car.jpg" 
      alt="Background" 
      class="absolute inset-0 w-full h-full object-cover grayscale opacity-30 transition-opacity duration-500"
    />
    
    <!-- Spotlight: Color Image Reveal -->
    <div 
      class="absolute inset-0 w-full h-full transition-[mask-size] duration-300"
      style="
        mask-image: radial-gradient(circle var(--r) at var(--x) var(--y), black 0%, transparent 100%);
        -webkit-mask-image: radial-gradient(circle var(--r) at var(--x) var(--y), black 0%, transparent 100%);
      "
    >
      <img 
        src="/images/img_car.jpg" 
        alt="Background Color" 
        class="absolute inset-0 w-full h-full object-cover opacity-90"
      />
    </div>
    
    <!-- Overlay Gradient to ensure text readability on left side -->
    <div class="absolute inset-0 bg-gradient-to-r from-[#F8F9FA] via-[#F8F9FA]/90 to-transparent"></div>
  </div>

  <div class="container-custom relative z-10 flex flex-col gap-10 py-24 lg:py-32">
    <!-- Content Grid -->
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <!-- Text Content -->
      <div class="text-center lg:text-left space-y-8 relative z-20">
        <div class="inline-block px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-gray-200 shadow-sm text-sm font-medium text-gray-600 mb-2">
          Новое поколение автозапчастей
        </div>
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1]">
          Превосходство <br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900">в каждой детали</span>
        </h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
          Мы объединяем технологии и качество, чтобы ваш автомобиль всегда был в идеальном состоянии. Оригинальные запчасти с быстрой доставкой.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
          <a href="/catalog" class="btn-primary px-8 py-4 text-base shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
            Перейти в каталог
          </a>
          <button onclick={scrollToVehicleSelection} class="btn-secondary px-8 py-4 text-base bg-white/80 hover:bg-white backdrop-blur">
            Подбор по авто
          </button>
        </div>
        
        <!-- Stats -->
        <div class="pt-8 flex items-center justify-center lg:justify-start gap-8 border-t border-gray-300/50 mt-8">
          <div>
            <p class="text-3xl font-bold text-gray-900">{stats.totalParts.toLocaleString()}+</p>
            <p class="text-sm text-gray-600 font-medium">Товаров в наличии</p>
          </div>
          <div class="w-px h-10 bg-gray-300"></div>
          <div>
            <p class="text-3xl font-bold text-gray-900">24/7</p>
            <p class="text-sm text-gray-600 font-medium">Поддержка</p>
          </div>
        </div>
      </div>

      <!-- Empty Right Column to let the image show through -->
      <div class="hidden lg:block"></div>
    </div>

    <!-- Vehicle Selection Block (Integrated) -->
    <div id="vehicle-selection" class="glass-panel rounded-3xl p-8 md:p-10 soft-3d-shadow w-full max-w-5xl mx-auto relative z-20 bg-white/80 backdrop-blur-xl border-white/40">
      <h2 class="text-2xl font-semibold text-gray-900 mb-6 text-center">Подбор запчастей по автомобилю</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div class="space-y-2">
          <label for="vehicle-year" class="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Год</label>
          <select id="vehicle-year" class="input bg-gray-50/50 border-gray-200 hover:bg-white focus:bg-white" bind:value={vehicleSelection.year}>
            <option value="">Выбрать год</option>
            {#each vehicleYears as year}
              <option value={year}>{year}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="vehicle-brand" class="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Марка</label>
          <select id="vehicle-brand" class="input bg-gray-50/50 border-gray-200 hover:bg-white focus:bg-white" bind:value={vehicleSelection.brand} onchange={handleBrandChange}>
            <option value="">Выбрать марку</option>
            {#each vehicleBrands as brand}
              <option value={brand}>{brand}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <label for="vehicle-model" class="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">Модель</label>
          <select id="vehicle-model" class="input bg-gray-50/50 border-gray-200 hover:bg-white focus:bg-white" bind:value={vehicleSelection.model} onchange={handleModelChange} disabled={!vehicleSelection.brand}>
            <option value="">{vehicleSelection.brand ? 'Выбрать модель' : '—'}</option>
            {#if vehicleSelection.brand}
              {#each availableModels as model}
                <option value={model}>{model}</option>
              {/each}
            {/if}
          </select>
        </div>

        <button class="btn-primary w-full h-[46px]" onclick={handleVehicleSearch}>
          Найти детали
        </button>
      </div>
      
      <div class="mt-4 text-center">
        <a href="/catalog" class="text-sm text-gray-500 hover:text-gray-900 underline decoration-gray-300 hover:decoration-gray-900 underline-offset-4 transition-all">
          Расширенный поиск в каталоге
        </a>
      </div>
    </div>
  </div>
</section>

<!-- Categories -->
<section class="section-padding bg-white">
  <div class="container-custom">
    <div class="flex flex-col md:flex-row justify-between items-end mb-12">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 mb-2">Категории</h2>
        <p class="text-gray-500">Основные направления нашего ассортимента</p>
      </div>
      <a href="/catalog" class="hidden md:flex items-center text-gray-900 font-medium hover:text-gray-600 transition-colors">
        Все категории 
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
      </a>
    </div>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <a href="/catalog?category=electronics" class="group relative h-64 rounded-2xl overflow-hidden bg-gray-50 hover:shadow-xl transition-all duration-500">
        <div class="absolute inset-0 p-6 z-10 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">Электроника</h3>
            <p class="text-sm text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">Датчики, свет, блоки</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
        </div>
        <div class="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-gray-200 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors duration-500"></div>
        <img src="/icons/electronics_ic.png" alt="" class="absolute right-4 bottom-4 w-24 h-24 object-contain opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 icon-primary" />
      </a>
      
      <a href="/catalog?category=engine" class="group relative h-64 rounded-2xl overflow-hidden bg-gray-50 hover:shadow-xl transition-all duration-500">
        <div class="absolute inset-0 p-6 z-10 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">Двигатель</h3>
            <p class="text-sm text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">Масла, фильтры, ГРМ</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
        </div>
        <div class="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-gray-200 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors duration-500"></div>
        <img src="/icons/engine_ic.png" alt="" class="absolute right-4 bottom-4 w-24 h-24 object-contain opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 icon-primary" />
      </a>
      
      <a href="/catalog?category=suspension" class="group relative h-64 rounded-2xl overflow-hidden bg-gray-50 hover:shadow-xl transition-all duration-500">
        <div class="absolute inset-0 p-6 z-10 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">Подвеска</h3>
            <p class="text-sm text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">Амортизаторы, рычаги</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
          </div>
        </div>
        <div class="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-gray-200 rounded-full blur-2xl group-hover:bg-green-100 transition-colors duration-500"></div>
        <img src="/icons/suspension_ic.png" alt="" class="absolute right-4 bottom-4 w-24 h-24 object-contain opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 icon-primary" />
      </a>
      
      <a href="/catalog?category=brakes" class="group relative h-64 rounded-2xl overflow-hidden bg-gray-50 hover:shadow-xl transition-all duration-500">
        <div class="absolute inset-0 p-6 z-10 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-gray-900">Тормоза</h3>
            <p class="text-sm text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">Колодки, диски</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <div class="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-gray-200 rounded-full blur-2xl group-hover:bg-red-100 transition-colors duration-500"></div>
        <img src="/icons/brake_ic.png" alt="" class="absolute right-4 bottom-4 w-24 h-24 object-contain opacity-20 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500 icon-primary" />
      </a>
    </div>
  </div>
</section>

<!-- Popular Products -->
<section class="section-padding bg-[#F8F9FA]">
  <div class="container-custom">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-gray-900 mb-3">Хиты продаж</h2>
      <p class="text-gray-500">Товары, которые выбирают чаще всего</p>
    </div>
    
    {#if loading}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        {#each Array(4) as _}
          <div class="card h-[350px] animate-pulse bg-white"></div>
        {/each}
      </div>
    {:else if featuredParts.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {#each featuredParts as part}
          <PartCard {part} isPopular={part.isPopular || false} on:addToCart={handleAddToCart} />
        {/each}
      </div>
      <div class="mt-12 text-center">
        <a href="/catalog" class="btn-outline px-8 py-3 rounded-full">
          Показать весь каталог
        </a>
      </div>
    {/if}
  </div>
</section>

<!-- Consultation -->
<section id="consultation" class="py-24 bg-[#111111] text-white relative overflow-hidden">
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
    <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-900 blur-[120px]"></div>
    <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900 blur-[120px]"></div>
  </div>
  
  <div class="container-custom relative z-10">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <h2 class="text-3xl md:text-4xl font-bold mb-6">Нужна помощь эксперта?</h2>
        <p class="text-gray-400 text-lg mb-8 leading-relaxed">
          Наши специалисты помогут подобрать идеальную запчасть для вашего автомобиля. Оставьте заявку, и мы свяжемся с вами в течение 10 минут.
        </p>
        
        <div class="space-y-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h4 class="font-semibold">Точный подбор</h4>
              <p class="text-sm text-gray-400">Проверка совместимости по VIN</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h4 class="font-semibold">Быстрый ответ</h4>
              <p class="text-sm text-gray-400">Среднее время ответа 5-10 минут</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8">
        {#if consultationSuccess}
          <div class="bg-green-500/20 border border-green-500/30 rounded-xl p-6 text-center">
            <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Заявка принята!</h3>
            <p class="text-gray-300">Мы свяжемся с вами в ближайшее время.</p>
          </div>
        {:else}
          <form onsubmit={handleConsultationSubmit} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="consultation-name" class="block text-sm font-medium text-gray-400 mb-1">Имя</label>
                <input id="consultation-name" type="text" class="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-white focus:border-white" bind:value={consultationForm.name} placeholder="Ваше имя" required />
              </div>
              <div>
                <label for="consultation-phone" class="block text-sm font-medium text-gray-400 mb-1">Телефон</label>
                <input id="consultation-phone" type="tel" class="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-white focus:border-white" bind:value={consultationForm.phone} placeholder="+7 (___) ___-__-__" required />
              </div>
            </div>
            
            <div>
              <label for="consultation-vin" class="block text-sm font-medium text-gray-400 mb-1">VIN (необязательно)</label>
              <input id="consultation-vin" type="text" class="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-white focus:border-white font-mono uppercase" bind:value={consultationForm.vin} placeholder="17 символов" maxlength="17" />
            </div>
            
            <div>
              <label for="consultation-message" class="block text-sm font-medium text-gray-400 mb-1">Сообщение</label>
              <textarea id="consultation-message" rows="3" class="w-full bg-gray-800 border-gray-700 text-white rounded-xl px-4 py-3 focus:ring-white focus:border-white resize-none" bind:value={consultationForm.message} placeholder="Опишите проблему..."></textarea>
            </div>
            
            <button type="submit" disabled={isConsultationSubmitting} class="w-full btn bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]">
              {isConsultationSubmitting ? 'Отправка...' : 'Получить консультацию'}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>
</section>

<!-- Contacts -->
<section id="contacts" class="section-padding bg-white">
  <div class="container-custom">
    <div class="grid lg:grid-cols-2 gap-12">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 mb-8">Наши контакты</h2>
        
        <div class="grid gap-6">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">Адрес</h3>
              <p class="text-gray-600 mt-1">г. Челябинск, ул. Артиллерийская, 15 к2</p>
            </div>
          </div>
          
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">Телефон</h3>
              <a href="tel:+79227081553" class="text-gray-600 hover:text-black mt-1 block transition-colors">+7 (922) 708-15-53</a>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-900">Режим работы</h3>
              <p class="text-gray-600 mt-1">Пн-Пт: 09:00 - 18:00<br>Сб: 10:00 - 16:00</p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="rounded-3xl overflow-hidden shadow-lg h-[400px] border border-gray-100 relative group">
        <iframe 
          src="https://yandex.ru/map-widget/v1/?ll=61.424401%2C55.187617&z=17&l=map&pt=61.424401,55.187617,pm2rdm" 
          width="100%" 
          height="100%" 
          frameborder="0" 
          allowfullscreen="true" 
          title="Карта"
          class="grayscale group-hover:grayscale-0 transition-all duration-700"
        ></iframe>
      </div>
    </div>
  </div>
</section>
