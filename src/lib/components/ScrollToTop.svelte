<script>
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let visible = $state(false);

  onMount(() => {
    if (browser) {
      const handleScroll = () => {
        visible = window.scrollY > 300;
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  });

  function scrollToTop() {
    if (browser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
</script>

{#if visible}
  <button
    onclick={scrollToTop}
    class="fixed bottom-8 right-8 z-40 w-12 h-12 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
    aria-label="Scroll to top"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  </button>
{/if}

