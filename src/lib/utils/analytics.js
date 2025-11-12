// Analytics utilities
export function initAnalytics(ymCounterId, ga4Id) {
  // Initialize Yandex.Metrika
  if (ymCounterId && typeof window !== 'undefined') {
    window.YM_COUNTER_ID = ymCounterId;
    
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(ymCounterId, "init", {
      clickmap:true,
      trackLinks:true,
      accurateTrackBounce:true,
      webvisor:true
    });
  }

  // Initialize Google Analytics 4
  if (ga4Id && typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ga4Id);
  }
}

export function trackEvent(category, action, label) {
  if (typeof window === 'undefined') return;
  
  // Проверяем согласие на аналитику
  const savedConsent = localStorage.getItem('cookie_consent');
  if (!savedConsent) return;
  
  try {
    const consent = JSON.parse(savedConsent);
    if (!consent.analytics) return;
  } catch (e) {
    return;
  }
  
  // Yandex.Metrika
  if (typeof window.ym !== 'undefined' && window.YM_COUNTER_ID) {
    window.ym(window.YM_COUNTER_ID, 'reachGoal', action, { category, label });
  }
  
  // Google Analytics
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
}

