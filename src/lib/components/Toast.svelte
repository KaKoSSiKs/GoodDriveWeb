<script>
  import { onMount } from 'svelte';
  
  let { message = '', type = 'success', duration = 3000, onClose = () => {} } = $props();
  
  let visible = $state(false); // Start invisible for animation
  let progress = $state(100);
  
  // Updated styles for "Premium Minimal" look
  const typeStyles = {
    success: 'bg-gray-900 text-white shadow-gray-900/20',
    error: 'bg-red-600 text-white shadow-red-600/20',
    warning: 'bg-orange-500 text-white shadow-orange-500/20',
    info: 'bg-blue-600 text-white shadow-blue-600/20'
  };
  
  const icons = {
    success: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`,
    error: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>`,
    warning: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
    info: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
  };
  
  function close() {
    visible = false;
    setTimeout(onClose, 300); // Wait for fade out
  }
  
  onMount(() => {
    setTimeout(() => visible = true, 10); // Trigger enter animation

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

<div 
  class="relative flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl min-w-[300px] max-w-md backdrop-blur-md transition-all duration-300 transform translate-y-0 {typeStyles[type]} {visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}"
  role="alert"
  style="margin-bottom: 0.75rem;"
>
  <div class="flex-shrink-0">{@html icons[type]}</div>
  
  <div class="flex-1 text-sm font-medium leading-snug">{message}</div>
  
  <button onclick={close} class="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors" aria-label="Закрыть">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  
  <!-- Progress bar (Subtle) -->
  <div class="absolute bottom-0 left-2 right-2 h-[2px] bg-white/10 rounded-full overflow-hidden">
    <div class="h-full bg-white/40 transition-all ease-linear rounded-full" style="width: {progress}%"></div>
  </div>
</div>
