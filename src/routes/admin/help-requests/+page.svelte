<script>
  import { onMount } from 'svelte';
  import { helpRequestsApi } from '$lib/utils/api.js';
  
  let requests = $state([]);
  let isLoading = $state(true);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalCount = $state(0);
  let statusFilter = $state('all');
  let selectedRequest = $state(null);
  let isDecodingVin = $state(false);
  
  // Загрузка запросов
  async function loadRequests() {
    try {
      isLoading = true;
      const params = {
        page: currentPage,
        limit: 20
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      const response = await helpRequestsApi.getHelpRequests(params);
      
      if (response.success && response.data) {
        requests = response.data.results || [];
        totalCount = response.data.count || 0;
        totalPages = response.data.totalPages || 1;
      }
    } catch (error) {
      console.error('Ошибка загрузки запросов:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Обновление статуса запроса
  async function updateStatus(requestId, newStatus) {
    try {
      await helpRequestsApi.updateHelpRequestStatus(requestId, newStatus);
      await loadRequests();
      
      // Обновляем выбранный запрос, если он открыт
      if (selectedRequest && selectedRequest.id === requestId) {
        selectedRequest.status = newStatus;
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Не удалось обновить статус запроса');
    }
  }
  
  // Получение статуса запроса
  function getStatusLabel(status) {
    const labels = {
      new: 'Новый',
      processing: 'В обработке',
      completed: 'Завершен',
      canceled: 'Отменен'
    };
    return labels[status] || status;
  }
  
  function getStatusClass(status) {
    const classes = {
      new: 'bg-warning-100 text-warning-700 border-warning-200',
      processing: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      completed: 'bg-success-100 text-success-700 border-success-200',
      canceled: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  }
  
  // Обработчики
  function handleStatusFilterChange(newStatus) {
    statusFilter = newStatus;
    currentPage = 1;
    loadRequests();
  }
  
  function handlePageChange(page) {
    currentPage = page;
    loadRequests();
  }
  
  async function openRequest(request) {
    // Загружаем полные данные запроса из API (на случай если в списке не все поля)
    try {
      const response = await helpRequestsApi.getHelpRequest(request.id);
      if (response.success && response.data) {
        selectedRequest = response.data;
        console.log('Loaded full request data:', response.data);
      } else {
        selectedRequest = request;
        console.log('Using request from list:', request);
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      selectedRequest = request;
    }
    
    // Для отладки - выводим все данные запроса
    console.log('Selected request data:', selectedRequest);
    console.log('Vehicle data:', {
      year: selectedRequest?.vehicleYear,
      brand: selectedRequest?.vehicleBrand,
      model: selectedRequest?.vehicleModel,
      engineVolume: selectedRequest?.engineVolume,
      enginePowerHp: selectedRequest?.enginePowerHp,
      engineType: selectedRequest?.engineType,
      ecoClass: selectedRequest?.ecoClass,
      transmissionType: selectedRequest?.transmissionType,
      driveType: selectedRequest?.driveType,
      bodyType: selectedRequest?.bodyType
    });
  }
  
  function closeRequest() {
    selectedRequest = null;
  }
  
  // Повторное декодирование VIN
  async function reDecodeVin(requestId) {
    if (!confirm('Передекодировать VIN-номер? Данные об автомобиле будут обновлены.')) {
      return;
    }
    
    try {
      isDecodingVin = true;
      const response = await helpRequestsApi.reDecodeVin(requestId);
      
      if (response.success && response.data) {
        // Обновляем выбранный запрос новыми данными
        selectedRequest = response.data;
        console.log('Updated selectedRequest after decoding:', selectedRequest);
        console.log('Vehicle data after update:', {
          year: selectedRequest.vehicleYear,
          brand: selectedRequest.vehicleBrand,
          model: selectedRequest.vehicleModel,
          engineVolume: selectedRequest.engineVolume,
          enginePowerHp: selectedRequest.enginePowerHp,
          engineType: selectedRequest.engineType,
          ecoClass: selectedRequest.ecoClass,
          transmissionType: selectedRequest.transmissionType,
          driveType: selectedRequest.driveType,
          bodyType: selectedRequest.bodyType
        });
        // Обновляем список запросов
        await loadRequests();
        alert('VIN-номер успешно декодирован!');
      } else {
        alert(response.error || 'Не удалось декодировать VIN-номер');
      }
    } catch (error) {
      console.error('Ошибка декодирования VIN:', error);
      alert('Ошибка при декодировании VIN-номера. Попробуйте позже.');
    } finally {
      isDecodingVin = false;
    }
  }
  
  onMount(() => {
    loadRequests();
  });
</script>

<svelte:head>
  <title>Запросы консультации - Admin</title>
</svelte:head>

<div class="space-y-6 w-full">
  <!-- Заголовок -->
  <div>
    <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Запросы консультации</h1>
    <p class="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Управление запросами от клиентов</p>
  </div>
  
  <!-- Фильтры -->
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-2 border-gray-100">
    <div class="flex flex-wrap items-center gap-4">
      <span class="text-sm font-medium text-gray-700">Статус:</span>
      <div class="flex flex-wrap gap-2">
        <button
          onclick={() => handleStatusFilterChange('all')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {statusFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          Все ({totalCount})
        </button>
        <button
          onclick={() => handleStatusFilterChange('new')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {statusFilter === 'new' ? 'bg-warning-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          Новые
        </button>
        <button
          onclick={() => handleStatusFilterChange('processing')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {statusFilter === 'processing' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          В обработке
        </button>
        <button
          onclick={() => handleStatusFilterChange('completed')}
          class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {statusFilter === 'completed' ? 'bg-success-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        >
          Завершенные
        </button>
      </div>
    </div>
  </div>
  
  {#if isLoading}
    <!-- Загрузка -->
    <div class="bg-white rounded-xl shadow-sm p-8 border-2 border-gray-100">
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
          <p class="text-gray-600 font-medium">Загрузка запросов...</p>
        </div>
      </div>
    </div>
  {:else if requests.length > 0}
    <!-- Список запросов -->
    <div class="bg-white rounded-xl shadow-sm border-2 border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">Клиент</th>
              <th class="hidden md:table-cell text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">Телефон</th>
              <th class="hidden md:table-cell text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">VIN</th>
              <th class="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">Статус</th>
              <th class="hidden lg:table-cell text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">Дата</th>
              <th class="hidden md:table-cell text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700">Действия</th>
            </tr>
          </thead>
          <tbody>
            {#each requests as request}
              <tr 
                class="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" 
                onclick={() => openRequest(request)}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRequest(request); } }}
                tabindex="0"
                role="button"
                aria-label="Открыть запрос #{request.id}"
              >
                <td class="py-3 px-4">
                  <div class="flex flex-col">
                    <span class="text-xs sm:text-sm text-gray-900 font-medium line-clamp-2">{request.name}</span>
                    <span class="md:hidden text-[11px] text-gray-600 mt-1">
                      <a href="tel:{request.phone}" class="hover:text-primary-600">{request.phone}</a>
                    </span>
                  </div>
                </td>
                <td class="hidden md:table-cell py-3 px-4 text-xs sm:text-sm text-gray-700">
                  <a href="tel:{request.phone}" class="hover:text-primary-600">{request.phone}</a>
                </td>
                <td class="py-3 px-4 text-xs sm:text-sm text-gray-600 font-mono hidden md:table-cell">
                  {request.vin || '-'}
                </td>
                <td class="hidden md:table-cell py-3 px-4 text-xs sm:text-sm">
                  <span class="px-2 py-1 text-xs font-medium rounded-full border {getStatusClass(request.status)}">
                    {getStatusLabel(request.status)}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                  {new Date(request.createdAt).toLocaleString('ru-RU')}
                </td>
                <td class="py-3 px-4 text-xs sm:text-sm">
                  <button
                    onclick={(e) => { e.stopPropagation(); openRequest(request); }}
                    class="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Подробнее
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      <!-- Пагинация -->
      {#if totalPages > 1}
        <div class="border-t border-gray-200 px-4 py-3 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Показано {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalCount)} из {totalCount}
            </div>
            <div class="flex gap-2">
              <button
                onclick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                class="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span class="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onclick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                class="px-3 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Пустое состояние -->
    <div class="bg-white rounded-xl shadow-sm p-8 border-2 border-gray-100 text-center">
      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Запросов нет</h3>
      <p class="text-gray-600">Нет запросов консультации с выбранным статусом</p>
    </div>
  {/if}
</div>

<!-- Модальное окно с деталями запроса -->
{#if selectedRequest}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
    onclick={closeRequest}
    onkeydown={(e) => { if (e.key === 'Escape') closeRequest(); }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="request-modal-title"
    tabindex="0"
    style="cursor: pointer;"
  >
    <div 
      class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" 
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 id="request-modal-title" class="text-xl font-bold text-gray-900">Запрос #{selectedRequest.id}</h2>
        <button
          onclick={closeRequest}
          class="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Закрыть"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Информация о клиенте -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Информация о клиенте</h3>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Имя:</span>
              <span class="text-sm font-medium text-gray-900">{selectedRequest.name}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-sm text-gray-600">Телефон:</span>
              <a href="tel:{selectedRequest.phone}" class="text-sm font-medium text-primary-600 hover:text-primary-700">
                {selectedRequest.phone}
              </a>
            </div>
            {#if selectedRequest.vin}
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">VIN:</span>
                <span class="text-sm font-mono text-gray-900">{selectedRequest.vin}</span>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Информация об автомобиле (если VIN указан) -->
        {#if selectedRequest.vin}
          {@const hasAnyVehicleData = selectedRequest.vehicleYear || selectedRequest.vehicleBrand || selectedRequest.vehicleModel || selectedRequest.vehicleModification || selectedRequest.vehicleColor || selectedRequest.vehicleType || selectedRequest.vehicleCategory || selectedRequest.manufacturerCountry || selectedRequest.engineVolume || selectedRequest.enginePowerHp || selectedRequest.enginePowerKw || selectedRequest.engineType || selectedRequest.engineNumber || selectedRequest.bodyNumber || selectedRequest.chassisNumber || selectedRequest.bodyType || selectedRequest.maxMass || selectedRequest.unladenMass || selectedRequest.transmissionType || selectedRequest.driveType || selectedRequest.passengerSeats || selectedRequest.ecoClass || selectedRequest.vehicleData}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Информация об автомобиле
            </h3>
            <!-- Основные данные -->
            {#if hasAnyVehicleData}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {#if selectedRequest.vehicleYear}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Год выпуска:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleYear}</span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleBrand}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Марка:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleBrand}</span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleModel}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Модель:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleModel}</span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleModification}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Модификация:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleModification}</span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleColor}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Цвет:</span>
                    <span class="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <span class="inline-block w-4 h-4 rounded border border-gray-300" style="background-color: {selectedRequest.vehicleColor.toLowerCase()};"></span>
                      {selectedRequest.vehicleColor}
                    </span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleType}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Тип ТС:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleType}</span>
                  </div>
                {/if}
                {#if selectedRequest.vehicleCategory}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Категория ТС:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.vehicleCategory}</span>
                  </div>
                {/if}
                {#if selectedRequest.manufacturerCountry}
                  <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">Страна изготовителя:</span>
                    <span class="text-sm font-medium text-gray-900">{selectedRequest.manufacturerCountry}</span>
                  </div>
                {/if}
              </div>
            {/if}
            
            <!-- Дополнительная информация (экокласс и другие данные) -->
            {#if selectedRequest.ecoClass || (selectedRequest.engineVolume && !selectedRequest.enginePowerHp)}
              {#if !selectedRequest.engineType && !selectedRequest.engineVolume && !selectedRequest.enginePowerHp}
                <!-- Показываем только если нет блока "Двигатель" -->
                <div class="border-t border-blue-200 pt-3 mt-3">
                  <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Дополнительно</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {#if selectedRequest.ecoClass}
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Экологический класс:</span>
                        <span class="text-sm font-medium text-gray-900">{selectedRequest.ecoClass}</span>
                      </div>
                    {/if}
                    {#if selectedRequest.engineVolume && !selectedRequest.enginePowerHp}
                      <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600">Объем двигателя:</span>
                        <span class="text-sm font-medium text-gray-900">{selectedRequest.engineVolume} см³</span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            {/if}
            
            <!-- Двигатель -->
            {#if selectedRequest.engineType || selectedRequest.engineVolume || selectedRequest.enginePowerHp || selectedRequest.engineNumber}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Двигатель
                </h4>
                <div class="bg-white rounded-lg p-4 border border-blue-100">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {#if selectedRequest.engineType}
                      <div class="flex flex-col">
                        <span class="text-xs text-gray-500 mb-1">Тип двигателя</span>
                        <span class="text-sm font-semibold text-gray-900">{selectedRequest.engineType}</span>
                      </div>
                    {/if}
                    {#if selectedRequest.engineVolume}
                      <div class="flex flex-col">
                        <span class="text-xs text-gray-500 mb-1">Объем двигателя</span>
                        <span class="text-sm font-semibold text-gray-900">
                          {selectedRequest.engineVolume} см³
                          {#if selectedRequest.engineVolume}
                            ({(selectedRequest.engineVolume / 1000).toFixed(1)} л)
                          {/if}
                        </span>
                      </div>
                    {/if}
                    {#if selectedRequest.enginePowerHp}
                      <div class="flex flex-col">
                        <span class="text-xs text-gray-500 mb-1">Мощность</span>
                        <span class="text-sm font-semibold text-gray-900">
                          {selectedRequest.enginePowerHp} л.с.
                          {#if selectedRequest.enginePowerKw}
                            <span class="text-gray-600">({selectedRequest.enginePowerKw} кВт)</span>
                          {/if}
                        </span>
                      </div>
                    {/if}
                    {#if selectedRequest.engineNumber}
                      <div class="flex flex-col">
                        <span class="text-xs text-gray-500 mb-1">Номер двигателя</span>
                        <span class="text-sm font-mono text-gray-900">{selectedRequest.engineNumber}</span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
            
            <!-- Краткие технические характеристики -->
            {#if selectedRequest.engineVolume || selectedRequest.enginePowerHp || selectedRequest.transmissionType || selectedRequest.driveType || selectedRequest.bodyType}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-3 flex items-center gap-2">
                  <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Краткие технические характеристики
                </h4>
                <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {#if selectedRequest.engineVolume && selectedRequest.enginePowerHp}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Двигатель</span>
                          <p class="text-sm font-semibold text-gray-900">
                            {(selectedRequest.engineVolume / 1000).toFixed(1)} л / {selectedRequest.enginePowerHp} л.с.
                            {#if selectedRequest.engineType}
                              <span class="text-gray-600">({selectedRequest.engineType})</span>
                            {/if}
                          </p>
                        </div>
                      </div>
                    {/if}
                    {#if selectedRequest.transmissionType}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Коробка передач</span>
                          <p class="text-sm font-semibold text-gray-900">{selectedRequest.transmissionType}</p>
                        </div>
                      </div>
                    {/if}
                    {#if selectedRequest.driveType}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Привод</span>
                          <p class="text-sm font-semibold text-gray-900">{selectedRequest.driveType}</p>
                        </div>
                      </div>
                    {/if}
                    {#if selectedRequest.bodyType}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Тип кузова</span>
                          <p class="text-sm font-semibold text-gray-900">{selectedRequest.bodyType}</p>
                        </div>
                      </div>
                    {/if}
                    {#if selectedRequest.ecoClass}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Экокласс</span>
                          <p class="text-sm font-semibold text-gray-900">{selectedRequest.ecoClass}</p>
                        </div>
                      </div>
                    {/if}
                    {#if selectedRequest.passengerSeats}
                      <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <span class="text-xs text-gray-600">Количество мест</span>
                          <p class="text-sm font-semibold text-gray-900">{selectedRequest.passengerSeats}</p>
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
            
            <!-- Кузов и шасси -->
            {#if selectedRequest.bodyType || selectedRequest.bodyNumber || selectedRequest.chassisNumber}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Кузов и шасси</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#if selectedRequest.bodyType}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Тип кузова:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.bodyType}</span>
                    </div>
                  {/if}
                  {#if selectedRequest.bodyNumber}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Номер кузова:</span>
                      <span class="text-sm font-mono text-gray-900">{selectedRequest.bodyNumber}</span>
                    </div>
                  {/if}
                  {#if selectedRequest.chassisNumber}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Номер шасси:</span>
                      <span class="text-sm font-mono text-gray-900">{selectedRequest.chassisNumber}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Масса -->
            {#if selectedRequest.maxMass || selectedRequest.unladenMass}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Масса</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#if selectedRequest.maxMass}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Максимальная масса:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.maxMass} кг</span>
                    </div>
                  {/if}
                  {#if selectedRequest.unladenMass}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Масса без нагрузки:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.unladenMass} кг</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Трансмиссия и привод -->
            {#if selectedRequest.transmissionType || selectedRequest.driveType}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Трансмиссия</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#if selectedRequest.transmissionType}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Коробка передач:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.transmissionType}</span>
                    </div>
                  {/if}
                  {#if selectedRequest.driveType}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Привод:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.driveType}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Дополнительные данные -->
            {#if selectedRequest.passengerSeats || selectedRequest.ecoClass}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Дополнительно</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {#if selectedRequest.passengerSeats}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Количество мест:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.passengerSeats}</span>
                    </div>
                  {/if}
                  {#if selectedRequest.ecoClass}
                    <div class="flex justify-between items-center">
                      <span class="text-sm text-gray-600">Экологический класс:</span>
                      <span class="text-sm font-medium text-gray-900">{selectedRequest.ecoClass}</span>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
            
            <!-- Дополнительные данные из JSON -->
            {#if selectedRequest.vehicleData}
              {@const vehicleData = (() => {
                try {
                  return typeof selectedRequest.vehicleData === 'string' 
                    ? JSON.parse(selectedRequest.vehicleData) 
                    : selectedRequest.vehicleData;
                } catch (e) {
                  console.error('Error parsing vehicleData:', e);
                  return null;
                }
              })()}
              {#if vehicleData && Object.keys(vehicleData).length > 0}
                <div class="border-t border-blue-200 pt-3 mt-3">
                  <h4 class="text-xs font-semibold text-gray-600 uppercase mb-2">Дополнительная информация</h4>
                  <details class="text-sm">
                    <summary class="cursor-pointer text-gray-600 hover:text-gray-900">Показать все данные</summary>
                    <pre class="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">{JSON.stringify(vehicleData, null, 2)}</pre>
                  </details>
                </div>
              {/if}
            {/if}
            <!-- Сообщение, если нет никаких данных -->
            {#if !hasAnyVehicleData}
              <div class="border-t border-blue-200 pt-3 mt-3">
                <p class="text-sm text-gray-500 mb-3 italic">
                  VIN-номер указан, но данные об автомобиле не были декодированы автоматически
                </p>
                {#if selectedRequest.vin}
                  <button
                    onclick={() => reDecodeVin(selectedRequest.id)}
                    disabled={isDecodingVin}
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {#if isDecodingVin}
                      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Декодирование...
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Декодировать VIN
                    {/if}
                  </button>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
        
        
        <!-- Комментарий -->
        {#if selectedRequest.message}
          <div>
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Комментарий</h3>
            <p class="text-sm text-gray-900 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
              {selectedRequest.message}
            </p>
          </div>
        {/if}
        
        <!-- Статус -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Статус</h3>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 text-sm font-medium rounded-full border {getStatusClass(selectedRequest.status)}">
              {getStatusLabel(selectedRequest.status)}
            </span>
          </div>
        </div>
        
        <!-- Дата -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Дата создания</h3>
          <p class="text-sm text-gray-900">
            {new Date(selectedRequest.createdAt).toLocaleString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        <!-- Действия -->
        <div class="border-t border-gray-200 pt-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Изменить статус</h3>
          <div class="flex flex-wrap gap-2">
            {#if selectedRequest.status !== 'processing'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'processing')}
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                В обработку
              </button>
            {/if}
            {#if selectedRequest.status !== 'completed'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'completed')}
                class="px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 transition-colors"
              >
                Завершить
              </button>
            {/if}
            {#if selectedRequest.status !== 'canceled'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'canceled')}
                class="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Отменить
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

