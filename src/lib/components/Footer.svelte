<script>
  const currentYear = new Date().getFullYear();
  
  let newsletterEmail = $state('');
  let newsletterConsent = $state(false);
  let newsletterSubmitted = $state(false);
  let newsletterError = $state('');
  
  function handleNewsletterSubmit() {
    if (!newsletterEmail.trim()) {
      newsletterError = 'Введите email';
      return;
    }
    
    if (!newsletterConsent) {
      newsletterError = 'Необходимо согласие';
      return;
    }
    
    newsletterSubmitted = true;
    newsletterError = '';
    newsletterEmail = '';
    newsletterConsent = false;
    
    setTimeout(() => {
      newsletterSubmitted = false;
    }, 3000);
  }
  
  const footerLinks = [
    {
      title: 'Каталог',
      links: [
        { name: 'Все запчасти', href: '/catalog' },
        { name: 'Масла и жидкости', href: '/catalog?category=oil' },
        { name: 'Аккумуляторы', href: '/catalog?category=battery' },
        { name: 'Шины и диски', href: '/catalog?category=tires' }
      ]
    },
    {
      title: 'Клиентам',
      links: [
        { name: 'О компании', href: '/about' },
        { name: 'Контакты', href: '/#contacts' }
      ]
    },
    {
      title: 'Помощь',
      links: [
        { name: 'Подбор по VIN', href: '/#consultation' },
        { name: 'FAQ', href: '/faq' }
      ]
    }
  ];
</script>

<footer class="bg-white border-t border-gray-100 pt-16 pb-8">
  <div class="container-custom">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
      <!-- Brand Column -->
      <div class="space-y-6">
        <a href="/" class="flex items-center gap-3 group">
          <div class="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-transform">
            G
          </div>
          <span class="font-bold text-xl tracking-tight text-gray-900">GoodDrive</span>
        </a>
        <p class="text-gray-500 text-sm leading-relaxed">
          Современный магазин автозапчастей. Качество, надежность и профессиональный сервис для вашего автомобиля.
        </p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
            <span class="sr-only">VK</span>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-.864-1.744-.864-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.795.780 1.203 1.253.373.44.56.66.847 1.09.22.254.322.44.644.44z"/></svg>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-900 hover:text-white transition-all">
            <span class="sr-only">Telegram</span>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </a>
        </div>
      </div>
      
      <!-- Links Columns -->
      {#each footerLinks as section}
        <div>
          <h3 class="font-bold text-gray-900 mb-6">{section.title}</h3>
          <ul class="space-y-4">
            {#each section.links as link}
              <li>
                <a href={link.href} class="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
                  {link.name}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
    
    <!-- Bottom Bar -->
    <div class="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-gray-400 text-sm">
        © {currentYear} GoodDrive. Все права защищены.
      </p>
      <div class="flex gap-6">
        <a href="/privacy" class="text-gray-400 hover:text-gray-600 text-sm">Конфиденциальность</a>
        <a href="/terms" class="text-gray-400 hover:text-gray-600 text-sm">Оферта</a>
      </div>
    </div>
  </div>
</footer>
