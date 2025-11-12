// Service Worker для PWA GoodDrive
const CACHE_NAME = 'gooddrive-v1';
const urlsToCache = [
  '/',
  '/catalog',
  '/about',
  '/faq',
  '/manifest.json',
  '/images/logo.jpg',
  '/icons/brake_ic.png',
  '/icons/electronics_ic.png',
  '/icons/engine_ic.png',
  '/icons/suspension_ic.png',
  '/icons/shoping_cart.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к API и админ-панели
  if (event.request.url.includes('/api/') || event.request.url.includes('/admin/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем кеш если есть, иначе делаем запрос
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Проверяем что ответ валидный
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Клонируем ответ для кеша
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Возвращаем оффлайн страницу при ошибке
        return caches.match('/');
      })
  );
});

// Обработка сообщений
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

