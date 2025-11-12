# ♿ Accessibility Guide - GoodDrive

## 📋 Обзор

Руководство по улучшению доступности (accessibility) интернет-магазина GoodDrive для соответствия стандартам WCAG 2.1 Level AA.

**Текущий A11y Score: 75/100**  
**Цель: 95+/100**

---

## 🎯 Стандарты и требования

### WCAG 2.1 Principles (POUR)

1. **Perceivable** - Контент должен быть воспринимаемым
2. **Operable** - Интерфейс должен быть управляемым
3. **Understandable** - Контент и интерфейс понятны
4. **Robust** - Контент работает с assistive technologies

---

## ✅ Реализованные улучшения

### 1. Skip Navigation

```html
<!-- app.html -->
<a href="#main-content" class="skip-to-content">
  Перейти к содержанию
</a>
```

```css
/* app.css */
.skip-to-content {
  position: fixed;
  top: 0;
  left: 0;
  transform: translateY(-100%);
  transition: transform 0.3s;
}

.skip-to-content:focus {
  transform: translateY(0);
}
```

✅ **Результат:** Пользователи с клавиатурой могут быстро перейти к контенту

### 2. Focus Indicators

```css
/* app.css */
*:focus-visible {
  outline: 2px solid #991b1b;
  outline-offset: 2px;
}
```

✅ **Результат:** Четкая индикация фокуса для keyboard navigation

### 3. Semantic HTML

```svelte
<!-- Используются семантические теги -->
<header>
<nav>
<main>
<article>
<section>
<footer>
```

✅ **Результат:** Screen readers правильно интерпретируют структуру

---

## ❌ Критические проблемы

### 1. Отсутствие ARIA Labels

#### Проблема:

```svelte
<!-- PartCard.svelte - ПЛОХО -->
<button onclick={handleAddToCart}>
  <svg>...</svg>
  Добавить в корзину
</button>
```

Проблемы:
- Нет контекста для screen readers
- Не понятно КАКОЙ товар добавляется

#### Решение:

```svelte
<!-- PartCard.svelte - ХОРОШО -->
<button 
  onclick={handleAddToCart}
  aria-label="Добавить {part.title} в корзину"
  aria-describedby="part-price-{part.id}"
>
  <svg aria-hidden="true">...</svg>
  Добавить в корзину
</button>

<span id="part-price-{part.id}" class="sr-only">
  Цена: {formatPrice(part.price_opt)}
</span>
```

### 2. Images без alt текста

#### Проблема:

```svelte
<!-- ПЛОХО -->
<img src={part.image_url} />

<!-- ПЛОХО - бесполезный alt -->
<img src={part.image_url} alt="image" />
```

#### Решение:

```svelte
<!-- ХОРОШО - описательный alt -->
<img 
  src={part.image_url} 
  alt="{part.title} от {part.brand.name} - артикул {part.original_number}"
  loading="lazy"
/>

<!-- Декоративные изображения -->
<img src="/decorative-pattern.svg" alt="" role="presentation" />
```

### 3. Контрастность цветов

#### Текущие проблемы:

```css
/* ПЛОХО - недостаточный контраст */
.text-gray-400 { /* #9ca3af на белом = 2.8:1 */ }

/* Требуется минимум 4.5:1 для текста */
```

#### Решение:

```css
/* ХОРОШО - достаточный контраст */
.text-gray-600 { /* #4b5563 на белом = 7.6:1 */ }
.text-gray-700 { /* #374151 на белом = 10.7:1 */ }

/* Для крупного текста (18px+) минимум 3:1 */
```

**Инструмент проверки:** https://webaim.org/resources/contrastchecker/

### 4. Form Labels

#### Проблема:

```svelte
<!-- ПЛОХО -->
<input type="text" placeholder="Ваше имя" />
```

#### Решение:

