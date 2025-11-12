<script>
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import ScrollToTop from '$lib/components/ScrollToTop.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import CookieConsent from '$lib/components/CookieConsent.svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { initAnalytics } from '$lib/utils/analytics.js';
  
  let { children } = $props();
  const isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));
  
  onMount(() => {
    if (!browser) return;
    
    // Проверяем согласие на аналитику перед инициализацией
    function checkAndInitAnalytics() {
      const savedConsent = localStorage.getItem('cookie_consent');
      if (savedConsent) {
        try {
          const consent = JSON.parse(savedConsent);
          if (consent.analytics) {
            const YM_COUNTER_ID = '';
            const GA4_ID = '';
            
            if (YM_COUNTER_ID || GA4_ID) {
              initAnalytics(YM_COUNTER_ID, GA4_ID);
            }
          }
        } catch (e) {
          console.error('Error parsing cookie consent:', e);
        }
      }
    }
    
    // Проверяем сразу
    checkAndInitAnalytics();
    
    // Слушаем событие согласия на cookies
    window.addEventListener('cookieConsentGiven', (event) => {
      if (event.detail?.analytics) {
        const YM_COUNTER_ID = '';
        const GA4_ID = '';
        
        if (YM_COUNTER_ID || GA4_ID) {
          initAnalytics(YM_COUNTER_ID, GA4_ID);
        }
      }
    });
  });
  
  $effect(() => {
    if (browser) {
      // Проверяем согласие перед отправкой аналитики
      const savedConsent = localStorage.getItem('cookie_consent');
      if (!savedConsent) return;
      
      try {
        const consent = JSON.parse(savedConsent);
        if (!consent.analytics) return;
      } catch (e) {
        return;
      }
      
      const currentPath = $page.url.pathname;
      
      if (typeof window.ym !== 'undefined' && window.YM_COUNTER_ID) {
        window.ym(window.YM_COUNTER_ID, 'hit', currentPath, { title: document.title });
      }
      
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'page_view', { page_path: currentPath, page_title: document.title });
      }
    }
  });
</script>

{#if isAdminRoute}
  <!-- Админ-панель без основного header/footer -->
  {@render children()}
{:else}
  <!-- Обычный сайт с header/footer -->
  <div class="min-h-screen flex flex-col">
    <Header />
    
    <main class="flex-1">
      {@render children()}
    </main>
    
    <Footer />
    <ScrollToTop />
    <ToastContainer />
    <CookieConsent />
  </div>
{/if}

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  
  :global(body) {
    font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
  }
</style>

