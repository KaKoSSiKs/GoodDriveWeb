<script>
  import SeoHead from '$lib/components/SeoHead.svelte';
  
  const seoData = {
    title: 'О компании GoodDrive - Автозапчасти Челябинск',
    description: 'GoodDrive - надежный поставщик автозапчастей в Челябинске. Работаем на рынке более 10 лет, предлагаем качественные запчасти с гарантией. Доставка по Челябинску и России.',
    keywords: 'о компании gooddrive, автозапчасти челябинск, интернет магазин автозапчастей челябинск, о нас, доставка автозапчастей челябинск',
    image: '/images/about-og.jpg',
    type: 'website'
  };
  
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GoodDrive - Автозапчасти Челябинск",
    "alternateName": "GoodDrive",
    "description": "Интернет-магазин автозапчастей в Челябинске. Широкий ассортимент автозапчастей для всех марок автомобилей.",
    "url": "https://nikitintex.ru",
    "logo": "https://nikitintex.ru/images/logo.jpg",
    "foundingDate": "2014",
    "telephone": "+7-922-708-15-53",
    "email": "89227081553@mail.ru",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Артиллерийская, 15к2",
      "addressLocality": "Челябинск",
      "addressRegion": "Челябинская область",
      "postalCode": "454000",
      "addressCountry": "RU"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "55.187617",
      "longitude": "61.424401"
    }
  };
  
  const breadcrumbs = [
    { name: 'Главная', url: '/' },
    { name: 'О компании', url: '/about' }
  ];
</script>

<SeoHead
  title={seoData.title}
  description={seoData.description}
  keywords={seoData.keywords}
  image={seoData.image}
  type={seoData.type}
  breadcrumbs={breadcrumbs}
  jsonLd={organizationJsonLd}
/>

<div class="container-custom py-12 md:py-20">
  <!-- Header Section -->
  <div class="text-center max-w-4xl mx-auto mb-20">
    <span class="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 block">О нас</span>
    <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight leading-tight">
      Надежный партнер в мире<br>
      <span class="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">автомобильных запчастей</span>
    </h1>
    <p class="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
      С 2014 года мы помогаем автовладельцам находить качественные детали для своих автомобилей, обеспечивая безопасность и комфорт на дорогах.
    </p>
  </div>

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24">
    <div class="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">10+</div>
      <div class="text-sm text-gray-500 font-medium uppercase tracking-wide">лет на рынке</div>
    </div>
    <div class="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">50k+</div>
      <div class="text-sm text-gray-500 font-medium uppercase tracking-wide">товаров в каталоге</div>
    </div>
    <div class="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">15k+</div>
      <div class="text-sm text-gray-500 font-medium uppercase tracking-wide">довольных клиентов</div>
    </div>
    <div class="text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div class="text-4xl md:text-5xl font-bold text-gray-900 mb-2">24/7</div>
      <div class="text-sm text-gray-500 font-medium uppercase tracking-wide">прием заказов</div>
    </div>
  </div>

  <!-- Story & Mission -->
  <div class="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-24">
    <div class="space-y-6">
      <h2 class="text-3xl font-bold text-gray-900">Наша история</h2>
      <div class="prose prose-lg text-gray-600">
        <p>
          GoodDrive начал свой путь как небольшой магазин автозапчастей в Челябинске. Мы видели, как сложно автовладельцам найти качественные детали по честной цене, и решили это исправить.
        </p>
        <p>
          За годы работы мы выстроили прямые отношения с надежными поставщиками, оптимизировали логистику и создали удобный онлайн-каталог. Сегодня мы гордимся тем, что можем предложить нашим клиентам один из лучших сервисов в регионе.
        </p>
      </div>
    </div>
    <div class="relative h-[400px] rounded-3xl overflow-hidden bg-gray-100 shadow-lg group">
      <!-- Placeholder for image -->
      <div class="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center group-hover:scale-105 transition-transform duration-700">
        <svg class="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
        <p class="text-white font-medium">Наш склад в Челябинске</p>
      </div>
    </div>
  </div>

  <!-- Advantages -->
  <div class="mb-24">
    <h2 class="text-3xl font-bold text-center text-gray-900 mb-12">Почему выбирают нас</h2>
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Card 1 -->
      <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div class="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-3">Гарантия качества</h3>
        <p class="text-gray-600 leading-relaxed">
          Мы работаем только с проверенными поставщиками и предоставляем гарантию на все группы товаров.
        </p>
      </div>

      <!-- Card 2 -->
      <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div class="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-3">Быстрая доставка</h3>
        <p class="text-gray-600 leading-relaxed">
          Собственная логистическая служба позволяет доставлять заказы в кратчайшие сроки.
        </p>
      </div>

      <!-- Card 3 -->
      <div class="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
        <div class="w-14 h-14 bg-gray-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-3">Честные цены</h3>
        <p class="text-gray-600 leading-relaxed">
          Мы регулярно мониторим рынок, чтобы предложить вам лучшие цены на автозапчасти.
        </p>
      </div>
    </div>
  </div>

  <!-- Contact Banner -->
  <div class="bg-gray-900 rounded-3xl p-8 md:p-16 text-center md:text-left relative overflow-hidden">
    <!-- Decorative circles -->
    <div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-gray-500 opacity-10 rounded-full blur-3xl"></div>
    
    <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
      <div>
        <h2 class="text-3xl font-bold text-white mb-4">Остались вопросы?</h2>
        <p class="text-gray-400 text-lg max-w-xl">
          Наши специалисты всегда готовы помочь вам с подбором запчастей и ответить на любые вопросы.
        </p>
      </div>
      <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <a href="tel:+79227081553" class="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-colors">
          Позвонить нам
        </a>
        <a href="/#contacts" class="inline-flex items-center justify-center px-8 py-4 border border-gray-700 text-white rounded-full font-bold hover:bg-gray-800 transition-colors">
          Контакты
        </a>
      </div>
    </div>
  </div>
</div>
