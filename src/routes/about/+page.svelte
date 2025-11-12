<script>
  import SeoHead from '$lib/components/SeoHead.svelte';
  
  const seoData = {
    title: 'О компании GoodDrive',
    description: 'GoodDrive - надежный поставщик автозапчастей в Челябинске. Работаем на рынке более 10 лет, предлагаем качественные запчасти с гарантией.',
    keywords: 'о компании, gooddrive, автозапчасти челябинск, о нас',
    image: '/images/about-og.jpg',
    type: 'website'
  };
  
  // JSON-LD для организации
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GoodDrive",
    "description": "Интернет-магазин автозапчастей",
    "url": "https://gooddrive.com",
    "logo": "https://gooddrive.com/images/logo.jpg",
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
    { name: 'Главная', url: 'https://gooddrive.com/' },
    { name: 'О компании', url: 'https://gooddrive.com/about' }
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

<div class="container-custom py-12">
  <!-- Хлебные крошки -->
  <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
    <a href="/" class="hover:text-primary-600 transition-colors">Главная</a>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
    <span class="text-gray-900 font-medium">О компании</span>
  </nav>

  <!-- Заголовок -->
  <div class="text-center mb-16">
    <h1 class="text-4xl md:text-5xl font-bold text-dark-500 mb-4">О компании GoodDrive</h1>
    <p class="text-xl text-gray-600 max-w-3xl mx-auto">
      Надежный партнер в мире автомобильных запчастей с 2014 года
    </p>
  </div>

  <!-- Наша история -->
  <section class="mb-16">
    <div class="card p-8">
      <h2 class="text-3xl font-bold text-dark-500 mb-6">Наша история</h2>
      <div class="prose prose-lg max-w-none text-gray-700">
        <p class="mb-4">
          <strong>GoodDrive</strong> - это современный интернет-магазин автозапчастей, который начал свою работу в 2014 году. 
          За время работы мы завоевали доверие тысяч автовладельцев благодаря качественному сервису и широкому ассортименту продукции.
        </p>
        <p class="mb-4">
          Мы специализируемся на поставках оригинальных и совместимых автозапчастей для всех марок автомобилей. 
          Наша команда профессионалов всегда готова помочь подобрать нужные детали и проконсультировать по любым вопросам.
        </p>
        <p>
          Сегодня GoodDrive - это не просто магазин, это полноценный сервис для автовладельцев, где можно не только купить запчасти, 
          но и получить профессиональную консультацию, помощь в подборе и быструю доставку.
        </p>
      </div>
    </div>
  </section>

  <!-- Наши преимущества -->
  <section class="mb-16">
    <h2 class="text-3xl font-bold text-dark-500 mb-8 text-center">Наши преимущества</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Качество</h3>
        <p class="text-gray-600">Все товары сертифицированы и проходят контроль качества</p>
      </div>

      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Скорость</h3>
        <p class="text-gray-600">Быстрая обработка и доставка заказов по всей России</p>
      </div>

      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Цены</h3>
        <p class="text-gray-600">Конкурентные цены благодаря прямым поставкам</p>
      </div>

      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Консультации</h3>
        <p class="text-gray-600">Профессиональная помощь в подборе запчастей</p>
      </div>

      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Ассортимент</h3>
        <p class="text-gray-600">Более 50 000 наименований автозапчастей</p>
      </div>

      <div class="card p-6">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <h3 class="text-xl font-bold text-dark-500 mb-2">Гарантия</h3>
        <p class="text-gray-600">Официальная гарантия на все товары</p>
      </div>
    </div>
  </section>

  <!-- Контакты -->
  <section class="card p-8">
    <h2 class="text-3xl font-bold text-dark-500 mb-6 text-center">Свяжитесь с нами</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="text-center">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
        </div>
        <h3 class="font-bold text-dark-500 mb-2">Телефон</h3>
        <a href="tel:+79227081553" class="text-primary-600 hover:text-primary-700">
          +7 (922) 708-15-53
        </a>
      </div>

      <div class="text-center">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h3 class="font-bold text-dark-500 mb-2">Email</h3>
        <a href="mailto:89227081553@mail.ru" class="text-primary-600 hover:text-primary-700">
          89227081553@mail.ru
        </a>
      </div>

      <div class="text-center">
        <div class="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <h3 class="font-bold text-dark-500 mb-2">Адрес</h3>
        <p class="text-gray-600">
          г. Челябинск<br/>
          ул. Артиллерийская, 15к2
        </p>
      </div>
    </div>
  </section>
</div>

