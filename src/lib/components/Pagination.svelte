<script>
  // Пропсы компонента (Svelte 5 синтаксис)
  let {
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {}
  } = $props();
  
  // Производные значения
  let hasPages = $derived(totalPages > 1);
  let showFirstPage = $derived(currentPage > 3);
  let showLastPage = $derived(currentPage < totalPages - 2);
  let showPrevEllipsis = $derived(currentPage > 4);
  let showNextEllipsis = $derived(currentPage < totalPages - 3);
  
  // Вычисляем диапазон страниц для отображения
  let pageRange = $derived(() => {
    const delta = 2; // Количество страниц с каждой стороны от текущей
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }
    
    if (range[0] > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    
    rangeWithDots.push(...range);
    
    if (range[range.length - 1] < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }
    
    return rangeWithDots;
  });
  
  // Обработчики
  function handlePageChange(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }
  
  function handlePrevPage() {
    handlePageChange(currentPage - 1);
  }
  
  function handleNextPage() {
    handlePageChange(currentPage + 1);
  }
</script>

{#if hasPages}
  <nav class="flex items-center justify-center space-x-1" aria-label="Пагинация">
    <!-- Кнопка "Назад" -->
    <button
      onclick={handlePrevPage}
      disabled={currentPage === 1}
      class="btn-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
      aria-label="Предыдущая страница"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      <span class="hidden sm:inline">Назад</span>
    </button>
    
    <!-- Номера страниц -->
    <div class="flex items-center space-x-1">
      {#each pageRange() as page}
        {#if page === '...'}
          <span class="px-3 py-2 text-neutral-500">...</span>
        {:else}
          <button
            onclick={() => handlePageChange(page)}
            class="btn {page === currentPage ? 'btn-primary' : 'btn-outline'}"
            aria-label="Страница {page}"
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        {/if}
      {/each}
    </div>
    
    <!-- Кнопка "Вперед" -->
    <button
      onclick={handleNextPage}
      disabled={currentPage === totalPages}
      class="btn-outline disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
      aria-label="Следующая страница"
    >
      <span class="hidden sm:inline">Вперед</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </nav>
  
  <!-- Информация о страницах -->
  <div class="text-center mt-4 text-sm text-neutral-600">
    Страница {currentPage} из {totalPages}
  </div>
{/if}


