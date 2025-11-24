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
          answer: 'Да, согласно закону о защите прав потребителей, вы можете вернуть товар бракованный или ненадлежащего качества в течение 14 дней с момента получения.'
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
    { name: 'Главная', url: '/' },
    { name: 'FAQ', url: '/faq' }
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

<div class="container-custom py-12 md:py-20">
  <!-- Header -->
  <div class="text-center max-w-4xl mx-auto mb-20">
    <span class="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 block">FAQ</span>
    <h1 class="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
      Ответы на вопросы
    </h1>
    <p class="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
      Мы собрали самые популярные вопросы наших клиентов, чтобы помочь вам быстрее разобраться в деталях.
    </p>
  </div>

  <!-- FAQ List -->
  <div class="max-w-3xl mx-auto space-y-16">
    {#each faqCategories as category}
      <div>
        <h2 class="text-2xl font-bold text-gray-900 mb-8 flex items-center">
          <span class="w-1.5 h-8 bg-gray-900 rounded-full mr-4"></span>
          {category.title}
        </h2>
        
        <div class="space-y-4">
          {#each category.questions as faq}
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md {openFaqId === faq.id ? 'ring-2 ring-gray-100' : ''}">
              <button
                onclick={() => toggleFaq(faq.id)}
                class="w-full p-6 text-left flex items-center justify-between gap-4"
                aria-expanded={openFaqId === faq.id}
              >
                <h3 class="text-lg font-bold text-gray-900 leading-snug">
                  {faq.question}
                </h3>
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform duration-300 {openFaqId === faq.id ? 'bg-gray-900 text-white rotate-180' : 'text-gray-400'}">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </div>
              </button>
              
              {#if openFaqId === faq.id}
                <div class="px-6 pb-6 animate-slide-down">
                  <p class="text-gray-600 leading-relaxed pt-2 border-t border-gray-50">
                    {faq.answer}
                  </p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Contact Box -->
  <div class="max-w-3xl mx-auto mt-20">
    <div class="bg-gray-900 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
      <!-- Decorative elements -->
      <div class="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-gray-500 opacity-10 rounded-full blur-3xl"></div>

      <div class="relative z-10">
        <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">
          Не нашли ответ на свой вопрос?
        </h2>
        <p class="text-gray-400 mb-8 max-w-lg mx-auto text-lg">
          Наши специалисты всегда на связи и готовы проконсультировать вас по любому вопросу.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="tel:+79227081553" class="inline-flex items-center justify-center px-8 py-3.5 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-colors">
            Позвонить нам
          </a>
          <a href="mailto:89227081553@mail.ru" class="inline-flex items-center justify-center px-8 py-3.5 border border-gray-700 text-white rounded-full font-bold hover:bg-gray-800 transition-colors">
            Написать на почту
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
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
