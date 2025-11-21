<script>
  import { onMount, onDestroy } from 'svelte';
  import { cartUtils, ordersApi, formatUtils, validationUtils, addressApi } from '$lib/utils/api.js';
  
  // Реактивное состояние
  let cart = $state([]);
  let isLoading = $state(false);
  let isSubmitting = $state(false);
  let orderSuccess = $state(false);
  let orderData = $state(null);
  
  // Форма заказа
  let form = $state({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    notes: '',
    consent_pd: false
  });
  
  // Ошибки валидации
  let errors = $state({});

  // Подсказки городов и адресов
  let citySuggestions = $state([]);
  let isCityLoading = $state(false);
  let cityDropdownOpen = $state(false);
  let selectedCity = $state(null);
  let cityDebounceId = $state(null);
  let cityHelperMessage = $state('');
  
  let addressSuggestions = $state([]);
  let isAddressLoading = $state(false);
  let addressDropdownOpen = $state(false);
  let selectedAddress = $state(null);
  let addressDebounceId = $state(null);
  let addressHelperMessage = $state('');
  
  // Производные значения
  const totalItems = $derived(cart.reduce((total, item) => total + item.quantity, 0));
  const totalPrice = $derived(cart.reduce((total, item) => total + (item.price * item.quantity), 0));
  const isEmpty = $derived(cart.length === 0);
  
  // Загрузка корзины
  function loadCart() {
    cart = cartUtils.getCart();
  }

  function resetAddressSelection() {
    selectedAddress = null;
  }
  
  function resetCitySelection() {
    selectedCity = null;
    cityHelperMessage = '';
  }

  async function loadCitySuggestions(query) {
    if (!query || query.trim().length < 2) {
      citySuggestions = [];
      cityDropdownOpen = false;
      return;
    }
    
    isCityLoading = true;
    try {
      const response = await addressApi.suggest(query.trim(), { type: 'city' });
      if (response?.success) {
        citySuggestions = response.data || [];
        cityDropdownOpen = citySuggestions.length > 0;
        cityHelperMessage = citySuggestions.length === 0 ? 'Город не найден, попробуйте уточнить' : '';
      } else {
        citySuggestions = [];
        cityDropdownOpen = false;
        cityHelperMessage = response?.error || 'Не удалось получить подсказки городов';
      }
    } catch (error) {
      console.error('Ошибка загрузки подсказок города:', error);
      citySuggestions = [];
      cityDropdownOpen = false;
      cityHelperMessage = 'Не удалось получить подсказки городов';
    } finally {
      isCityLoading = false;
    }
  }
  
  function handleCityInput(event) {
    const value = event.target.value;
    form.delivery_city = value;
    cityHelperMessage = '';
    resetCitySelection();
    resetAddressSelection();
    form.delivery_address = '';
    addressSuggestions = [];
    addressDropdownOpen = false;
    
    if (cityDebounceId) {
      clearTimeout(cityDebounceId);
    }
    
    if (!value.trim() || value.trim().length < 2) {
      citySuggestions = [];
      cityDropdownOpen = false;
      return;
    }
    
    cityDebounceId = setTimeout(() => {
      loadCitySuggestions(value);
    }, 300);
  }
  
  function handleCityFocus() {
    if (citySuggestions.length > 0) {
      cityDropdownOpen = true;
    }
  }
  
  function handleCityBlur() {
    setTimeout(() => {
      cityDropdownOpen = false;
    }, 200);
  }
  
  function selectCity(suggestion) {
    selectedCity = suggestion;
    const cityName =
      suggestion.data?.city_with_type ||
      suggestion.data?.settlement_with_type ||
      suggestion.value;
    form.delivery_city = cityName;
    
    citySuggestions = [];
    cityDropdownOpen = false;
    cityHelperMessage = 'Город подтверждён';
    
    // Сбрасываем подтверждённый адрес, нужно выбрать заново
    resetAddressSelection();
    form.delivery_address = '';
    addressHelperMessage = 'Выберите адрес после подтверждения города';
  }
  
  async function loadAddressSuggestions(query) {
    if (!query || query.trim().length < 3) {
      addressSuggestions = [];
      addressDropdownOpen = false;
      return;
    }
    
    const cityContext =
      selectedCity?.data?.city_with_type ||
      selectedCity?.data?.settlement_with_type ||
      form.delivery_city;
    const cityFiasId =
      selectedCity?.data?.city_fias_id ||
      selectedCity?.data?.settlement_fias_id ||
      selectedCity?.data?.fias_id ||
      null;
    
    isAddressLoading = true;
    try {
      const response = await addressApi.suggest(query.trim(), {
        type: 'address',
        city: cityContext,
        cityId: cityFiasId
      });
      if (response?.success) {
        addressSuggestions = response.data || [];
        addressHelperMessage =
          addressSuggestions.length === 0
            ? (selectedCity ? 'Адрес не найден, попробуйте уточнить' : 'Выберите город, чтобы увидеть подсказки адреса')
            : '';
        addressDropdownOpen = addressSuggestions.length > 0;
      } else {
        addressSuggestions = [];
        addressDropdownOpen = false;
        addressHelperMessage = response?.error || 'Не удалось получить подсказки адресов';
      }
    } catch (error) {
      console.error('Ошибка загрузки подсказок адреса:', error);
      addressSuggestions = [];
      addressDropdownOpen = false;
      addressHelperMessage = 'Не удалось получить подсказки адресов';
    } finally {
      isAddressLoading = false;
    }
  }
  
  function handleAddressInput(event) {
    const value = event.target.value;
    form.delivery_address = value;
    addressHelperMessage = '';
    
    if (
      selectedAddress &&
      value.trim() !== (selectedAddress?.unrestricted_value || selectedAddress?.value || '').trim()
    ) {
      resetAddressSelection();
    }
    
    if (addressDebounceId) {
      clearTimeout(addressDebounceId);
    }
    
    if (!value.trim() || value.trim().length < 3) {
      addressSuggestions = [];
      addressDropdownOpen = false;
      return;
    }
    
    if (!form.delivery_city.trim()) {
      addressHelperMessage = 'Сначала укажите город доставки';
      addressSuggestions = [];
      addressDropdownOpen = false;
      return;
    }
    
    addressDebounceId = setTimeout(() => {
      loadAddressSuggestions(value);
    }, 300);
  }
  
  function handleAddressFocus() {
    if (addressSuggestions.length > 0) {
      addressDropdownOpen = true;
    }
  }
  
  function handleAddressBlur() {
    setTimeout(() => {
      addressDropdownOpen = false;
    }, 200);
  }
  
  function selectAddress(suggestion) {
    selectedAddress = suggestion;
    const fullAddress = suggestion.unrestricted_value || suggestion.value;
    form.delivery_address = fullAddress;
    
    const city =
      suggestion.data?.city_with_type ||
      suggestion.data?.settlement_with_type ||
      suggestion.data?.area_with_type ||
      suggestion.data?.region_with_type;
    if (city) {
      form.delivery_city = city;
    }

    if (!selectedCity && (suggestion.data?.city_with_type || suggestion.data?.settlement_with_type)) {
      selectedCity = {
        value: city,
        data: {
          city_with_type: suggestion.data?.city_with_type || suggestion.data?.settlement_with_type,
          city_fias_id: suggestion.data?.city_fias_id || suggestion.data?.settlement_fias_id
        }
      };
      cityHelperMessage = 'Город определён по адресу';
    }
    
    if (suggestion.data?.postal_code) {
      form.delivery_postal_code = suggestion.data.postal_code;
    }
    
    addressSuggestions = [];
    addressDropdownOpen = false;
    errors.delivery_address && delete errors.delivery_address;
    errors = { ...errors };
  }

  onDestroy(() => {
    if (cityDebounceId) {
      clearTimeout(cityDebounceId);
    }
    if (addressDebounceId) {
      clearTimeout(addressDebounceId);
    }
  });
  
  // Валидация формы
  function validateForm() {
    errors = {};
    let isValid = true;
    
    // Имя
    if (!form.customer_name.trim()) {
      errors.customer_name = 'Введите имя';
      isValid = false;
    }
    
    // Телефон - валидация как в форме консультации (11-12 цифр)
    if (!form.customer_phone.trim()) {
      errors.customer_phone = 'Введите номер телефона';
      isValid = false;
    } else {
      const cleanedPhone = form.customer_phone.trim().replace(/[\s\-\(\)]/g, '');
      const digitsOnly = cleanedPhone.replace(/\+/g, '');
      if (digitsOnly.length < 11 || digitsOnly.length > 12) {
        errors.customer_phone = 'Телефон должен содержать от 11 до 12 цифр';
        isValid = false;
      } else if (!validationUtils.isValidPhone(form.customer_phone)) {
        errors.customer_phone = 'Введите корректный номер телефона';
        isValid = false;
      }
    }
    
    // Email (необязательный)
    if (form.customer_email && !validationUtils.isValidEmail(form.customer_email)) {
      errors.customer_email = 'Введите корректный email';
      isValid = false;
    }
    
    // Адрес доставки
    if (!form.delivery_address.trim()) {
      errors.delivery_address = 'Введите адрес доставки';
      isValid = false;
    } else {
      const selectedValue = (selectedAddress?.unrestricted_value || selectedAddress?.value || '').trim();
      if (!selectedAddress || form.delivery_address.trim() !== selectedValue) {
        errors.delivery_address = 'Выберите адрес из подсказок, чтобы подтвердить его существование';
        isValid = false;
      }
    }
    
    // Город
    if (!form.delivery_city.trim()) {
      errors.delivery_city = 'Введите город';
      isValid = false;
    } else {
      const selectedCityValue = (selectedCity?.value || '').trim();
      if (!selectedCity || form.delivery_city.trim() !== selectedCityValue) {
        errors.delivery_city = 'Выберите город из подсказок, чтобы подтвердить его';
        isValid = false;
      }
    }
    
    // Согласие на обработку ПД
    if (!form.consent_pd) {
      errors.consent_pd = 'Необходимо дать согласие на обработку персональных данных';
      isValid = false;
    }
    
    return isValid;
  }
  
  // Обработка отправки формы
  async function handleSubmit(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Ранняя проверка согласия на обработку ПД - если нет, сразу выходим
    if (!form.consent_pd) {
      errors.consent_pd = 'Необходимо дать согласие на обработку персональных данных';
      // Прокручиваем к блоку с согласием
      const consentElement = document.getElementById('consent_pd');
      if (consentElement) {
        consentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        consentElement.focus();
      }
      return;
    }
    
    if (!validateForm()) {
      // Если валидация не прошла, прокручиваем к первой ошибке
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Подготавливаем данные заказа
      // Очищаем телефон от форматирования (оставляем только цифры и +)
      const cleanedPhone = form.customer_phone.trim().replace(/[\s\-\(\)]/g, '');
      
      const orderPayload = {
        customerName: form.customer_name.trim(),
        customerPhone: cleanedPhone,
        customerEmail: form.customer_email.trim() || undefined,
        deliveryAddress: form.delivery_address.trim(),
        deliveryCity: form.delivery_city.trim(),
        deliveryPostalCode: form.delivery_postal_code.trim() || undefined,
        notes: form.notes.trim() || undefined,
        consentPd: form.consent_pd, // Обязательно отправляем согласие на обработку ПД
        items: cart.map(item => ({
          partId: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        }))
      };
      
      // Отправляем заказ
      const response = await ordersApi.createOrder(orderPayload);
      
      // Сохраняем данные заказа
      if (response.success && response.data) {
        orderData = response.data;
      } else {
        orderData = response;
      }
      
      // Очищаем корзину
      cartUtils.clearCart();
      cart = [];
      
      // Показываем успех
      orderSuccess = true;
      
    } catch (error) {
      console.error('Ошибка создания заказа:', error);
      
      // Показываем ошибку
      if (error.message.includes('400')) {
        errors.general = 'Проверьте правильность заполнения формы';
      } else if (error.message.includes('500')) {
        errors.general = 'Произошла ошибка сервера. Попробуйте позже';
      } else {
        errors.general = 'Ошибка создания заказа. Попробуйте позже';
      }
    } finally {
      isSubmitting = false;
    }
  }
  
  // Инициализация
  onMount(() => {
    loadCart();
    
    // Если корзина пуста, перенаправляем
    if (isEmpty) {
      window.location.href = '/cart';
    }
  });
