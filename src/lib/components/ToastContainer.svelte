<script>
  import { toastStore } from '$lib/stores/toast.js';
  import Toast from './Toast.svelte';
  
  // Svelte 5 store subscription
  let toasts = $state([]);
  
  $effect(() => {
    const unsubscribe = toastStore.subscribe(value => {
      toasts = value;
    });
    return unsubscribe;
  });
</script>

<div class="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
  <div class="pointer-events-auto">
    {#each toasts as toast (toast.id)}
      <Toast 
        message={toast.message} 
        type={toast.type} 
        duration={toast.duration} 
        onClose={() => toastStore.remove(toast.id)} 
      />
    {/each}
  </div>
</div>
