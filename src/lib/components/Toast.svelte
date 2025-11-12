<script>
  import { onMount } from 'svelte';
  
  let { message = '', type = 'success', duration = 3000, onClose = () => {} } = $props();
  
  let visible = $state(true);
  let progress = $state(100);
  
  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };
  
  const icons = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`,
    warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
  };
  
  function close() {
    visible = false;
    setTimeout(onClose, 300);
  }
  
  onMount(() => {
    const interval = 50;
    const steps = duration / interval;
    const decrement = 100 / steps;
    
    const timer = setInterval(() => {
      progress -= decrement;
      if (progress <= 0) {
        clearInterval(timer);
        close();
      }
    }, interval);
    
    return () => clearInterval(timer);
  });
</script>

{#if visible}
  <div class="flex items-center space-x-3 {typeStyles[type]} px-6 py-4 rounded-lg shadow-2xl min-w-[300px] max-w-md" role="alert">
    <div class="flex-shrink-0">{@html icons[type]}</div>
    <div class="flex-1"><p class="font-medium">{message}</p></div>
    <button onclick={close} class="flex-shrink-0 hover:opacity-75" aria-label="Закрыть">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    <div class="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
      <div class="h-full bg-white/50 transition-all ease-linear" style="width: {progress}%"></div>
    </div>
  </div>
{/if}