```svelte
<!-- ХОРОШО -->
<label for="customer-name" class="block mb-2">
  Ваше имя
  <span class="text-red-600" aria-label="обязательное поле">*</span>
</label>
<input 
  type="text"
  id="customer-name"
  name="name"
  placeholder="Иван Иванов"
  required
  aria-required="true"
  aria-describedby="name-hint"
/>
<span id="name-hint" class="text-sm text-gray-600">
  Укажите ваше полное имя
</span>

<!-- Сообщение об ошибке -->
{#if errors.name}
  <p id="name-error" class="text-red-600" role="alert">
    {errors.name}
  </p>
{/if}
```

### 5. Keyboard Navigation

#### Проблемы:

1. **Модальные окна не ловят фокус**
2. **Нет Escape для закрытия модалок**
3. **Dropdowns не управляются клавиатурой**

#### Решение: Focus Trap для модальных окон

```svelte
<!-- Modal.svelte -->
<script>
  import { onMount } from 'svelte';
  import { trapFocus } from '$lib/utils/a11y';
  
  let { isOpen = false, onClose } = $props();
  let modalRef = $state(null);
  
  onMount(() => {
    if (!modalRef) return;
    
    const cleanup = trapFocus(modalRef);
    
    // Escape для закрытия
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      cleanup();
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

{#if isOpen}
  <div 
    class="modal-backdrop"
    onclick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <div 
      bind:this={modalRef}
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
    >
      <h2 id="modal-title">Заголовок модального окна</h2>
      
      <button 
        onclick={onClose}
        aria-label="Закрыть модальное окно"
        class="close-button"
      >
        <svg aria-hidden="true">...</svg>
      </button>
      
      <!-- Content -->
    </div>
  </div>
{/if}
```

**Focus Trap Utility:**

```typescript
// lib/utils/a11y.ts
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  // Фокус на первый элемент
  firstFocusable?.focus();
  
  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
  
  element.addEventListener('keydown', handleTab);
  
  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}
```

---

## 🎯 Comprehensive Fixes

### 1. Product Card Component

```svelte
<!-- lib/components/PartCard.svelte - Улучшенная версия -->
<script>
  let { part, onAddToCart } = $props();
  
  const hasImage = part.images?.length > 0;
  const mainImage = hasImage ? part.images[0] : null;
  const isInStock = part.available > 0;
</script>

<article 
  class="card"
  aria-labelledby="part-title-{part.id}"
  aria-describedby="part-description-{part.id}"
>
  <!-- Image -->
  <a href="/product/{part.id}" aria-label="Перейти к {part.title}">
    {#if mainImage}
      <img
        src={mainImage.image_url}
        alt="{part.title} от {part.brand.name}"
        loading="lazy"
        decoding="async"
        width="400"
        height="400"
      />
    {:else}
      <div 
        class="placeholder-image"
        role="img"
        aria-label="Изображение отсутствует"
      >
        <svg aria-hidden="true">...</svg>
      </div>
    {/if}
  </a>
  
  <!-- Content -->
  <div class="card-content">
    <h3 id="part-title-{part.id}" class="text-lg font-bold">
      <a href="/product/{part.id}" class="hover:text-primary-600">
        {part.title}
      </a>
    </h3>
    
    <p id="part-description-{part.id}" class="sr-only">
      {part.title} от производителя {part.brand.name}.
      {#if part.description}
        {part.description}
      {/if}
      Цена: {formatPrice(part.price_opt)}.
      {#if isInStock}
        В наличии: {part.available} штук.
      {:else}
        Временно отсутствует в наличии.
      {/if}
    </p>
    
    <!-- Brand -->
    <p class="text-sm text-gray-600">
      <span class="sr-only">Производитель:</span>
      {part.brand.name}
    </p>
    
    <!-- Price -->
    <p 
      class="text-2xl font-bold text-primary-600"
      aria-label="Цена {formatPrice(part.price_opt)}"
    >
      {formatPrice(part.price_opt)}
    </p>
    
    <!-- Availability -->
    {#if isInStock}
      <p class="flex items-center gap-2 text-green-600">
        <svg aria-hidden="true" class="w-5 h-5">...</svg>
        <span>В наличии: {part.available} шт</span>
      </p>
    {:else}
      <p class="flex items-center gap-2 text-orange-600">
        <svg aria-hidden="true" class="w-5 h-5">...</svg>
        <span>Под заказ</span>
      </p>
    {/if}
    
    <!-- Actions -->
    <div class="flex gap-2 mt-4">
      <button
        onclick={() => onAddToCart({ detail: { part } })}
        disabled={!isInStock}
        aria-label="Добавить {part.title} в корзину"
        aria-disabled={!isInStock}
        class="btn-primary flex-1"
      >
        <svg aria-hidden="true" class="w-5 h-5">...</svg>
        <span>В корзину</span>
      </button>
      
      <button
        aria-label="Добавить {part.title} в избранное"
        class="btn-ghost"
      >
        <svg aria-hidden="true" class="w-5 h-5">...</svg>
        <span class="sr-only">В избранное</span>
      </button>
    </div>
  </div>
</article>
```

