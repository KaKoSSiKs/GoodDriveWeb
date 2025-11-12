<script>
  import { toastStore } from '$lib/stores/toast.js';
  import Toast from './Toast.svelte';
  
  let toasts = $state([]);
  
  toastStore.subscribe(value => {
    toasts = value;
  });
  
  function handleClose(id) {
    toastStore.remove(id);
  }
</script>

<div class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div class="pointer-events-auto">
      <Toast
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
        onClose={() => handleClose(toast.id)}
      />
    </div>
  {/each}
</div>

