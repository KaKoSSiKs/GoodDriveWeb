<script>
  import { onMount, onDestroy } from 'svelte';
  import { cartUtils, ordersApi, formatUtils, validationUtils, addressApi, imageUtils } from '$lib/utils/api.js';
  import SeoHead from '$lib/components/SeoHead.svelte';
  import { toastStore } from '$lib/stores/toast.js';

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
  
  let errors = $state({});
  
  // Подсказки
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

  const seoData = {
    title: 'Оформление заказа | GoodDrive',
    description: 'Безопасное оформление заказа автозапчастей с доставкой.',
    type: 'website'
  };

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
        cityHelperMessage = citySuggestions.length === 0 ? 'Город не найден' : '';
      } else {
        citySuggestions = [];
        cityDropdownOpen = false;
      }
    } catch (error) {
      console.error('City suggest error:', error);
      citySuggestions = [];
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
    
    if (cityDebounceId) clearTimeout(cityDebounceId);
    
    if (!value.trim() || value.trim().length < 2) {
      citySuggestions = [];
      cityDropdownOpen = false;
      return;
    }
    
    cityDebounceId = setTimeout(() => loadCitySuggestions(value), 300);
  }
  
  function selectCity(suggestion) {
    selectedCity = suggestion;
    const cityName = suggestion.data?.city_with_type || suggestion.data?.settlement_with_type || suggestion.value;
    form.delivery_city = cityName;
    
    citySuggestions = [];
    cityDropdownOpen = false;
    cityHelperMessage = 'Город подтверждён';
    
    resetAddressSelection();
    form.delivery_address = '';
    addressHelperMessage = 'Теперь введите адрес';
  }

  async function loadAddressSuggestions(query) {
    if (!query || query.trim().length < 3) {
      addressSuggestions = [];
      addressDropdownOpen = false;
      return;
    }
    
    const cityContext = selectedCity?.data?.city_with_type || selectedCity?.data?.settlement_with_type || form.delivery_city;
    const cityFiasId = selectedCity?.data?.city_fias_id || selectedCity?.data?.settlement_fias_id || selectedCity?.data?.fias_id || null;
    
    isAddressLoading = true;
    try {
      const response = await addressApi.suggest(query.trim(), {
        type: 'address',
        city: cityContext,
        cityId: cityFiasId
      });
      if (response?.success) {
        addressSuggestions = response.data || [];
        addressDropdownOpen = addressSuggestions.length > 0;
      } else {
        addressSuggestions = [];
        addressDropdownOpen = false;
      }
    } catch (error) {
      console.error('Address suggest error:', error);
      addressSuggestions = [];
    } finally {
      isAddressLoading = false;
    }
  }
  
  function handleAddressInput(event) {
    const value = event.target.value;
    form.delivery_address = value;
    addressHelperMessage = '';
    
    if (selectedAddress && value.trim() !== (selectedAddress?.unrestricted_value || selectedAddress?.value || '').trim()) {
      resetAddressSelection();
    }
    
    if (addressDebounceId) clearTimeout(addressDebounceId);
    
    if (!value.trim() || value.trim().length < 3) {
      addressSuggestions = [];
      addressDropdownOpen = false;
      return;
    }
    
    if (!form.delivery_city.trim()) {
      addressHelperMessage = 'Сначала укажите город';
      return;
    }
    
    addressDebounceId = setTimeout(() => loadAddressSuggestions(value), 300);
  }
  
  function selectAddress(suggestion) {
    selectedAddress = suggestion;
    form.delivery_address = suggestion.unrestricted_value || suggestion.value;
    
    const city = suggestion.data?.city_with_type || suggestion.data?.settlement_with_type || suggestion.data?.area_with_type || suggestion.data?.region_with_type;
    if (city) form.delivery_city = city;

    if (suggestion.data?.postal_code) {
      form.delivery_postal_code = suggestion.data.postal_code;
    }
    
    addressSuggestions = [];
    addressDropdownOpen = false;
    errors.delivery_address && delete errors.delivery_address;
    errors = { ...errors };
  }
  
  function validateForm() {
    errors = {};
    let isValid = true;
    
    if (!form.customer_name.trim()) {
      errors.customer_name = 'Введите имя';
      isValid = false;
    }
    
    if (!form.customer_phone.trim()) {
      errors.customer_phone = 'Введите телефон';
      isValid = false;
    } else {
      const cleanedPhone = form.customer_phone.trim().replace(/[\s\-\(\)]/g, '');
      if (cleanedPhone.length < 10) {
        errors.customer_phone = 'Некорректный телефон';
        isValid = false;
      }
    }
    
    if (!form.delivery_address.trim()) {
      errors.delivery_address = 'Введите адрес';
      isValid = false;
    }
    
    if (!form.delivery_city.trim()) {
      errors.delivery_city = 'Введите город';
      isValid = false;
    }
    
    if (!form.consent_pd) {
      errors.consent_pd = 'Требуется согласие';
      isValid = false;
    }
    
    return isValid;
  }
  
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (!form.consent_pd) {
      toastStore.error('Необходимо согласие на обработку данных');
      return;
    }
    
    if (!validateForm()) {
      toastStore.error('Пожалуйста, проверьте правильность заполнения формы');
      return;
    }
    
    isSubmitting = true;
    
    try {
      const cleanedPhone = form.customer_phone.trim().replace(/[\s\-\(\)]/g, '');
      const orderPayload = {
        customerName: form.customer_name.trim(),
        customerPhone: cleanedPhone,
        customerEmail: form.customer_email.trim() || undefined,
        deliveryAddress: form.delivery_address.trim(),
        deliveryCity: form.delivery_city.trim(),
        deliveryPostalCode: form.delivery_postal_code.trim() || undefined,
        notes: form.notes.trim() || undefined,
        consentPd: form.consent_pd,
        items: cart.map(item => ({
          partId: item.id,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        }))
      };
      
      const response = await ordersApi.createOrder(orderPayload);
      
      if (response.success && response.data) {
        orderData = response.data;
      } else {
        orderData = response;
      }
      
      cartUtils.clearCart();
      cart = [];
      orderSuccess = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (error) {
      console.error('Order creation error:', error);
      toastStore.error('Ошибка создания заказа. Попробуйте позже.');
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    loadCart();
    if (isEmpty && !orderSuccess) {
      // window.location.href = '/cart'; // Redirect logic can be handled cleaner
    }
  });
  
  onDestroy(() => {
    if (cityDebounceId) clearTimeout(cityDebounceId);
    if (addressDebounceId) clearTimeout(addressDebounceId);
  });