### 2. Search Autocomplete

```svelte
<!-- SearchAutocomplete.svelte - Accessible версия -->
<script>
  let searchQuery = $state('');
  let results = $state([]);
  let selectedIndex = $state(-1);
  let isOpen = $state(false);
  
  function handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        if (selectedIndex >= 0) {
          selectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        isOpen = false;
        selectedIndex = -1;
        break;
    }
  }
</script>

<div class="search-wrapper" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
  <label for="search-input" class="sr-only">
    Поиск автозапчастей
  </label>
  
  <input
    id="search-input"
    type="search"
    bind:value={searchQuery}
    onkeydown={handleKeydown}
    placeholder="Поиск..."
    autocomplete="off"
    aria-autocomplete="list"
    aria-controls="search-results"
    aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : ''}
  />
  
  {#if isOpen && results.length > 0}
    <ul 
      id="search-results"
      role="listbox"
      aria-label="Результаты поиска"
    >
      {#each results as result, index}
        <li
          id="result-{index}"
          role="option"
          aria-selected={index === selectedIndex}
          class:selected={index === selectedIndex}
        >
          <button onclick={() => selectResult(result)}>
            {result.title}
            <span class="text-sm text-gray-600">
              {result.brand.name}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

### 3. Form Validation

```svelte
<!-- CheckoutForm.svelte - Accessible версия -->
<script>
  let formData = $state({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  
  let errors = $state({});
  let touched = $state({});
  
  function validateField(field) {
    // Validation logic
    const newErrors = { ...errors };
    
    if (!formData[field]) {
      newErrors[field] = 'Это поле обязательно';
    } else {
      delete newErrors[field];
    }
    
    errors = newErrors;
  }
  
  function handleBlur(field) {
    touched[field] = true;
    validateField(field);
  }
</script>

<form onsubmit={handleSubmit} novalidate>
  <!-- Name Field -->
  <div class="form-group">
    <label for="checkout-name" class="required">
      Ваше имя
      <span aria-label="обязательное поле" class="text-red-600">*</span>
    </label>
    
    <input
      id="checkout-name"
      type="text"
      bind:value={formData.name}
      onblur={() => handleBlur('name')}
      required
      aria-required="true"
      aria-invalid={!!errors.name}
      aria-describedby={errors.name ? 'name-error' : 'name-hint'}
      class:error={errors.name && touched.name}
    />
    
    <span id="name-hint" class="hint">
      Укажите ваше полное имя
    </span>
    
    {#if errors.name && touched.name}
      <p id="name-error" class="error-message" role="alert">
        <svg aria-hidden="true">...</svg>
        {errors.name}
      </p>
    {/if}
  </div>
  
  <!-- Email Field -->
  <div class="form-group">
    <label for="checkout-email" class="required">
      Email
      <span aria-label="обязательное поле" class="text-red-600">*</span>
    </label>
    
    <input
      id="checkout-email"
      type="email"
      bind:value={formData.email}
      onblur={() => handleBlur('email')}
      required
      aria-required="true"
      aria-invalid={!!errors.email}
      aria-describedby={errors.email ? 'email-error' : 'email-hint'}
      autocomplete="email"
    />
    
    <span id="email-hint" class="hint">
      Мы отправим подтверждение заказа на этот email
    </span>
    
    {#if errors.email && touched.email}
      <p id="email-error" class="error-message" role="alert">
        {errors.email}
      </p>
    {/if}
  </div>
  
  <!-- Submit -->
  <button
    type="submit"
    disabled={Object.keys(errors).length > 0}
    aria-disabled={Object.keys(errors).length > 0}
  >
    Оформить заказ
  </button>
</form>
```

---

## 🧪 Тестирование Accessibility

### 1. Automated Testing

```bash
# axe-core
npm install --save-dev @axe-core/playwright

# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=http://localhost:3000
```

```javascript
// tests/accessibility.spec.js
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('Homepage accessibility', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await injectAxe(page);
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true
    }
  });
});

