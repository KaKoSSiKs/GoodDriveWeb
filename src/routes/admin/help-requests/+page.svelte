<script>
  import { onMount } from 'svelte';
  import { helpRequestsApi } from '$lib/utils/api.js';
  import { toastStore } from '$lib/stores/toast.js';
  
  let requests = $state([]);
  let isLoading = $state(true);
  let currentPage = $state(1);
  let totalPages = $state(1);
  let totalCount = $state(0);
  let statusFilter = $state('all');
  let selectedRequest = $state(null);
  let isDecodingVin = $state(false);
  
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
      toastStore.error('Ошибка загрузки запросов');
    } finally {
      isLoading = false;
    }
  }
  
  async function updateStatus(requestId, newStatus) {
    try {
      await helpRequestsApi.updateHelpRequestStatus(requestId, newStatus);
      await loadRequests();
      
      if (selectedRequest && selectedRequest.id === requestId) {
        selectedRequest.status = newStatus;
      }
      toastStore.success(`Статус обновлен: ${getStatusLabel(newStatus)}`);
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      toastStore.error('Не удалось обновить статус');
    }
  }
  
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
      new: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      canceled: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }
  
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
    try {
      const response = await helpRequestsApi.getHelpRequest(request.id);
      if (response.success && response.data) {
        selectedRequest = response.data;
      } else {
        selectedRequest = request;
      }
    } catch (error) {
      console.error('Error loading request details:', error);
      selectedRequest = request;
    }
  }
  
  function closeRequest() {
    selectedRequest = null;
  }
  
  async function reDecodeVin(requestId) {
    if (!confirm('Передекодировать VIN-номер? Данные об автомобиле будут обновлены.')) {
      return;
    }
    
    try {
      isDecodingVin = true;
      const response = await helpRequestsApi.reDecodeVin(requestId);
      
      if (response.success && response.data) {
        selectedRequest = response.data;
        await loadRequests();
        toastStore.success('VIN-номер успешно декодирован');
      } else {
        toastStore.error(response.error || 'Не удалось декодировать VIN-номер');
      }
    } catch (error) {
      console.error('Ошибка декодирования VIN:', error);
      toastStore.error('Ошибка при декодировании VIN-номера');
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
  <!-- Header -->
  <div>
    <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Запросы консультации</h1>
    <p class="text-gray-500 mt-2">Управление запросами от клиентов на подбор запчастей</p>
  </div>
  
  <!-- Filter Tabs -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex overflow-x-auto">
    {#each [
      { id: 'all', label: 'Все', count: totalCount },
      { id: 'new', label: 'Новые' },
      { id: 'processing', label: 'В обработке' },
      { id: 'completed', label: 'Завершенные' }
    ] as tab}
      <button
        onclick={() => handleStatusFilterChange(tab.id)}
        class="px-6 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap {statusFilter === tab.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
  
  {#if isLoading}
    <div class="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 flex justify-center">
      <div class="animate-spin w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full"></div>
    </div>
  {:else if requests.length > 0}
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Клиент</th>
              <th class="hidden md:table-cell text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Телефон</th>
              <th class="hidden md:table-cell text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">VIN</th>
              <th class="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Статус</th>
              <th class="hidden lg:table-cell text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Дата</th>
              <th class="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each requests as request}
              <tr 
                class="hover:bg-gray-50/50 transition-colors cursor-pointer group" 
                onclick={() => openRequest(request)}
              >
                <td class="py-4 px-6">
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-gray-900">{request.name}</span>
                    <a href="tel:{request.phone}" class="md:hidden text-xs text-gray-500 mt-1 hover:text-gray-900 transition-colors" onclick={(e) => e.stopPropagation()}>
                      {request.phone}
                    </a>
                  </div>
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-600 font-medium">
                  {request.phone}
                </td>
                <td class="hidden md:table-cell py-4 px-6 text-sm text-gray-600 font-mono">
                  {request.vin || '—'}
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border {getStatusClass(request.status)}">
                    {getStatusLabel(request.status)}
                  </span>
                </td>
                <td class="hidden lg:table-cell py-4 px-6 text-sm text-gray-500">
                  {new Date(request.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </td>
                <td class="py-4 px-6 text-right">
                  <button
                    class="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
                    onclick={(e) => { e.stopPropagation(); openRequest(request); }}
                    aria-label="Открыть запрос"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      
      {#if totalPages > 1}
        <div class="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
          <div class="text-sm text-gray-500">
            {((currentPage - 1) * 20) + 1} - {Math.min(currentPage * 20, totalCount)} из {totalCount}
          </div>
          <div class="flex gap-2">
            <button
              onclick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              class="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Назад
            </button>
            <button
              onclick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              class="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Вперед
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 text-center">
      <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">Запросов не найдено</h3>
      <p class="text-gray-500">Попробуйте изменить фильтр статуса</p>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if selectedRequest}
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden" 
    onclick={closeRequest}
    onkeydown={(e) => e.key === 'Escape' && closeRequest()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100" 
      onclick={(e) => e.stopPropagation()}
      role="region"
      tabindex="0"
    >
      <!-- Modal Header -->
      <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-10">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Запрос #{selectedRequest.id}</h2>
          <p class="text-sm text-gray-500 mt-1">
            {new Date(selectedRequest.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button 
          onclick={closeRequest}
          class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Modal Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
        <!-- Client Info -->
        <div class="bg-gray-50 rounded-xl p-5 border border-gray-100">
          <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Клиент</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <p class="text-xs text-gray-400 mb-1">Имя</p>
               <p class="text-sm font-bold text-gray-900">{selectedRequest.name}</p>
             </div>
             <div>
               <p class="text-xs text-gray-400 mb-1">Телефон</p>
               <a href="tel:{selectedRequest.phone}" class="text-sm font-bold text-blue-600 hover:text-blue-800">
                 {selectedRequest.phone}
               </a>
             </div>
          </div>
        </div>

        <!-- VIN & Vehicle Info -->
        {#if selectedRequest.vin}
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Автомобиль</h3>
              <span class="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
                {selectedRequest.vin}
              </span>
            </div>
            
            {#if selectedRequest.vehicleBrand}
               <div class="bg-blue-50/50 rounded-xl p-5 border border-blue-100 mb-4">
                 <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                      <h4 class="font-bold text-gray-900">{selectedRequest.vehicleBrand} {selectedRequest.vehicleModel}</h4>
                      <p class="text-xs text-gray-500">{selectedRequest.vehicleYear} г.в.</p>
                    </div>
                 </div>
                 
                 <div class="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    {#if selectedRequest.engineVolume}
                      <div class="flex justify-between text-gray-600">
                        <span>Двигатель:</span>
                        <span class="font-medium text-gray-900">{(selectedRequest.engineVolume / 1000).toFixed(1)} л</span>
                      </div>
                    {/if}
                    {#if selectedRequest.enginePowerHp}
                      <div class="flex justify-between text-gray-600">
                        <span>Мощность:</span>
                        <span class="font-medium text-gray-900">{selectedRequest.enginePowerHp} л.с.</span>
                      </div>
                    {/if}
                    {#if selectedRequest.transmissionType}
                      <div class="flex justify-between text-gray-600">
                        <span>Коробка:</span>
                        <span class="font-medium text-gray-900">{selectedRequest.transmissionType}</span>
                      </div>
                    {/if}
                    {#if selectedRequest.driveType}
                      <div class="flex justify-between text-gray-600">
                        <span>Привод:</span>
                        <span class="font-medium text-gray-900">{selectedRequest.driveType}</span>
                      </div>
                    {/if}
                 </div>
               </div>
            {:else}
               <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 text-center">
                  <p class="text-sm text-gray-500 mb-3">Данные автомобиля не декодированы</p>
                  <button
                    onclick={() => reDecodeVin(selectedRequest.id)}
                    disabled={isDecodingVin}
                    class="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm text-sm py-2 px-4 rounded-lg"
                  >
                    {isDecodingVin ? 'Загрузка...' : 'Декодировать VIN'}
                  </button>
               </div>
            {/if}
          </div>
        {/if}
        
        <!-- Message -->
        {#if selectedRequest.message}
          <div>
            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Сообщение клиента</h3>
            <div class="bg-gray-50 rounded-xl p-5 border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {selectedRequest.message}
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Footer Actions -->
      <div class="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3 justify-between items-center">
         <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">Текущий статус:</span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border {getStatusClass(selectedRequest.status)}">
              {getStatusLabel(selectedRequest.status)}
            </span>
         </div>
         
         <div class="flex gap-2">
            {#if selectedRequest.status !== 'processing'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'processing')}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
              >
                В работу
              </button>
            {/if}
            {#if selectedRequest.status !== 'completed'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'completed')}
                class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors"
              >
                Завершить
              </button>
            {/if}
            {#if selectedRequest.status !== 'canceled'}
              <button
                onclick={() => updateStatus(selectedRequest.id, 'canceled')}
                class="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium shadow-sm transition-colors"
              >
                Отменить
              </button>
            {/if}
         </div>
      </div>
    </div>
  </div>
{/if}
