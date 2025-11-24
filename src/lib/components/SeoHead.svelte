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
  // Поддерживаем как отдельные props, так и data объект
  let {
    title = '',
    description = '',
    keywords = '',
    image = '',
    type = 'website',
    product = null,
    breadcrumbs = [],
    jsonLd = null,
    data = null // Для обратной совместимости
  } = $props();
  
  // Если передан data объект, используем его значения
  const finalTitle = $derived(data?.title || title);
  const finalDescription = $derived(data?.description || description);
  const finalKeywords = $derived(data?.keywords || keywords);
  const finalImage = $derived(data?.image || image);
  const finalType = $derived(data?.type || type);
  const finalProduct = $derived(data?.product || product);
  const finalBreadcrumbs = $derived(data?.breadcrumbs || breadcrumbs);
  const finalJsonLd = $derived(data?.jsonLd || jsonLd);
  
  // Реактивное состояние
  let metaTags = $state([]);
  let canonicalUrl = $state('');
  
  // Производные значения
  let pageTitle = $derived(generatePageTitle(finalTitle));
  let pageDescription = $derived(finalDescription || generatePageDescription(finalType, { product: finalProduct }));
  let pageKeywords = $derived(finalKeywords || generateKeywords(finalType, { product: finalProduct }));
  
  // Обновление метатегов при изменении пропсов
  $effect(() => {
    // Используем browser location для определения base URL
    // В SSR это будет доступно через $env/static/public
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (import.meta.env.PUBLIC_SITE_URL || 'https://nikitintex.ru');
    const currentUrl = `${baseUrl}${$page.url.pathname}`;
    
    canonicalUrl = generateCanonicalUrl(baseUrl, $page.url.pathname);
    
    metaTags = generateMetaTags({
      title: pageTitle,
      description: pageDescription,
      keywords: pageKeywords,
      image: finalImage,
      url: currentUrl,
      type: finalType,
      product: finalProduct
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
  <!-- Yandex verification: используем env переменную или значение из файла yandex_256f12d3b93a3ebb.html -->
  <meta name="yandex-verification" content={import.meta.env.PUBLIC_YANDEX_VERIFICATION || '256f12d3b93a3ebb'} />
  <meta name="yandex" content="index, follow, noyaca" />
  
  <!-- Google Specific -->
  {#if import.meta.env.PUBLIC_GOOGLE_VERIFICATION}
    <meta name="google-site-verification" content={import.meta.env.PUBLIC_GOOGLE_VERIFICATION} />
  {/if}
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
  
  <!-- Mobile App Links (добавьте когда будет мобильное приложение) -->
  {#if import.meta.env.PUBLIC_APPLE_APP_ID}
    <meta name="apple-itunes-app" content="app-id={import.meta.env.PUBLIC_APPLE_APP_ID}" />
  {/if}
  {#if import.meta.env.PUBLIC_GOOGLE_PLAY_APP_ID}
    <meta name="google-play-app" content="app-id={import.meta.env.PUBLIC_GOOGLE_PLAY_APP_ID}" />
  {/if}
  
  <!-- JSON-LD структурированные данные -->
  {#if finalJsonLd}
    {@html `<script type="application/ld+json">${JSON.stringify(finalJsonLd)}</script>`}
  {/if}
  
  <!-- Хлебные крошки JSON-LD -->
  {#if finalBreadcrumbs && finalBreadcrumbs.length > 0}
    {@html `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": finalBreadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    })}</script>`}
  {/if}
  
  <!-- FAQ Schema (если есть FAQ на странице) -->
  {#if finalProduct && finalProduct.faq && finalProduct.faq.length > 0}
    {@html `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": finalProduct.faq.map(item => ({
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


