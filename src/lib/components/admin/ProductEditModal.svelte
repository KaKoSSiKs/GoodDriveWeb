<script>
  import { partsApi, brandsApi, warehousesApi, formatUtils } from '$lib/utils/api.js';
  import { toastStore } from '$lib/stores/toast.js';
  
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
    reserve: 0, // Add reserve field
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
      toastStore.error('Ошибка загрузки справочников');
    }
  }
  
  async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0 || !part) return;
    
    try {
      isUploadingImage = true;
      let successCount = 0;
      let errorCount = 0;
      
      for (const file of files) {
        try {
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            toastStore.warning(`${file.name}: файл слишком большой (максимум 10MB)`);
            errorCount++;
            continue;
          }
          
          if (!file.type.startsWith('image/')) {
            toastStore.warning(`${file.name}: файл должен быть изображением`);
            errorCount++;
            continue;
          }
          
          const result = await partsApi.uploadPartImage(part.id, file);
          uploadedImages.push({
            url: result.image_url,
            id: result.id,
            order_index: uploadedImages.length
          });
          successCount++;
        } catch (fileError) {
          console.error(`Error uploading image ${file.name}:`, fileError);
          toastStore.error(`${file.name}: ошибка загрузки`);
          errorCount++;
        }
      }
      
      uploadedImages = [...uploadedImages];
      
      if (successCount > 0) {
        toastStore.success(`Загружено изображений: ${successCount}`);
      }
      
      if (successCount > 0 && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toastStore.error('Общая ошибка загрузки изображений');
    } finally {
      isUploadingImage = false;
      event.target.value = '';
    }
  }
  
  async function removeImage(index) {
    const image = uploadedImages[index];
    if (!image || !part) return;
    
    if (image.id) {
      try {
        await partsApi.deletePartImage(part.id, image.id);
      } catch (error) {
        console.error('Error deleting image:', error);
        toastStore.error('Ошибка удаления изображения');
        return;
      }
    }
    
    uploadedImages.splice(index, 1);
    uploadedImages = [...uploadedImages];
    
    await updateImageOrders();
    
    if (onUpdate) onUpdate();
  }
  
  async function handleSave() {
    try {
      isUpdating = true;
      
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
          toastStore.error('Ошибка создания бренда');
          return;
        }
      }
      
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
          toastStore.error('Ошибка создания склада');
          return;
        }
      }
      
      const data = {
        title: formData.title,
        manufacturer_number: formData.manufacturer_number,
        brand_id: parseInt(brandId),
        warehouse_id: parseInt(warehouseId),
        stock: parseInt(formData.stock),
        reserve: parseInt(formData.reserve), // Send reserve
        price_opt: parseFloat(formData.price_opt),
        cost_price: parseFloat(formData.cost_price) || 0,
        description: formData.description,
      };
      
      await partsApi.updatePart(part.id, data);
      
      if (onUpdate) onUpdate();
      if (onClose) onClose();
      
      toastStore.success('Товар успешно обновлён');
    } catch (error) {
      console.error('Error updating part:', error);
      toastStore.error('Ошибка обновления товара');
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
        brand: part.brand?.id || part.brand_id || '',
        brand_name: '',
        warehouse: part.warehouse?.id || part.warehouse_id || '',
        warehouse_name: '',
        stock: part.stock || 0,
        reserve: part.reserve || 0, // Initialize reserve
        price_opt: part.price_opt || 0,
        cost_price: part.cost_price || 0,
        description: part.description || '',
        use_custom_brand: false,
        use_custom_warehouse: false
      };
      uploadedImages = (part.images || [])
        .map(img => ({
          url: img.image_url || img.url || '',
          id: img.id,
          order_index: img.order_index || img.orderIndex || 0
        }))
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }
  });
  
  async function moveImageUp(index) {
    if (index === 0 || !part) return;
    
    const images = [...uploadedImages];
    [images[index - 1], images[index]] = [images[index], images[index - 1]];
    uploadedImages = images;
    await updateImageOrders();
  }
  
  async function moveImageDown(index) {
    if (index === uploadedImages.length - 1 || !part) return;
    
    const images = [...uploadedImages];
    [images[index], images[index + 1]] = [images[index + 1], images[index]];
    uploadedImages = images;
    await updateImageOrders();
  }
  
  async function updateImageOrders() {
    if (!part) return;
    
    try {
      const promises = uploadedImages.map((img, index) => {
        if (img.id) {
          return partsApi.updateImageOrder(part.id, img.id, index);
        }
        return Promise.resolve();
      });
      
      await Promise.all(promises);
      
      uploadedImages = uploadedImages.map((img, index) => ({
        ...img,
        order_index: index
      }));
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating image orders:', error);
      toastStore.error('Ошибка обновления порядка изображений');
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden" 
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
      class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100" 
      onclick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Содержимое модального окна"
      tabindex="0"
    >
      <!-- Header -->
      <div class="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h2 id="edit-product-title" class="text-xl font-bold text-gray-900">Редактировать товар</h2>
          <p class="text-sm text-gray-500 mt-1">Измените основные характеристики товара</p>
        </div>
        <button 
          onclick={onClose} 
          aria-label="Закрыть" 
          class="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        <!-- Название -->
        <div>
          <label for="edit-title" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Название товара *</label>
          <input 
            id="edit-title" 
            type="text" 
            bind:value={formData.title} 
            required 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
            placeholder="Например: Масляный фильтр..."
          />
        </div>
        
        <!-- Артикул -->
        <div>
          <label for="edit-manufacturer-number" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Артикул</label>
          <input 
            id="edit-manufacturer-number" 
            type="text" 
            bind:value={formData.manufacturer_number} 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner font-mono" 
            placeholder="OEM номер"
          />
        </div>
        
        <!-- Бренд и Склад -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Бренд -->
          <div>
            <label for="edit-brand-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Бренд *</label>
            <div class="flex items-center space-x-4 mb-3">
              <label class="flex items-center cursor-pointer">
                <input type="radio" bind:group={formData.use_custom_brand} value={false} class="mr-2 text-gray-900 focus:ring-gray-900" />
                <span class="text-sm text-gray-600">Из списка</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" bind:group={formData.use_custom_brand} value={true} class="mr-2 text-gray-900 focus:ring-gray-900" />
                <span class="text-sm text-gray-600">Новый</span>
              </label>
            </div>
            {#if formData.use_custom_brand}
              <input 
                id="edit-brand-custom" 
                type="text" 
                bind:value={formData.brand_name} 
                placeholder="Введите название бренда" 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
              />
            {:else}
              <select 
                id="edit-brand-select" 
                bind:value={formData.brand} 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
              >
                <option value="">Выберите бренд</option>
                {#each brands as brand}
                  <option value={brand.id}>{brand.name}</option>
                {/each}
              </select>
            {/if}
          </div>
          
          <!-- Склад -->
          <div>
            <label for="edit-warehouse-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Склад *</label>
            <div class="flex items-center space-x-4 mb-3">
              <label class="flex items-center cursor-pointer">
                <input type="radio" bind:group={formData.use_custom_warehouse} value={false} class="mr-2 text-gray-900 focus:ring-gray-900" />
                <span class="text-sm text-gray-600">Из списка</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="radio" bind:group={formData.use_custom_warehouse} value={true} class="mr-2 text-gray-900 focus:ring-gray-900" />
                <span class="text-sm text-gray-600">Новый</span>
              </label>
            </div>
            {#if formData.use_custom_warehouse}
              <input 
                id="edit-warehouse-custom" 
                type="text" 
                bind:value={formData.warehouse_name} 
                placeholder="Введите название склада" 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
              />
            {:else}
              <select 
                id="edit-warehouse-select" 
                bind:value={formData.warehouse} 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner cursor-pointer"
              >
                <option value="">Выберите склад</option>
                {#each warehouses as warehouse}
                  <option value={warehouse.id}>{warehouse.name}</option>
                {/each}
              </select>
            {/if}
          </div>
        </div>
        
        <!-- Цены и количество -->
        <div class="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
          <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Наличие и цены</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="edit-stock" class="block text-xs font-medium text-gray-500 mb-1">Количество (физическое)</label>
              <input 
                id="edit-stock" 
                type="number" 
                bind:value={formData.stock} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all" 
              />
            </div>
             <div>
              <label for="edit-reserve" class="block text-xs font-medium text-gray-500 mb-1">Резерв (в заказах)</label>
              <input 
                id="edit-reserve" 
                type="number" 
                bind:value={formData.reserve} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all bg-orange-50 text-orange-700 font-medium" 
              />
            </div>
            <div>
              <label for="edit-price-opt" class="block text-xs font-medium text-gray-500 mb-1">Цена продажи (₽)</label>
              <input 
                id="edit-price-opt" 
                type="number" 
                step="0.01" 
                bind:value={formData.price_opt} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all font-medium" 
              />
            </div>
            <div>
              <label for="edit-cost-price" class="block text-xs font-medium text-gray-500 mb-1">Себестоимость (₽)</label>
              <input 
                id="edit-cost-price" 
                type="number" 
                step="0.01" 
                bind:value={formData.cost_price} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all text-gray-500" 
              />
            </div>
          </div>
          <div class="mt-4 flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-200">
            <span>Доступно для продажи: <strong class="text-gray-900">{Math.max(0, formData.stock - formData.reserve)}</strong></span>
            <span>Маржа: <strong class="text-green-600">{formData.price_opt > 0 ? ((formData.price_opt - formData.cost_price) / formData.price_opt * 100).toFixed(1) : 0}%</strong></span>
          </div>
        </div>
        
        <!-- Описание -->
        <div>
          <label for="edit-description" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Описание</label>
          <textarea 
            id="edit-description" 
            bind:value={formData.description} 
            rows="3" 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner resize-none"
          ></textarea>
        </div>
        
        <!-- Изображения -->
        <div>
          <label for="edit-images" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Изображения</label>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {#each uploadedImages as image, index}
              <div class="relative group aspect-square bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <img src={image.url} alt="" class="w-full h-full object-cover" />
                
                <!-- Controls Overlay -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div class="flex gap-1">
                    <button 
                      onclick={() => moveImageUp(index)}
                      disabled={index === 0}
                      class="w-7 h-7 bg-white/20 hover:bg-white/40 text-white rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button 
                      onclick={() => moveImageDown(index)}
                      disabled={index === uploadedImages.length - 1}
                      class="w-7 h-7 bg-white/20 hover:bg-white/40 text-white rounded-lg flex items-center justify-center disabled:opacity-30 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  <button 
                    onclick={() => removeImage(index)}
                    class="w-7 h-7 bg-red-500/80 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div class="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            {/each}
            
            <!-- Add Image Button -->
            <label 
              class="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition-all group"
            >
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onchange={handleImageUpload}
                class="hidden"
              />
              {#if isUploadingImage}
                <div class="animate-spin w-6 h-6 border-2 border-gray-400 border-t-gray-900 rounded-full"></div>
              {:else}
                <svg class="w-8 h-8 text-gray-400 group-hover:text-gray-600 mb-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span class="text-xs font-medium text-gray-500 group-hover:text-gray-700">Добавить</span>
              {/if}
            </label>
          </div>
        </div>
      </div>
      
      <!-- Footer Buttons -->
      <div class="p-6 border-t border-gray-100 bg-gray-50 flex space-x-4">
        <button 
          onclick={onClose} 
          class="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
        >
          Отмена
        </button>
        <button 
          onclick={handleSave}
          disabled={isUpdating}
          class="flex-1 py-3 px-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isUpdating ? 'Сохранение...' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
  </div>
{/if}
