<script>
  import SeoHead from '$lib/components/SeoHead.svelte';
  
  const seoData = {
    title: 'Часто задаваемые вопросы (FAQ) - GoodDrive',
    description: 'Ответы на часто задаваемые вопросы о покупке автозапчастей, доставке, оплате и гарантии в интернет-магазине GoodDrive.',
    keywords: 'faq, вопросы, ответы, доставка, оплата, гарантия, автозапчасти',
    image: '/images/faq-og.jpg',
    type: 'website'
  };
  
  let openFaqId = $state(null);
  
  const faqCategories = [
    {
      title: 'Заказ и оплата',
      questions: [
        {
          id: 1,
          question: 'Как оформить заказ?',
          answer: 'Добавьте нужные товары в корзину, перейдите на страницу оформления заказа, заполните контактные данные и выберите способ доставки. После подтверждения заказа с вами свяжется наш менеджер.'
        },
        {
          id: 2,
          question: 'Какие способы оплаты доступны?',
          answer: 'Мы принимаем оплату наличными при получении, банковскими картами онлайн, безналичный расчет для юридических лиц.'
        },
        {
          id: 3,
          question: 'Можно ли отменить или изменить заказ?',
          answer: 'Да, вы можете отменить или изменить заказ до момента его отправки. Свяжитесь с нашим менеджером по телефону +7 (922) 708-15-53.'
        }
      ]
    },
    {
      title: 'Доставка',
      questions: [
        {
          id: 4,
          question: 'Какие регионы доставки?',
          answer: 'Мы осуществляем доставку по всей территории России через транспортные компании и курьерские службы.'
        },
        {
          id: 5,
          question: 'Сколько стоит доставка?',
          answer: 'Стоимость доставки зависит от региона и веса товара. Точную стоимость можно узнать при оформлении заказа или у нашего менеджера.'
        },
        {
          id: 6,
          question: 'Сколько времени занимает доставка?',
          answer: 'Срок доставки зависит от региона: по Челябинску - 1-2 дня, по России - от 3 до 10 рабочих дней.'
        }
      ]
    },
    {
      title: 'Товары и гарантия',
      questions: [
        {
          id: 7,
          question: 'Все ли товары оригинальные?',
          answer: 'Мы предлагаем как оригинальные, так и качественные аналоги от проверенных производителей. Вся информация указана в описании товара.'
        },
        {
          id: 8,
          question: 'Есть ли гарантия на товары?',
          answer: 'Да, на все товары предоставляется гарантия производителя. Срок гарантии зависит от типа товара и указан в документации.'
        },
        {
          id: 9,
          question: 'Можно ли вернуть товар?',
          answer: 'Да, согласно закону о защите прав потребителей, вы можете вернуть товар надлежащего качества в течение 14 дней с момента получения.'
        }
      ]
    },
    {
      title: 'Подбор запчастей',
      questions: [
        {
          id: 10,
          question: 'Как подобрать запчасти для моего автомобиля?',
          answer: 'Используйте поиск по каталогу или VIN-коду автомобиля. Также можете обратиться к нашим специалистам за бесплатной консультацией.'
        },
        {
          id: 11,
          question: 'Что такое VIN-код и где его найти?',
          answer: 'VIN-код - это уникальный идентификационный номер автомобиля. Его можно найти в техпаспорте, на кузове автомобиля или под лобовым стеклом.'
        },
        {
          id: 12,
          question: 'Помогут ли подобрать аналоги оригинальных запчастей?',
          answer: 'Да, наши специалисты помогут подобрать качественные аналоги, которые подойдут для вашего автомобиля и будут дешевле оригинала.'
        }
      ]
    }
  ];
  
  function toggleFaq(id) {
    openFaqId = openFaqId === id ? null : id;
  }
  
  // JSON-LD для FAQ
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqCategories.flatMap(category => 
      category.questions.map(q => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.answer
        }
      }))
    )
  };
  
  const breadcrumbs = [
    { name: 'Главная', url: 'https://gooddrive.com/' },
    { name: 'FAQ', url: 'https://gooddrive.com/faq' }
  ];
</script>

<SeoHead
  title={seoData.title}
  description={seoData.description}
  keywords={seoData.keywords}
  image={seoData.image}
  type={seoData.type}
  breadcrumbs={breadcrumbs}
  jsonLd={faqJsonLd}
/>

<div class="container-custom py-12">
  <!-- Хлебные крошки -->
  <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
    <a href="/" class="hover:text-primary-600 transition-colors">Главная</a>
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
    </svg>
    <span class="text-gray-900 font-medium">FAQ</span>
  </nav>

  <!-- Заголовок -->
  <div class="text-center mb-12">
    <h1 class="text-4xl md:text-5xl font-bold text-dark-500 mb-4">
      Часто задаваемые вопросы
    </h1>
    <p class="text-xl text-gray-600 max-w-2xl mx-auto">
      Ответы на популярные вопросы о покупке автозапчастей
    </p>
  </div>

  <!-- FAQ по категориям -->
  <div class="max-w-4xl mx-auto space-y-12">
    {#each faqCategories as category}
      <section>
        <h2 class="text-2xl font-bold text-dark-500 mb-6 flex items-center">
          <span class="w-2 h-8 bg-primary-600 rounded mr-3"></span>
          {category.title}
        </h2>
        
        <div class="space-y-4">
          {#each category.questions as faq}
            <div class="card overflow-hidden">
              <button
                onclick={() => toggleFaq(faq.id)}
                class="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                aria-expanded={openFaqId === faq.id}
              >
                <h3 class="text-lg font-semibold text-dark-500 pr-4">
                  {faq.question}
                </h3>
                <svg
                  class="w-6 h-6 text-primary-600 flex-shrink-0 transition-transform duration-300"
                  style="transform: rotate({openFaqId === faq.id ? '180deg' : '0deg'})"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              
              {#if openFaqId === faq.id}
                <div class="px-6 pb-6 animate-slide-down">
                  <div class="pt-4 border-t border-gray-200">
                    <p class="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  </div>

  <!-- Блок "Не нашли ответ?" -->
  <div class="mt-16 card p-8 bg-gradient-to-br from-primary-50 to-white border-primary-100">
    <div class="text-center">
      <div class="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg class="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      
      <h2 class="text-2xl font-bold text-dark-500 mb-4">
        Не нашли ответ на свой вопрос?
      </h2>
      <p class="text-gray-600 mb-6 max-w-xl mx-auto">
        Наши специалисты готовы помочь вам! Свяжитесь с нами любым удобным способом
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="tel:+79227081553" class="btn-primary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          Позвонить
        </a>
        
        <a href="mailto:89227081553@mail.ru" class="btn-outline">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          Написать
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
</style>

