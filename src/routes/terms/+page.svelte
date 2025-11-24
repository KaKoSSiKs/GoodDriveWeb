<script>
  import SeoHead from '$lib/components/SeoHead.svelte';
  
  const seoData = {
    title: 'Пользовательское соглашение - GoodDrive',
    description: 'Пользовательское соглашение интернет-магазина GoodDrive. Условия использования сайта и оформления заказов.',
    keywords: 'пользовательское соглашение, условия использования, правила',
    type: 'website'
  };
  
  const breadcrumbs = [
    { name: 'Главная', url: '/' },
    { name: 'Пользовательское соглашение', url: '/terms' }
  ];
</script>

<SeoHead
  title={seoData.title}
  description={seoData.description}
  keywords={seoData.keywords}
  type={seoData.type}
  breadcrumbs={breadcrumbs}
/>

<div class="container-custom py-12 md:py-20">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-16">
      <span class="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4 block">Юридическая информация</span>
      <h1 class="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Пользовательское соглашение</h1>
      <div class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
        Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div class="prose prose-lg prose-gray max-w-none bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
      
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">1. Общие положения</h2>
        <p>
          Настоящее Пользовательское соглашение (далее — «Соглашение») определяет условия использования 
          интернет-магазина GoodDrive (далее — «Сайт»), расположенного по адресу: 
          <a href="https://nikitintex.ru" class="text-gray-900 hover:text-gray-700 no-underline border-b border-gray-200 hover:border-gray-900 transition-all">https://nikitintex.ru</a>.
        </p>
        <p>
          Используя Сайт, Вы подтверждаете, что ознакомились с условиями настоящего Соглашения, 
          понимаете их и принимаете на себя все обязательства, вытекающие из настоящего Соглашения.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">2. Основные определения</h2>
        <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <ul class="list-none pl-0 space-y-4 text-base my-0">
            <li>
              <strong class="text-gray-900">Сайт</strong> — интернет-ресурс, доступный по адресу nikitintex.ru
            </li>
            <li>
              <strong class="text-gray-900">Администрация</strong> — владельцы и модераторы ресурса
            </li>
            <li>
              <strong class="text-gray-900">Пользователь</strong> — любое физическое лицо, посещающее Сайт
            </li>
            <li>
              <strong class="text-gray-900">Заказ</strong> — оформленный запрос на покупку товаров
            </li>
          </ul>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">3. Оформление заказа</h2>
        <p>Для совершения покупки Пользователь обязуется:</p>
        <ul class="space-y-2">
          <li>Предоставить достоверные контактные данные</li>
          <li>Выбрать способ доставки и оплаты</li>
          <li>Подтвердить согласие с условиями Соглашения</li>
        </ul>
        <p>Администрация оставляет за собой право аннулировать заказ в случае указания некорректных данных.</p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">4. Оплата и Доставка</h2>
        <p>
          Цены на товары указываются в рублях РФ. Стоимость доставки рассчитывается индивидуально 
          и зависит от веса товара и региона получателя.
        </p>
        <p>
          Обязательства по передаче товара считаются исполненными с момента передачи товара в службу доставки 
          или непосредственно Покупателю.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">5. Возврат товаров</h2>
        <div class="flex gap-4 items-start p-4 bg-gray-50 rounded-xl text-gray-800 text-sm">
          <svg class="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p class="my-0">
            Возврат товара надлежащего качества возможен в течение 14 дней, если сохранены его товарный вид, 
            потребительские свойства, а также документ, подтверждающий факт покупки.
          </p>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">6. Контактная информация</h2>
        <p>По вопросам работы Сайта и оформления заказов обращайтесь:</p>
        <ul class="list-none pl-0 space-y-2">
          <li><strong>Email:</strong> <a href="mailto:89227081553@mail.ru" class="text-gray-900 hover:underline">89227081553@mail.ru</a></li>
          <li><strong>Телефон:</strong> <a href="tel:+79227081553" class="text-gray-900 hover:underline">+7 (922) 708-15-53</a></li>
        </ul>
      </section>

    </div>
  </div>
</div>
