<script>
  import { partsApi, brandsApi, warehousesApi, formatUtils } from '$lib/utils/api.js';
  
  let { part, isOpen, onClose, onUpdate } = $props();
  
  let isUpdating = $state(false);
  let brands = $state([]);
  let warehouses = $state([]);
  let uploadedImages = $state([]);
  let isUploadingImage = $state(false);
  
  let formData = $state({
    title: '',
    manufacturer_number: '',
    brand: '',
    brand_name: '',
    warehouse: '',
    warehouse_name: '',
    stock: 0,
    price_opt: 0,
    cost_price: 0,
    description: '',
    use_custom_brand: false,
    use_custom_warehouse: false
  });
  
  async function loadReferences() {
    try {
      const [brandsData, warehousesData] = await Promise.all([
        brandsApi.getBrands({ page_size: 100 }),
        warehousesApi.getWarehouses({ page_size: 100 })
      ]);
      brands = brandsData.results || brandsData;
      warehouses = warehousesData.results || warehousesData;
    } catch (error) {
      console.error('Error loading references:', error);
    }
  }
  
  async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0 || !part) return;
    
    try {
      isUploadingImage = true;
      let successCount = 0;
      let errorCount = 0;
      const errors = [];
      
      for (const file of files) {
        try {
          // Проверяем размер файла (максимум 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            errors.push(`${file.name}: файл слишком большой (максимум 10MB)`);
            errorCount++;
            continue;
          }
          
          // Проверяем тип файла
          if (!file.type.startsWith('image/')) {
            errors.push(`${file.name}: файл должен быть изображением`);
            errorCount++;
            continue;
          }
          
          // Сразу загружаем изображение на сервер
          const result = await partsApi.uploadPartImage(part.id, file);
          uploadedImages.push({
            url: result.image_url,
            id: result.id,
            order_index: uploadedImages.length // Новое изображение добавляется в конец
          });
          successCount++;
        } catch (fileError) {
          console.error(`Error uploading image ${file.name}:`, fileError);
          errors.push(`${file.name}: ${fileError.message || 'Ошибка загрузки'}`);
          errorCount++;
        }
      }
      
      uploadedImages = [...uploadedImages];
      
      // Показываем результат
      if (successCount > 0 && errorCount === 0) {
        alert(`Успешно загружено изображений: ${successCount}`);
      } else if (successCount > 0 && errorCount > 0) {
        alert(`Загружено: ${successCount}, ошибок: ${errorCount}\n\n${errors.join('\n')}`);
      } else {
        alert(`Ошибка загрузки изображений:\n\n${errors.join('\n')}`);
      }
      
      if (successCount > 0 && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Ошибка загрузки изображения: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      isUploadingImage = false;
      // Сбрасываем input, чтобы можно было загрузить тот же файл снова
      event.target.value = '';
    }
  }
  
  async function removeImage(index) {
    const image = uploadedImages[index];
    if (!image || !part) return;
    
    // Если изображение уже сохранено на сервере (имеет id), удаляем его
    if (image.id) {
      try {
        await partsApi.deletePartImage(part.id, image.id);
      } catch (error) {
        console.error('Error deleting image:', error);
        alert(`Ошибка удаления изображения: ${error.message || 'Неизвестная ошибка'}`);
        return;
      }
    }
    
    // Удаляем из локального массива
    uploadedImages.splice(index, 1);
    uploadedImages = [...uploadedImages];
    
    // Обновляем порядок оставшихся изображений на сервере
    await updateImageOrders();
    
    // Обновляем данные товара
    if (onUpdate) onUpdate();
  }
  
  async function handleSave() {
    try {
      isUpdating = true;
      
      // Создаём бренд если нужно
      let brandId = formData.brand;
      if (formData.use_custom_brand && formData.brand_name) {
        try {
          const newBrand = await brandsApi.createBrand({
            name: formData.brand_name,
            country: 'Не указано'
          });
          brandId = newBrand.id;
        } catch (error) {
          console.error('Error creating brand:', error);
          alert('Ошибка создания бренда');
          return;
        }
      }
      
      // Создаём склад если нужно
      let warehouseId = formData.warehouse;
      if (formData.use_custom_warehouse && formData.warehouse_name) {
        try {
          const newWarehouse = await warehousesApi.createWarehouse({
            name: formData.warehouse_name,
            address: 'Не указано'
          });
          warehouseId = newWarehouse.id;
        } catch (error) {
          console.error('Error creating warehouse:', error);
          alert('Ошибка создания склада');
          return;
        }
      }
      
      const data = {
        title: formData.title,
        manufacturer_number: formData.manufacturer_number,
        brand_id: parseInt(brandId),
        warehouse_id: parseInt(warehouseId),
        stock: parseInt(formData.stock),
        price_opt: parseFloat(formData.price_opt),
        cost_price: parseFloat(formData.cost_price) || 0,
        description: formData.description,
      };
      
      await partsApi.updatePart(part.id, data);
      
      if (onUpdate) onUpdate();
      if (onClose) onClose();
      
      alert('Товар успешно обновлён!');
    } catch (error) {
      console.error('Error updating part:', error);
      alert('Ошибка обновления товара');
    } finally {
      isUpdating = false;
    }
  }
  
  $effect(() => {
    if (isOpen && part) {
      loadReferences();
      formData = {
        title: part.title || '',
        manufacturer_number: part.manufacturer_number || '',
        brand: part.brand?.id || '',
        brand_name: '',
        warehouse: part.warehouse?.id || '',
        warehouse_name: '',
        stock: part.stock || 0,
        price_opt: part.price_opt || 0,
        cost_price: part.cost_price || 0,
        description: part.description || '',
        use_custom_brand: false,
        use_custom_warehouse: false
      };
      // Загружаем существующие изображения товара, сортируем по orderIndex
      uploadedImages = (part.images || [])
        .map(img => ({
          url: img.image_url || img.url || '',
          id: img.id,
          order_index: img.order_index || img.orderIndex || 0
        }))
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });
  
  // Функции для изменения порядка изображений
  async function moveImageUp(index) {
    if (index === 0 || !part) return;
    
    const images = [...uploadedImages];
    [images[index - 1], images[index]] = [images[index], images[index - 1]];
    
    // Обновляем локально
    uploadedImages = images;
    
    // Обновляем на сервере
    await updateImageOrders();
  }
  
  async function moveImageDown(index) {
    if (index === uploadedImages.length - 1 || !part) return;
    
    const images = [...uploadedImages];
    [images[index], images[index + 1]] = [images[index + 1], images[index]];
    
    // Обновляем локально
    uploadedImages = images;
    
    // Обновляем на сервере
    await updateImageOrders();
  }
  
  async function updateImageOrders() {
    if (!part) return;
    
    try {
      // Обновляем orderIndex для всех изображений
      const promises = uploadedImages.map((img, index) => {
        if (img.id) {
          return partsApi.updateImageOrder(part.id, img.id, index);
        }
        return Promise.resolve();
      });
      
      await Promise.all(promises);
      
      // Обновляем локальные order_index
      uploadedImages = uploadedImages.map((img, index) => ({
        ...img,
        order_index: index
      }));
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating image orders:', error);
      alert(`Ошибка обновления порядка изображений: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" 
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-product-title"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" 
      onclick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Содержимое модального окна"
      tabindex="0"
    >
      <div class="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 id="edit-product-title" class="text-2xl font-bold text-gray-900">Редактировать товар</h2>
        <button onclick={onClose} aria-label="Закрыть" class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Название -->
        <div>
          <label for="edit-title" class="block text-sm font-medium text-gray-700 mb-2">Название товара *</label>
          <input id="edit-title" type="text" bind:value={formData.title} required class="input w-full" />
        </div>
        
        <!-- Артикул -->
        <div>
          <label for="edit-manufacturer-number" class="block text-sm font-medium text-gray-700 mb-2">Артикул</label>
          <input id="edit-manufacturer-number" type="text" bind:value={formData.manufacturer_number} class="input w-full" />
        </div>
        
        <!-- Бренд -->
        <div>
          <label for="edit-brand-select" class="block text-sm font-medium text-gray-700 mb-2">Бренд *</label>
          <div class="flex items-center space-x-2 mb-2">
            <label class="flex items-center">
              <input type="radio" bind:group={formData.use_custom_brand} value={false} class="mr-2" />
              <span class="text-sm">Выбрать из списка</span>
            </label>
            <label class="flex items-center">
              <input type="radio" bind:group={formData.use_custom_brand} value={true} class="mr-2" />
              <span class="text-sm">Ввести свой</span>
            </label>
          </div>
          {#if formData.use_custom_brand}
            <input id="edit-brand-custom" type="text" bind:value={formData.brand_name} placeholder="Введите название бренда" class="input w-full" />
          {:else}
            <select id="edit-brand-select" bind:value={formData.brand} class="input w-full">
              <option value="">Выберите бренд</option>
              {#each brands as brand}
                <option value={brand.id}>{brand.name}</option>
              {/each}
            </select>
          {/if}
        </div>
        
        <!-- Склад -->
        <div>
          <label for="edit-warehouse-select" class="block text-sm font-medium text-gray-700 mb-2">Склад *</label>
          <div class="flex items-center space-x-2 mb-2">
            <label class="flex items-center">
              <input type="radio" bind:group={formData.use_custom_warehouse} value={false} class="mr-2" />
              <span class="text-sm">Выбрать из списка</span>
            </label>
            <label class="flex items-center">
              <input type="radio" bind:group={formData.use_custom_warehouse} value={true} class="mr-2" />
              <span class="text-sm">Ввести свой</span>
            </label>
          </div>
          {#if formData.use_custom_warehouse}
            <input id="edit-warehouse-custom" type="text" bind:value={formData.warehouse_name} placeholder="Введите название склада" class="input w-full" />
          {:else}
            <select id="edit-warehouse-select" bind:value={formData.warehouse} class="input w-full">
              <option value="">Выберите склад</option>
              {#each warehouses as warehouse}
                <option value={warehouse.id}>{warehouse.name}</option>
              {/each}
            </select>
          {/if}
        </div>
        
        <!-- Цены и количество -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="edit-stock" class="block text-sm font-medium text-gray-700 mb-2">Количество на складе *</label>
            <input id="edit-stock" type="number" bind:value={formData.stock} min="0" class="input w-full" />
          </div>
          <div>
            <label for="edit-price-opt" class="block text-sm font-medium text-gray-700 mb-2">Цена продажи (₽) *</label>
            <input id="edit-price-opt" type="number" step="0.01" bind:value={formData.price_opt} min="0" class="input w-full" />
          </div>
          <div>
            <label for="edit-cost-price" class="block text-sm font-medium text-gray-700 mb-2">Себестоимость (₽)</label>
            <input id="edit-cost-price" type="number" step="0.01" bind:value={formData.cost_price} min="0" class="input w-full" />
          </div>
          <div>
            <label for="edit-margin" class="block text-sm font-medium text-gray-700 mb-2">Маржа</label>
            <div class="input w-full bg-gray-50">
              {formData.price_opt > 0 ? ((formData.price_opt - formData.cost_price) / formData.price_opt * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
        
        <!-- Описание -->
        <div>
          <label for="edit-description" class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea id="edit-description" bind:value={formData.description} rows="3" class="input w-full"></textarea>
        </div>
        
        <!-- Изображения -->
        <div>
          <label for="edit-images" class="block text-sm font-medium text-gray-700 mb-2">Изображения</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input 
              id="edit-images"
              type="file" 
              accept="image/*" 
              multiple 
              onchange={handleImageUpload}
              class="hidden"
            />
            <label for="edit-images" class="cursor-pointer flex flex-col items-center">
              <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-gray-600">Нажмите для загрузки изображений</span>
            </label>
          </div>
          
          {#if uploadedImages.length > 0}
            <div class="grid grid-cols-4 gap-2 mt-4">
              {#each uploadedImages as image, index}
                <div class="relative group">
                  <img src={image.url} alt="" class="w-full h-24 object-cover rounded-lg border-2 border-gray-200" />
                  
                  <!-- Кнопки управления порядком -->
                  <div class="absolute top-1 left-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onclick={() => moveImageUp(index)}
                      disabled={index === 0}
                      class="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      title="Переместить вверх"
                    >
                      ↑
                    </button>
                    <button 
                      onclick={() => moveImageDown(index)}
                      disabled={index === uploadedImages.length - 1}
                      class="w-6 h-6 bg-blue-500 text-white rounded flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      title="Переместить вниз"
                    >
                      ↓
                    </button>
                  </div>
                  
                  <!-- Кнопка удаления -->
                  <button 
                    onclick={() => removeImage(index)}
                    class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить изображение"
                  >
                    ×
                  </button>
                  
                  <!-- Индикатор порядка -->
                  <div class="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    #{index + 1}
                  </div>
                </div>
              {/each}
            </div>
            <p class="text-xs text-gray-500 mt-2">Наведите курсор на изображение, чтобы увидеть кнопки управления порядком</p>
          {/if}
        </div>
      </div>
      
      <!-- Кнопки -->
      <div class="p-6 border-t border-gray-200 flex space-x-3">
        <button 
          onclick={handleSave}
          disabled={isUpdating}
          class="btn-primary flex-1"
        >
          {isUpdating ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button onclick={onClose} class="btn-outline flex-1">Отмена</button>
      </div>
    </div>
  </div>
{/if}
