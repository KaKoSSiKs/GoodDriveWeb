<script>
  import SeoHead from '$lib/components/SeoHead.svelte';
  
  const seoData = {
    title: 'Политика конфиденциальности - GoodDrive',
    description: 'Политика конфиденциальности интернет-магазина GoodDrive. Обработка персональных данных в соответствии с ФЗ-152.',
    keywords: 'политика конфиденциальности, персональные данные, ФЗ-152',
    type: 'website'
  };
  
  const breadcrumbs = [
    { name: 'Главная', url: '/' },
    { name: 'Политика конфиденциальности', url: '/privacy' }
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
      <h1 class="text-3xl md:text-5xl font-bold text-gray-900 mb-6">Политика конфиденциальности</h1>
      <div class="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-600">
        Последнее обновление: {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <div class="prose prose-lg prose-gray max-w-none bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-sm">
      
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">1. Общие положения</h2>
        <p>
          Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты 
          персональных данных пользователей интернет-магазина GoodDrive (далее — «Сайт»), расположенного 
          по адресу: <a href="https://nikitintex.ru" class="text-gray-900 hover:text-gray-700 no-underline border-b border-gray-200 hover:border-gray-900 transition-all">https://nikitintex.ru</a>.
        </p>
        <p>
          Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ 
          «О персональных данных» (далее — «ФЗ-152») и иными нормативными правовыми актами Российской Федерации.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">2. Оператор персональных данных</h2>
        <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <h3 class="text-lg font-bold text-gray-900 mb-4 mt-0">GoodDrive</h3>
          <ul class="list-none pl-0 space-y-2 text-sm my-0">
            <li class="flex gap-3">
              <span class="text-gray-500 min-w-[80px]">Адрес:</span>
              <span class="font-medium">г. Челябинск, ул. Артиллерийская, 15к2</span>
            </li>
            <li class="flex gap-3">
              <span class="text-gray-500 min-w-[80px]">Телефон:</span>
              <a href="tel:+79227081553" class="font-medium text-gray-900 hover:text-gray-600 no-underline transition-colors">+7 (922) 708-15-53</a>
            </li>
            <li class="flex gap-3">
              <span class="text-gray-500 min-w-[80px]">Email:</span>
              <a href="mailto:89227081553@mail.ru" class="font-medium text-gray-900 hover:text-gray-600 no-underline transition-colors">89227081553@mail.ru</a>
            </li>
          </ul>
        </div>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">3. Какие данные мы собираем</h2>
        <ul class="grid sm:grid-cols-2 gap-4 pl-0 list-none">
          <li class="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <strong class="block text-gray-900 mb-1">Личные данные</strong>
            <span class="text-sm">Имя, телефон, email</span>
          </li>
          <li class="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <strong class="block text-gray-900 mb-1">Данные доставки</strong>
            <span class="text-sm">Адрес, город, индекс</span>
          </li>
          <li class="bg-gray-50 p-4 rounded-xl border border-gray-100">
            <strong class="block text-gray-900 mb-1">Технические данные</strong>
            <span class="text-sm">IP-адрес, cookies, устройство</span>
          </li>
        </ul>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">4. Цели обработки</h2>
        <p>Мы используем ваши данные исключительно для:</p>
        <ul class="space-y-2">
          <li>Обработки и доставки ваших заказов</li>
          <li>Информирования о статусе покупки</li>
          <li>Улучшения качества работы сервиса</li>
          <li>Соблюдения требований законодательства РФ</li>
        </ul>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">5. Защита данных</h2>
        <p>
          Мы принимаем все необходимые меры для защиты ваших данных: используем шифрование (HTTPS), 
          ограничиваем доступ сотрудников к информации и регулярно обновляем системы безопасности.
        </p>
      </section>

      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">6. Ваши права</h2>
        <p>Вы имеете право в любой момент:</p>
        <ul class="space-y-2">
          <li>Получить информацию о хранящихся у нас данных</li>
          <li>Потребовать их изменения или удаления</li>
          <li>Отозвать согласие на обработку</li>
        </ul>
        <p class="mt-6 text-sm bg-gray-50 p-4 rounded-xl text-gray-800">
          Для реализации прав напишите нам на <a href="mailto:89227081553@mail.ru" class="font-bold hover:underline">89227081553@mail.ru</a>
        </p>
      </section>

    </div>
  </div>
</div>
