<script>
  let {
    currentPage = 1,
    totalPages = 1,
    onPageChange = () => {}
  } = $props();
  
  let hasPages = $derived(totalPages > 1);
  
  let pageRange = $derived.by(() => {
    const delta = 2;
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
  <nav class="flex items-center justify-center gap-2 mt-8" aria-label="Пагинация">
    <!-- Previous Button -->
    <button
      onclick={handlePrevPage}
      disabled={currentPage === 1}
      class="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      aria-label="Назад"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <!-- Page Numbers -->
    <div class="flex items-center gap-1">
      {#each pageRange as page}
        {#if page === '...'}
          <span class="w-10 h-10 flex items-center justify-center text-gray-400">...</span>
        {:else}
          <button
            onclick={() => handlePageChange(page)}
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
              {page === currentPage 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        {/if}
      {/each}
    </div>
    
    <!-- Next Button -->
    <button
      onclick={handleNextPage}
      disabled={currentPage === totalPages}
      class="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      aria-label="Вперед"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </nav>
{/if}
