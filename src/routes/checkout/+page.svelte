<script>
  import { onMount } from 'svelte';
  import { cartUtils, ordersApi, formatUtils, validationUtils } from '$lib/utils/api.js';
  
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
  
  // Производные значения
  const totalItems = $derived(cart.reduce((total, item) => total + item.quantity, 0));
  const totalPrice = $derived(cart.reduce((total, item) => total + (item.price * item.quantity), 0));
  const isEmpty = $derived(cart.length === 0);
  
  // Загрузка корзины
  function loadCart() {
    cart = cartUtils.getCart();
  }
  
  // Валидация формы
  function validateForm() {
    errors = {};
    let isValid = true;
    
    // Имя
    if (!form.customer_name.trim()) {
      errors.customer_name = 'Введите имя';
      isValid = false;
    }
    
    // Телефон
    if (!form.customer_phone.trim()) {
      errors.customer_phone = 'Введите номер телефона';
      isValid = false;
    } else if (!validationUtils.isValidPhone(form.customer_phone)) {
      errors.customer_phone = 'Введите корректный номер телефона';
      isValid = false;
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
    }
    
    // Город
    if (!form.delivery_city.trim()) {
      errors.delivery_city = 'Введите город';
      isValid = false;
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
    
    if (!validateForm()) {
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
  <div class="container-custom py-8">
    <div class="max-w-2xl mx-auto text-center">
      <div class="card p-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 class="text-3xl font-bold text-neutral-900 mb-4">Заказ успешно оформлен!</h1>
        <p class="text-neutral-600 mb-6">
          Ваш заказ #{orderData?.order_number || orderData?.orderNumber || 'N/A'} принят в обработку. 
          Мы свяжемся с вами в ближайшее время.
        </p>
        
        <div class="bg-neutral-50 rounded-lg p-6 mb-8">
          <h2 class="text-lg font-semibold text-neutral-900 mb-4">Детали заказа</h2>
          <div class="space-y-2 text-sm">
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
        
        <div class="flex flex-col sm:flex-row gap-4">
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
  <div class="container-custom py-8">
    <div class="max-w-6xl mx-auto">
      <!-- Заголовок -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">Оформление заказа</h1>
        <p class="text-neutral-600">Заполните форму для завершения покупки</p>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Форма -->
        <div class="lg:col-span-2">
          <form onsubmit={handleSubmit} class="space-y-8">
            <!-- Контактная информация -->
            <div class="card p-6">
              <h2 class="text-xl font-semibold text-neutral-900 mb-6">Контактная информация</h2>
              
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
            <div class="card p-6">
              <h2 class="text-xl font-semibold text-neutral-900 mb-6">Адрес доставки</h2>
              
              <div class="space-y-6">
                <div>
                  <label for="delivery_city" class="block text-sm font-medium text-neutral-700 mb-2">
                    Город <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="delivery_city"
                    bind:value={form.delivery_city}
                    class="input {errors.delivery_city ? 'border-red-500' : ''}"
                    placeholder="Введите город"
                  />
                  {#if errors.delivery_city}
                    <p class="text-red-500 text-sm mt-1">{errors.delivery_city}</p>
                  {/if}
                </div>
                
                <div>
                  <label for="delivery_address" class="block text-sm font-medium text-neutral-700 mb-2">
                    Адрес <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    id="delivery_address"
                    bind:value={form.delivery_address}
                    class="input {errors.delivery_address ? 'border-red-500' : ''}"
                    rows="3"
                    placeholder="Введите полный адрес доставки"
                  ></textarea>
                  {#if errors.delivery_address}
                    <p class="text-red-500 text-sm mt-1">{errors.delivery_address}</p>
                  {/if}
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
            <div class="card p-6">
              <h2 class="text-xl font-semibold text-neutral-900 mb-6">Дополнительно</h2>
              
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
            <div class="card p-6">
              <div class="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent_pd"
                  bind:checked={form.consent_pd}
                  class="mt-1 w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label for="consent_pd" class="text-sm text-neutral-700">
                  Я даю согласие на обработку моих персональных данных в соответствии с 
                  <a href="/privacy" target="_blank" class="text-primary-600 hover:underline">Политикой конфиденциальности</a> 
                  и принимаю условия 
                  <a href="/terms" target="_blank" class="text-primary-600 hover:underline">Пользовательского соглашения</a>.
                  <span class="text-red-500">*</span>
                </label>
              </div>
              {#if errors.consent_pd}
                <p class="text-red-500 text-sm mt-2 ml-8">{errors.consent_pd}</p>
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
                disabled={isSubmitting}
                class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Оформление заказа...' : 'Оформить заказ'}
              </button>
              <a href="/cart" class="btn-outline">
                Вернуться в корзину
              </a>
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


