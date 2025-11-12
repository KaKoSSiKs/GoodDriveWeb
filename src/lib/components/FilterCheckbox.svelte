<script>
  // Пропсы компонента (Svelte 5 синтаксис)
  let {
    label = '',
    checked = $bindable(false),
    disabled = false,
    onToggle = () => {},
    count = null,
    showCount = true
  } = $props();
  
  // Обработчики
  function handleToggle() {
    if (disabled) return;
    onToggle(!checked);
  }
  
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  }
</script>

<div 
  class="flex items-center space-x-3 cursor-pointer {disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-50'} p-2 rounded-lg transition-colors"
  onclick={handleToggle}
  onkeydown={handleKeyDown}
  tabindex="0"
  role="checkbox"
  aria-checked={checked}
  aria-disabled={disabled}
>
  <!-- Кастомный чекбокс -->
  <div class="relative">
    <input
      type="checkbox"
      bind:checked
      disabled={disabled}
      class="sr-only"
      tabindex="-1"
    />
    
    <!-- Визуальный чекбокс -->
    <div class="w-5 h-5 border-2 rounded {checked ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'} flex items-center justify-center transition-colors">
      {#if checked}
        <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      {/if}
    </div>
  </div>
  
  <!-- Текст и счетчик -->
  <div class="flex-1 min-w-0">
    <span class="text-sm text-neutral-700 {checked ? 'font-medium' : ''}">
      {label}
    </span>
    
    {#if showCount && count !== null}
      <span class="text-xs text-neutral-500 ml-2">
        ({count})
      </span>
    {/if}
  </div>
  
  <!-- Индикатор активности -->
  {#if checked}
    <div class="w-2 h-2 bg-primary-500 rounded-full"></div>
  {/if}
</div>

<style>
  /* Фокус для доступности */
  div:focus {
    outline: 2px solid #F97316;
    outline-offset: 2px;
  }
  
  /* Анимация для чекбокса */
  .transition-colors {
    transition: all 0.2s ease-in-out;
  }
</style>


