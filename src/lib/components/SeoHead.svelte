<script>
  import { page } from '$app/stores';
  import { 
    generateMetaTags, 
    generatePageTitle, 
    generatePageDescription, 
    generateKeywords,
    generateCanonicalUrl 
  } from '$lib/utils/seo.js';
  
  // Пропсы компонента (Svelte 5 синтаксис)
  let {
    title = '',
    description = '',
    keywords = '',
    image = '',
    type = 'website',
    product = null,
    breadcrumbs = [],
    jsonLd = null
  } = $props();
  
  // Реактивное состояние
  let metaTags = $state([]);
  let canonicalUrl = $state('');
  
  // Производные значения
  let pageTitle = $derived(generatePageTitle(title));
  let pageDescription = $derived(description || generatePageDescription(type, { product }));
  let pageKeywords = $derived(keywords || generateKeywords(type, { product }));
  
  // Обновление метатегов при изменении пропсов
  $effect(() => {
    // Используем browser location для определения base URL
    // В SSR это будет доступно через $env/static/public
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (import.meta.env.PUBLIC_SITE_URL || 'https://gooddrive.com');
    const currentUrl = `${baseUrl}${$page.url.pathname}`;
    
    canonicalUrl = generateCanonicalUrl(baseUrl, $page.url.pathname);
    
    metaTags = generateMetaTags({
      title: pageTitle,
      description: pageDescription,
      keywords: pageKeywords,
      image: image,
      url: currentUrl,
      type: type,
      product: product
    });
  });
</script>

<svelte:head>
  <!-- Основные метатеги -->
  <title>{pageTitle}</title>
  <meta name="description" content={pageDescription} />
  <meta name="keywords" content={pageKeywords} />
  
  <!-- Канонический URL -->
  <link rel="canonical" href={canonicalUrl} />
  
  <!-- Динамические метатеги -->
  {#each metaTags as tag}
    {#if tag.property}
      <meta property={tag.property} content={tag.content} />
    {:else if tag.name}
      <meta name={tag.name} content={tag.content} />
    {/if}
  {/each}
  
  <!-- Дополнительные метатеги для SEO -->
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="GoodDrive" />
  <meta name="publisher" content="GoodDrive" />
  <meta name="copyright" content="© {new Date().getFullYear()} GoodDrive. Все права защищены." />
  <meta name="language" content="Russian" />
  
  <!-- Geo-targeting для локального SEO -->
  <meta name="geo.region" content="RU-CHE" />
  <meta name="geo.placename" content="Челябинск" />
  <meta name="geo.position" content="55.187617;61.424401" />
  <meta name="ICBM" content="55.187617, 61.424401" />
  
  <!-- Yandex Specific -->
  <meta name="yandex-verification" content="REPLACE_WITH_YANDEX_CODE" />
  <meta name="yandex" content="index, follow, noyaca" />
  
  <!-- Google Specific -->
  <meta name="google-site-verification" content="REPLACE_WITH_GOOGLE_CODE" />
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  
  <!-- Mobile App Links (если будет мобильное приложение) -->
  <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID" />
  <meta name="google-play-app" content="app-id=YOUR_APP_ID" />
  
  <!-- JSON-LD структурированные данные -->
  {#if jsonLd}
    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
  {/if}
  
  <!-- Хлебные крошки JSON-LD -->
  {#if breadcrumbs.length > 0}
    {@html `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    })}</script>`}
  {/if}
  
  <!-- FAQ Schema (если есть FAQ на странице) -->
  {#if product && product.faq && product.faq.length > 0}
    {@html `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": product.faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    })}</script>`}
  {/if}
</svelte:head>


