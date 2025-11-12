// Утилиты для SEO и структурированных данных

/**
 * Генерирует JSON-LD разметку для товара
 */
export function generateProductJsonLd(product) {
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "description": product.description || `${product.title} от ${product.brand.name}`,
    "image": product.images?.map(img => img.image_url) || [],
    "brand": {
      "@type": "Brand",
      "name": product.brand.name,
      "url": product.brand.site || undefined
    },
    "offers": {
      "@type": "Offer",
      "price": product.price_opt,
      "priceCurrency": "RUB",
      "availability": product.available > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "GoodDrive"
      }
    },
    "sku": product.original_number || product.manufacturer_number,
    "mpn": product.manufacturer_number,
    "gtin": product.original_number
  };

  // Добавляем дополнительные поля если они есть
  if (product.warehouse) {
    jsonLd.offers.shippingDetails = {
      "@type": "OfferShippingDetails",
      "shippingDestination": {
        "@type": "Country",
        "name": "Russia"
      }
    };
  }

  return jsonLd;
}

/**
 * Генерирует JSON-LD разметку для организации
 */
export function generateOrganizationJsonLd() {
  // Используем environment variable для base URL
  // В browser это будет доступно через $env/static/public
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.PUBLIC_SITE_URL || 'https://gooddrive.com');
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GoodDrive",
    "description": "Интернет-магазин автозапчастей",
    "url": baseUrl,
    "logo": `${baseUrl}/logo.png`,
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+7 (922) 708-15-53",
      "contactType": "customer service",
      "availableLanguage": "Russian"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "RU",
      "addressLocality": "Челябинск",
      "streetAddress": "ул. Артиллерийская, дом 15, корпус 2"
    },
    "sameAs": [
      // Добавьте реальные ссылки на социальные сети когда будут готовы
      // "https://vk.com/gooddrive",
      // "https://t.me/gooddrive"
    ]
  };
}

/**
 * Генерирует JSON-LD разметку для хлебных крошек
 */
export function generateBreadcrumbJsonLd(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  };
}

/**
 * Генерирует JSON-LD разметку для коллекции товаров
 */
export function generateCollectionJsonLd(products, pageInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Каталог автозапчастей",
    "description": "Полный каталог автозапчастей от ведущих производителей",
    "url": pageInfo.url,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": pageInfo.totalCount,
      "itemListElement": products.map((product, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": product.title,
          "description": product.description,
          "image": product.main_image?.url,
          "brand": {
            "@type": "Brand",
            "name": product.brand_name
          },
          "offers": {
            "@type": "Offer",
            "price": product.price_opt,
            "priceCurrency": "RUB",
            "availability": product.available > 0 
              ? "https://schema.org/InStock" 
              : "https://schema.org/OutOfStock"
          }
        }
      }))
    }
  };
}

/**
 * Генерирует метатеги для страницы
 */
export function generateMetaTags(pageData) {
  const {
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    product = null
  } = pageData;

  const metaTags = [];

  // Основные метатеги
  metaTags.push({ name: 'title', content: title });
  metaTags.push({ name: 'description', content: description });
  
  if (keywords) {
    metaTags.push({ name: 'keywords', content: keywords });
  }

  // Open Graph
  metaTags.push({ property: 'og:title', content: title });
  metaTags.push({ property: 'og:description', content: description });
  metaTags.push({ property: 'og:type', content: type });
  metaTags.push({ property: 'og:url', content: url });
  
  if (image) {
    metaTags.push({ property: 'og:image', content: image });
    metaTags.push({ property: 'og:image:width', content: '1200' });
    metaTags.push({ property: 'og:image:height', content: '630' });
  }

  // Twitter Card
  metaTags.push({ name: 'twitter:card', content: 'summary_large_image' });
  metaTags.push({ name: 'twitter:title', content: title });
  metaTags.push({ name: 'twitter:description', content: description });
  
  if (image) {
    metaTags.push({ name: 'twitter:image', content: image });
  }

  // Дополнительные метатеги для товаров
  if (product) {
    metaTags.push({ property: 'product:price:amount', content: product.price_opt });
    metaTags.push({ property: 'product:price:currency', content: 'RUB' });
    metaTags.push({ 
      property: 'product:availability', 
      content: product.available > 0 ? 'in stock' : 'out of stock' 
    });
    metaTags.push({ property: 'product:brand', content: product.brand.name });
    
    if (product.original_number) {
      metaTags.push({ property: 'product:sku', content: product.original_number });
    }
  }

  return metaTags;
}

