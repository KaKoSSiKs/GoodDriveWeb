<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let showBanner = $state(false);
  let showSettings = $state(false);
  
  // Состояние согласий
  let consentState = $state({
    necessary: true, // Всегда true, нельзя отключить
    analytics: false,
    functional: false
  });
  
  const COOKIE_CONSENT_KEY = 'cookie_consent';
  const COOKIE_CONSENT_DATE_KEY = 'cookie_consent_date';
  
  onMount(() => {
    if (!browser) return;
    
    // Проверяем, было ли уже дано согласие
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    const consentDate = localStorage.getItem(COOKIE_CONSENT_DATE_KEY);
    
    if (savedConsent) {
      try {
        consentState = JSON.parse(savedConsent);
        // Проверяем, не истек ли срок согласия (например, через год)
        if (consentDate) {
          const date = new Date(consentDate);
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          if (date < oneYearAgo) {
            // Согласие истекло, показываем баннер снова
            showBanner = true;
          }
        }
      } catch (e) {
        console.error('Error parsing cookie consent:', e);
        showBanner = true;
      }
    } else {
      // Согласие не было дано, показываем баннер
      showBanner = true;
    }
  });
  
  function acceptAll() {
    consentState.analytics = true;
    consentState.functional = true;
    saveConsent();
    showBanner = false;
    applyConsent();
  }
  
  function acceptNecessary() {
    consentState.analytics = false;
    consentState.functional = false;
    saveConsent();
    showBanner = false;
    applyConsent();
  }
  
  function saveConsent() {
    if (!browser) return;
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentState));
    localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString());
  }
  
  function saveSettings() {
    saveConsent();
    showSettings = false;
    showBanner = false;
    applyConsent();
  }
  
  function applyConsent() {
    if (!browser) return;
    
    // Отправляем событие для инициализации аналитики, если согласие дано
    if (consentState.analytics) {
      // Инициализируем аналитику только если согласие дано
      const event = new CustomEvent('cookieConsentGiven', { 
        detail: { analytics: true } 
      });
      window.dispatchEvent(event);
    }
  }
  
  function openSettings() {
    showSettings = true;
    showBanner = false;
  }
  
  function closeSettings() {
    showSettings = false;
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
      showBanner = true;
    }
  }
</script>

{#if showBanner}
  <!-- Баннер согласия на cookies -->
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:p-6">
    <div class="container-custom">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Использование файлов cookies</h3>
          <p class="text-sm text-gray-600">
            Мы используем файлы cookies для улучшения работы сайта, персонализации контента и проведения аналитики. 
            Продолжая использовать сайт, Вы соглашаетесь с использованием cookies в соответствии с нашей 
            <a href="/privacy" target="_blank" class="text-primary-600 hover:underline">Политикой конфиденциальности</a>.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onclick={openSettings}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Настройки
          </button>
          <button
            onclick={acceptNecessary}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Только необходимое
          </button>
          <button
            onclick={acceptAll}
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Принять все
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showSettings}
  <!-- Модальное окно настроек cookies -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Настройки cookies</h2>
          <button
            onclick={closeSettings}
            class="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрыть"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-6 mb-6">
          <p class="text-gray-600">
            Вы можете выбрать, какие типы cookies разрешить. Необходимые cookies всегда включены, 
            так как они обеспечивают базовую функциональность сайта.
          </p>
          
          <!-- Необходимые cookies -->
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="font-semibold text-gray-900">Необходимые cookies</h3>
                <p class="text-sm text-gray-600">Обеспечивают базовую функциональность сайта</p>
              </div>
              <input
                type="checkbox"
                checked={consentState.necessary}
                disabled
                class="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Эти cookies необходимы для работы сайта и не могут быть отключены.
            </p>
          </div>
          
          <!-- Аналитические cookies -->
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="font-semibold text-gray-900">Аналитические cookies</h3>
                <p class="text-sm text-gray-600">Помогают анализировать использование сайта (Yandex.Metrika, Google Analytics)</p>
              </div>
              <input
                type="checkbox"
                bind:checked={consentState.analytics}
                class="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Эти cookies помогают нам понять, как посетители взаимодействуют с сайтом.
            </p>
          </div>
          
          <!-- Функциональные cookies -->
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="font-semibold text-gray-900">Функциональные cookies</h3>
                <p class="text-sm text-gray-600">Сохраняют настройки и предпочтения пользователя</p>
              </div>
              <input
                type="checkbox"
                bind:checked={consentState.functional}
                class="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
            </div>
            <p class="text-xs text-gray-500 mt-2">
              Эти cookies позволяют сайту запоминать ваши настройки и предпочтения.
            </p>
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3">
          <button
            onclick={saveSettings}
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Сохранить настройки
          </button>
          <button
            onclick={closeSettings}
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin-bottom: 0;
  }
</style>