test('Catalog accessibility', async ({ page }) => {
  await page.goto('http://localhost:3000/catalog');
  await injectAxe(page);
  await checkA11y(page);
});
```

### 2. Manual Testing

#### Keyboard Navigation Checklist:

- [ ] Tab через все интерактивные элементы
- [ ] Shift+Tab обратный порядок
- [ ] Enter активирует кнопки и ссылки
- [ ] Space активирует checkboxes
- [ ] Arrow keys для radio buttons и selects
- [ ] Escape закрывает модальные окна
- [ ] Фокус виден на всех элементах

#### Screen Reader Testing:

**NVDA (Windows - бесплатно):**
```
1. Скачать NVDA: https://www.nvaccess.org/
2. Запустить NVDA
3. Открыть сайт
4. Проверить:
   - Читаются ли заголовки (H1-H6)
   - Объявляются ли кнопки как "button"
   - Есть ли alt text у изображений
   - Работает ли navigation
```

**VoiceOver (Mac/iOS - встроенный):**
```
Mac: Cmd + F5
iOS: Settings → Accessibility → VoiceOver

Проверить:
- Все интерактивные элементы
- Формы и валидация
- Модальные окна
```

### 3. Browser Extensions

- **axe DevTools** (Chrome/Firefox) - Автоматический аудит
- **WAVE** - Визуальная проверка accessibility
- **Lighthouse** (Chrome DevTools) - Комплексный аудит

---

## 📊 Accessibility Checklist

### Критичные (Level A):

- [ ] Все изображения имеют alt text
- [ ] Все формы имеют labels
- [ ] Keyboard navigation работает
- [ ] Контрастность текста минимум 4.5:1
- [ ] Нет автоплей аудио/видео

### Важные (Level AA):

- [ ] Контрастность текста 7:1 для важных элементов
- [ ] Focus indicators видимы
- [ ] ARIA labels для иконок-кнопок
- [ ] Heading hierarchy (H1 → H2 → H3)
- [ ] Skip navigation link

### Дополнительные (Level AAA):

- [ ] Альтернативные способы аутентификации (не только CAPTCHA)
- [ ] Расширенные подсказки и hints
- [ ] Увеличенные touch targets (48x48px)

---

## 🎯 Ожидаемые результаты

После внедрения всех улучшений:

| Метрика | До | После | Улучшение |
|---------|-------|--------|-----------|
| Lighthouse A11y Score | 75 | 95+ | +27% |
| WCAG Level | A (частично) | AA | ⬆️ |
| Keyboard Navigation | 60% | 100% | +40% |
| Screen Reader Support | Базовый | Полный | ⬆️ |

---

**Дата создания:** 12 ноября 2025  
**Автор:** Senior Full-Stack Developer  
**Версия:** 1.0