/**
 * Генерирует канонический URL
 */
export function generateCanonicalUrl(baseUrl, path = '') {
  return `${baseUrl}${path}`;
}

/**
 * Форматирует заголовок страницы
 */
export function formatPageTitle(title, siteName = 'GoodDrive') {
  if (title.includes(siteName)) {
    return title;
  }
  return `${title} - ${siteName}`;
}

/**
 * Генерирует заголовок страницы (алиас для formatPageTitle)
 */
export function generatePageTitle(title, siteName = 'GoodDrive') {
  return formatPageTitle(title, siteName);
}

/**
 * Генерирует описание страницы
 */
export function generatePageDescription(type, data = {}) {
  const descriptions = {
    home: 'Интернет-магазин автозапчастей GoodDrive. Широкий ассортимент качественных деталей для любых марок автомобилей. Быстрая доставка по всей России.',
    
    catalog: data.search 
      ? `Результаты поиска "${data.search}" в каталоге автозапчастей GoodDrive. Найдено ${data.count || 0} товаров.`
      : 'Каталог автозапчастей GoodDrive. Широкий ассортимент деталей от ведущих производителей. Фильтры по бренду, цене, наличию.',
    
    product: `${data.title} от ${data.brand} в GoodDrive. Цена: ${data.price} ₽. ${data.available > 0 ? 'В наличии' : 'Нет в наличии'}. Быстрая доставка.`,
    
    cart: 'Корзина покупок GoodDrive. Оформите заказ автозапчастей с быстрой доставкой по всей России.',
    
    checkout: 'Оформление заказа автозапчастей в GoodDrive. Удобная форма заказа с быстрой доставкой.',
    
    about: 'О компании GoodDrive - интернет-магазин автозапчастей. Надежный партнер в мире автомобильных деталей.',
    
    contact: 'Контакты GoodDrive. Свяжитесь с нами для получения консультации по автозапчастям и оформлению заказов.'
  };

  return descriptions[type] || descriptions.home;
}

/**
 * Генерирует ключевые слова для страницы
 */
export function generateKeywords(type, data = {}) {
  const baseKeywords = ['автозапчасти', 'GoodDrive', 'интернет-магазин', 'автомобильные детали'];
  
  const typeKeywords = {
    home: ['автозапчасти онлайн', 'каталог автозапчастей', 'доставка автозапчастей'],
    catalog: ['каталог', 'фильтры', 'поиск автозапчастей'],
    product: [data.brand?.toLowerCase(), data.title?.toLowerCase(), 'цена', 'купить'],
    cart: ['корзина', 'заказ', 'покупка'],
    checkout: ['оформление заказа', 'доставка', 'оплата'],
    about: ['о компании', 'история', 'преимущества'],
    contact: ['контакты', 'связь', 'поддержка']
  };

  const keywords = [...baseKeywords, ...(typeKeywords[type] || [])];
  
  // Добавляем специфичные ключевые слова из данных
  if (data.brand) {
    keywords.push(data.brand.toLowerCase());
  }
  
  if (data.search) {
    keywords.push(data.search.toLowerCase());
  }

  return keywords.filter(Boolean).join(', ');
}

/**
 * Валидирует URL для SEO
 */
export function validateSeoUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Генерирует robots.txt содержимое
 */
export function generateRobotsTxt(baseUrl) {
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and API
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /cart/`;
}

/**
 * Генерирует sitemap.xml содержимое
 */
export function generateSitemapXml(pages, baseUrl) {
  const urls = pages.map(page => {
    const url = {
      loc: `${baseUrl}${page.path}`,
      lastmod: page.lastmod || new Date().toISOString().split('T')[0],
      changefreq: page.changefreq || 'weekly',
      priority: page.priority || '0.8'
    };
    
    return url;
  });

  return {
    urls,
    baseUrl
  };
}