</script>

<svelte:head>
  <title>Оформление заказа - GoodDrive</title>
  <meta name="description" content="Оформление заказа автозапчастей в GoodDrive" />
</svelte:head>

{#if orderSuccess}
  <!-- Страница успешного заказа -->
  <div class="container-custom py-6 md:py-8">
    <div class="max-w-2xl mx-auto text-center">
      <div class="card p-6 md:p-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 class="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">Заказ успешно оформлен!</h1>
        <p class="text-sm md:text-base text-neutral-600 mb-4 md:mb-6">
          Ваш заказ #{orderData?.order_number || orderData?.orderNumber || 'N/A'} принят в обработку. 
          Мы свяжемся с вами в ближайшее время.
        </p>
        
        <div class="bg-neutral-50 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
          <h2 class="text-base md:text-lg font-semibold text-neutral-900 mb-3 md:mb-4">Детали заказа</h2>
          <div class="space-y-2 text-xs md:text-sm">
            <div class="flex justify-between">
              <span class="text-neutral-600">Номер заказа:</span>
              <span class="font-medium">{orderData?.order_number || orderData?.orderNumber || 'N/A'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-600">Сумма:</span>
              <span class="font-medium">{formatUtils.formatPrice(Number(orderData?.total_amount || orderData?.totalAmount || 0))}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-neutral-600">Статус:</span>
              <span class="font-medium text-green-600">Новый заказ</span>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <a href="/catalog" class="btn-primary">
            Продолжить покупки
          </a>
          <a href="/" class="btn-outline">
            На главную
          </a>
        </div>
      </div>
    </div>
  </div>
{:else}
  <!-- Форма оформления заказа -->
  <div class="container-custom py-6 md:py-8">
    <div class="max-w-6xl mx-auto">
      <!-- Заголовок -->
      <div class="mb-6 md:mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-neutral-900 mb-1.5">Оформление заказа</h1>
        <p class="text-sm md:text-base text-neutral-600">Заполните форму для завершения покупки</p>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <!-- Форма -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div 
          class="lg:col-span-2"
          onkeydown={(e) => {
            // Предотвращаем отправку формы через Enter, если галочка не проставлена
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !form.consent_pd) {
              e.preventDefault();
              errors.consent_pd = 'Необходимо дать согласие на обработку персональных данных';
              const consentElement = document.getElementById('consent_pd');
              if (consentElement) {
                consentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                consentElement.focus();
              }
              return false;
            }
          }}
          role="group"
          aria-label="Форма оформления заказа"
          tabindex="0"
        >
          <form 
            onsubmit={handleSubmit}
          >
            <div class="space-y-6 md:space-y-8">
            <!-- Контактная информация -->
            <div class="card p-4 md:p-6">
              <h2 class="text-lg md:text-xl font-semibold text-neutral-900 mb-4 md:mb-6">Контактная информация</h2>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="customer_name" class="block text-sm font-medium text-neutral-700 mb-2">
                    Имя <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    bind:value={form.customer_name}
                    class="input {errors.customer_name ? 'border-red-500' : ''}"
                    placeholder="Введите ваше имя"
                  />
                  {#if errors.customer_name}
                    <p class="text-red-500 text-sm mt-1">{errors.customer_name}</p>
                  {/if}
                </div>
                
                <div>
                  <label for="customer_phone" class="block text-sm font-medium text-neutral-700 mb-2">
                    Телефон <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    bind:value={form.customer_phone}
                    class="input {errors.customer_phone ? 'border-red-500' : ''}"
                    placeholder="+7 (XXX) XXX-XX-XX"
                  />
                  {#if errors.customer_phone}
                    <p class="text-red-500 text-sm mt-1">{errors.customer_phone}</p>
                  {/if}
                </div>
                
                <div class="md:col-span-2">
                  <label for="customer_email" class="block text-sm font-medium text-neutral-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    bind:value={form.customer_email}
                    class="input {errors.customer_email ? 'border-red-500' : ''}"
                    placeholder="your@email.com"
                  />
                  {#if errors.customer_email}
                    <p class="text-red-500 text-sm mt-1">{errors.customer_email}</p>
                  {/if}
                </div>
              </div>
            </div>
            
            <!-- Адрес доставки -->
            <div class="card p-4 md:p-6">
              <h2 class="text-lg md:text-xl font-semibold text-neutral-900 mb-4 md:mb-6">Адрес доставки</h2>
              
              <div class="space-y-6">
                <div>
                  <label for="delivery_city" class="block text-sm font-medium text-neutral-700 mb-2">
                    Город <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      type="text"
                      id="delivery_city"
                      bind:value={form.delivery_city}
                      oninput={handleCityInput}
                      onfocus={handleCityFocus}
                      onblur={handleCityBlur}
                      class="input pr-10 {errors.delivery_city ? 'border-red-500' : ''}"
                      placeholder="Начните вводить город"
                      autocomplete="address-level2"
                    />
                    {#if isCityLoading}
                      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg class="animate-spin h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    {/if}
                    
                    {#if selectedCity}
                      <p class="text-green-600 text-sm mt-1 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Город подтверждён
                      </p>
                    {:else if cityHelperMessage}
                      <p class="text-sm text-neutral-500 mt-1">{cityHelperMessage}</p>
                    {:else}
                      <p class="text-sm text-neutral-500 mt-1">Выберите город из подсказок для точного адреса</p>
                    {/if}
                    
                    {#if errors.delivery_city}
                      <p class="text-red-500 text-sm mt-1">{errors.delivery_city}</p>
                    {/if}
                    
                    {#if cityDropdownOpen}
                      <div class="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                        {#if citySuggestions.length === 0 && isCityLoading}
                          <div class="px-4 py-3 text-sm text-neutral-500">Загрузка подсказок...</div>
                        {:else if citySuggestions.length === 0}
                          <div class="px-4 py-3 text-sm text-neutral-500">
                            {cityHelperMessage || 'Город не найден. Попробуйте уточнить запрос'}
                          </div>
                        {:else}
                          {#each citySuggestions as suggestion}
                            <button
                              type="button"
                              onclick={() => selectCity(suggestion)}
                              class="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-neutral-100 last:border-b-0"
                            >
                              <p class="font-medium text-neutral-900">{suggestion.value}</p>
                              {#if suggestion.data?.region_with_type}
                                <p class="text-xs text-neutral-500">{suggestion.data.region_with_type}</p>
                              {/if}
                            </button>
                          {/each}
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
                
                <div>
                  <label for="delivery_address" class="block text-sm font-medium text-neutral-700 mb-2">
                    Адрес <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <input
                      type="text"
                      id="delivery_address"
                      bind:value={form.delivery_address}
                      oninput={handleAddressInput}
                      onfocus={handleAddressFocus}
                      onblur={handleAddressBlur}
                      class="input pr-10 {errors.delivery_address ? 'border-red-500' : ''}"
                      placeholder="Начните вводить адрес (Россия)"
                      autocomplete="street-address"
                      aria-autocomplete="list"
                      aria-expanded={addressDropdownOpen}
                    />
                    {#if isAddressLoading}
                      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg class="animate-spin h-4 w-4 text-primary-500" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    {/if}
                    
                    {#if selectedAddress}
                      <p class="text-green-600 text-sm mt-1 flex items-center">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Адрес подтверждён по базе ФИАС
                      </p>
                    {:else if addressHelperMessage}
                      <p class="text-sm text-neutral-500 mt-1">{addressHelperMessage}</p>
                    {:else}
                      <p class="text-sm text-neutral-500 mt-1">Выберите подсказку, чтобы подтвердить адрес</p>
                    {/if}
                    
                    {#if errors.delivery_address}
                      <p class="text-red-500 text-sm mt-1">{errors.delivery_address}</p>
                    {/if}
                    
                    {#if addressDropdownOpen}
                      <div class="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                        {#if addressSuggestions.length === 0 && isAddressLoading}
                          <div class="px-4 py-3 text-sm text-neutral-500">Загрузка подсказок...</div>
                        {:else if addressSuggestions.length === 0}
                          <div class="px-4 py-3 text-sm text-neutral-500">
                            {addressHelperMessage || 'Адрес не найден. Попробуйте уточнить запрос'}
                          </div>
                        {:else}
                          {#each addressSuggestions as suggestion}
                            <button
                              type="button"
                              onclick={() => selectAddress(suggestion)}
                              class="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-neutral-100 last:border-b-0"
                            >
                              <p class="font-medium text-neutral-900">{suggestion.value}</p>
                              <p class="text-xs text-neutral-500">
                                {(suggestion.data?.city_with_type || suggestion.data?.settlement_with_type || suggestion.data?.area_with_type || suggestion.data?.region_with_type) ?? 'Россия'}
                              </p>
                            </button>
                          {/each}
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
                
                <div>
                  <label for="delivery_postal_code" class="block text-sm font-medium text-neutral-700 mb-2">
                    Почтовый индекс
                  </label>
                  <input
                    type="text"
                    id="delivery_postal_code"
                    bind:value={form.delivery_postal_code}
                    class="input"
                    placeholder="123456"
                  />
                </div>
              </div>
            </div>
            
            <!-- Комментарии -->
            <div class="card p-4 md:p-6">
              <h2 class="text-lg md:text-xl font-semibold text-neutral-900 mb-4 md:mb-6">Дополнительно</h2>
              
              <div>
                <label for="notes" class="block text-sm font-medium text-neutral-700 mb-2">
                  Комментарии к заказу
                </label>
                <textarea
                  id="notes"
                  bind:value={form.notes}
                  class="input"
                  rows="4"
                  placeholder="Дополнительная информация о заказе..."
                ></textarea>
              </div>
            </div>
            
            <!-- Согласие на обработку персональных данных -->
            <div class="card p-4 md:p-6 {errors.consent_pd ? 'border-2 border-red-300' : ''}">
              <div class="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent_pd"
                  bind:checked={form.consent_pd}
                  onchange={() => {
                    // Убираем ошибку при изменении состояния чекбокса
                    if (form.consent_pd) {
                      if (errors.consent_pd) {
                        delete errors.consent_pd;
                        errors = { ...errors };
                      }
                    }
                  }}
                  class="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 {errors.consent_pd ? 'border-red-500' : ''}"
                  required
                />
                <label for="consent_pd" class="text-sm text-neutral-700 cursor-pointer">
                  Я даю согласие на обработку моих персональных данных в соответствии с 
                  <a href="/privacy" target="_blank" class="text-primary-600 hover:underline">Политикой конфиденциальности</a> 
                  и принимаю условия 
                  <a href="/terms" target="_blank" class="text-primary-600 hover:underline">Пользовательского соглашения</a>.
                  <span class="text-red-500">*</span>
                </label>
              </div>
              {#if errors.consent_pd}
                <p class="text-red-500 text-sm mt-2 ml-8 font-medium">{errors.consent_pd}</p>
              {/if}
            </div>
            
            <!-- Общая ошибка -->
            {#if errors.general}
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <p class="text-red-600">{errors.general}</p>
              </div>
            {/if}
            
            <!-- Кнопки -->
            <div class="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isSubmitting || !form.consent_pd || isEmpty}
                onclick={(e) => {
                  // Дополнительная проверка при клике
                  if (!form.consent_pd) {
                    e.preventDefault();
                    e.stopPropagation();
                    errors.consent_pd = 'Необходимо дать согласие на обработку персональных данных';
                    const consentElement = document.getElementById('consent_pd');
                    if (consentElement) {
                      consentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      consentElement.focus();
                    }
                    return false;
                  }
                }}
                class="flex-1 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed {form.consent_pd && !isEmpty ? 'btn-primary' : 'bg-gray-400 text-white hover:bg-gray-400 focus:ring-gray-500 cursor-not-allowed'}"
                aria-disabled={!form.consent_pd || isEmpty}
              >
                {isSubmitting ? 'Оформление заказа...' : 'Оформить заказ'}
              </button>
              <a href="/cart" class="btn-outline">
                Вернуться в корзину
              </a>
            </div>
            </div>
          </form>
        </div>
        
        <!-- Итоговая информация -->
        <div class="lg:col-span-1">
          <div class="card p-6 sticky top-24">
            <h2 class="text-xl font-semibold text-neutral-900 mb-6">Ваш заказ</h2>
            
            <!-- Список товаров -->
            <div class="space-y-4 mb-6">
              {#each cart as item}
                <div class="flex items-center space-x-3">
                  <div class="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {#if item.image}
                      <img 
                        src={item.image} 
                        alt={item.title}
                        class="w-full h-full object-cover rounded-lg"
                      />
                    {:else}
                      <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    {/if}
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-neutral-900 text-sm truncate">{item.title}</h3>
                    <p class="text-xs text-neutral-600">{item.brand}</p>
                    <p class="text-sm text-neutral-600">x{item.quantity}</p>
                  </div>
                  
                  <div class="text-sm font-medium text-neutral-900">
                    {formatUtils.formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              {/each}
            </div>
            
            <!-- Итого -->
            <div class="border-t border-neutral-200 pt-4">
              <div class="flex justify-between mb-2">
                <span class="text-neutral-600">Товары ({totalItems} шт.)</span>
                <span class="font-medium">{formatUtils.formatPrice(totalPrice)}</span>
              </div>
              
              <div class="flex justify-between mb-2">
                <span class="text-neutral-600">Доставка</span>
                <span class="font-medium text-green-600">Бесплатно</span>
              </div>
              
              <div class="border-t border-neutral-200 pt-2">
                <div class="flex justify-between">
                  <span class="text-lg font-semibold text-neutral-900">Общая сумма</span>
                  <span class="text-lg font-bold text-primary-500">{formatUtils.formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}