</script>

<SeoHead data={seoData} />

<div class="container-custom py-8 md:py-12">
  {#if orderSuccess}
    <div class="max-w-2xl mx-auto text-center py-12">
      <div class="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
        <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      
      <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Заказ успешно оформлен!</h1>
      <p class="text-gray-500 text-lg mb-8">
        Ваш заказ <span class="font-bold text-gray-900">#{orderData?.order_number || orderData?.orderNumber || 'N/A'}</span> принят.
        <br>Менеджер свяжется с вами в ближайшее время.
      </p>
      
      <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8 text-left max-w-md mx-auto">
        <div class="flex justify-between mb-2">
          <span class="text-gray-500">Сумма заказа</span>
          <span class="font-bold text-gray-900">{formatUtils.formatPrice(Number(orderData?.total_amount || orderData?.totalAmount || 0))}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Статус</span>
          <span class="text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-md text-sm">Новый</span>
        </div>
      </div>
      
      <div class="flex gap-4 justify-center">
        <a href="/catalog" class="btn-primary px-8">В каталог</a>
        <a href="/" class="btn-outline px-8">На главную</a>
      </div>
    </div>
  {:else}
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">Оформление заказа</h1>
      
      <div class="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <form onsubmit={handleSubmit} class="space-y-8">
          <!-- Contact Info -->
          <section class="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">1</span>
              Контактные данные
            </h2>
            
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <label for="customer_name" class="block text-sm font-medium text-gray-700 mb-2">Имя <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="customer_name"
                  bind:value={form.customer_name}
                  class="input {errors.customer_name ? 'border-red-300 ring-red-100' : ''}"
                  placeholder="Иван Иванов"
                />
                {#if errors.customer_name}<p class="mt-1 text-sm text-red-500">{errors.customer_name}</p>{/if}
              </div>
              
              <div>
                <label for="customer_phone" class="block text-sm font-medium text-gray-700 mb-2">Телефон <span class="text-red-500">*</span></label>
                <input
                  type="tel"
                  id="customer_phone"
                  bind:value={form.customer_phone}
                  class="input {errors.customer_phone ? 'border-red-300 ring-red-100' : ''}"
                  placeholder="+7 (999) 000-00-00"
                />
                {#if errors.customer_phone}<p class="mt-1 text-sm text-red-500">{errors.customer_phone}</p>{/if}
              </div>

              <div class="md:col-span-2">
                <label for="customer_email" class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="customer_email"
                  bind:value={form.customer_email}
                  class="input"
                  placeholder="example@mail.ru"
                />
              </div>
            </div>
          </section>

          <!-- Delivery Info -->
          <section class="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
            <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span class="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm">2</span>
              Доставка
            </h2>
            
            <div class="space-y-6">
              <!-- City -->
              <div class="relative">
                <label for="delivery_city" class="block text-sm font-medium text-gray-700 mb-2">Город <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="delivery_city"
                  bind:value={form.delivery_city}
                  oninput={handleCityInput}
                  class="input {errors.delivery_city ? 'border-red-300' : ''}"
                  placeholder="Начните вводить город..."
                  autocomplete="off"
                />
                {#if isCityLoading}
                  <div class="absolute right-3 top-9 animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full"></div>
                {/if}
                
                {#if cityDropdownOpen}
                  <div class="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {#each citySuggestions as suggestion}
                      <button
                        type="button"
                        onclick={() => selectCity(suggestion)}
                        class="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <div class="font-medium text-gray-900">{suggestion.value}</div>
                        {#if suggestion.data?.region_with_type}
                          <div class="text-xs text-gray-500">{suggestion.data.region_with_type}</div>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- Address -->
              <div class="relative">
                <label for="delivery_address" class="block text-sm font-medium text-gray-700 mb-2">Адрес <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  id="delivery_address"
                  bind:value={form.delivery_address}
                  oninput={handleAddressInput}
                  class="input {errors.delivery_address ? 'border-red-300' : ''}"
                  placeholder="Улица, дом, квартира..."
                  autocomplete="off"
                  disabled={!form.delivery_city}
                />
                {#if isAddressLoading}
                   <div class="absolute right-3 top-9 animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full"></div>
                {/if}
                
                {#if addressDropdownOpen}
                  <div class="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {#each addressSuggestions as suggestion}
                      <button
                        type="button"
                        onclick={() => selectAddress(suggestion)}
                        class="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                      >
                        <div class="font-medium text-gray-900">{suggestion.value}</div>
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <div>
                <label for="notes" class="block text-sm font-medium text-gray-700 mb-2">Комментарий к заказу</label>
                <textarea
                  id="notes"
                  bind:value={form.notes}
                  rows="3"
                  class="input"
                  placeholder="Например: код домофона, подъезд..."
                ></textarea>
              </div>
            </div>
          </section>

          <!-- Consent -->
          <div class="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <input
              type="checkbox"
              id="consent_pd"
              bind:checked={form.consent_pd}
              class="mt-1 w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <label for="consent_pd" class="text-sm text-gray-600 leading-relaxed">
              Нажимая кнопку «Оформить заказ», я даю согласие на обработку моих персональных данных и принимаю условия 
              <a href="/privacy" target="_blank" class="text-gray-900 underline decoration-gray-300 hover:decoration-gray-900 underline-offset-2">Политики конфиденциальности</a>.
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full md:hidden btn-primary py-4 text-lg shadow-xl sticky bottom-4 z-10"
          >
            {isSubmitting ? 'Оформляем...' : `Оформить за ${formatUtils.formatPrice(totalPrice)}`}
          </button>
        </form>

        <!-- Order Summary Sidebar -->
        <div class="hidden md:block">
          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-32">
            <h3 class="text-lg font-bold text-gray-900 mb-6">Ваш заказ</h3>
            
            <div class="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {#each cart as item}
                {@const imageUrl = item.image ? imageUtils.getAbsoluteUrl(item.image) : null}
                <div class="flex gap-3">
                  <div class="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {#if imageUrl}
                      <img src={imageUrl} alt="" class="w-full h-full object-cover"/>
                    {:else}
                      <span class="text-xs text-gray-400">Нет фото</span>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</p>
                    <p class="text-xs text-gray-500 mt-1">{item.quantity} шт. × {formatUtils.formatPrice(item.price)}</p>
                  </div>
                </div>
              {/each}
            </div>

            <div class="border-t border-gray-100 pt-4 space-y-2 mb-6">
              <div class="flex justify-between text-sm text-gray-600">
                <span>Товары ({totalItems})</span>
                <span>{formatUtils.formatPrice(totalPrice)}</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600">
                <span>Доставка</span>
                <span class="text-green-600 font-medium">Бесплатно</span>
              </div>
              <div class="flex justify-between text-lg font-bold text-gray-900 pt-2 mt-2 border-t border-gray-50">
                <span>Итого</span>
                <span>{formatUtils.formatPrice(totalPrice)}</span>
              </div>
            </div>

            <button
              onclick={handleSubmit}
              disabled={isSubmitting}
              class="w-full btn-primary py-3.5 text-base shadow-lg hover:shadow-xl transition-all"
            >
              {isSubmitting ? 'Оформляем...' : 'Оформить заказ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 20px;
  }
</style>
