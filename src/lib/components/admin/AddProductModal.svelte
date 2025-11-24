<script>
  import { partsApi, brandsApi, warehousesApi } from '$lib/utils/api.js';
  
  let { brands, warehouses, isOpen, onClose, onSuccess } = $props();
  
  let isCreating = $state(false);
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
  
  async function handleImageUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    try {
      isUploadingImage = true;
      
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedImages.push({
            file: file,
            url: e.target.result,
            name: file.name
          });
          uploadedImages = [...uploadedImages];
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Ошибка обработки изображений');
    } finally {
      isUploadingImage = false;
    }
  }
  
  function removeImage(index) {
    uploadedImages.splice(index, 1);
    uploadedImages = [...uploadedImages];
  }
  
  async function handleCreate() {
    try {
      isCreating = true;
      
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
        brand: brandId,
        warehouse: warehouseId,
        stock: parseInt(formData.stock),
        price_opt: parseFloat(formData.price_opt),
        cost_price: parseFloat(formData.cost_price) || 0,
        description: formData.description,
        is_active: true
      };
      
      const newPart = await partsApi.createPart(data);
      
      if (uploadedImages.length > 0 && newPart.id) {
        for (const imageData of uploadedImages) {
          try {
            await partsApi.uploadPartImage(newPart.id, imageData.file);
          } catch (error) {
            console.error('Error uploading image to part:', error);
          }
        }
      }
      
      alert('Товар успешно добавлен!');
      
      formData = {
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
      };
      uploadedImages = [];
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating part:', error);
      alert('Ошибка создания товара');
    } finally {
      isCreating = false;
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
    aria-labelledby="add-product-title"
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
          <h2 id="add-product-title" class="text-xl font-bold text-gray-900">Добавить товар</h2>
          <p class="text-sm text-gray-500 mt-1">Заполните информацию о новом товаре</p>
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
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        <!-- Название -->
        <div>
          <label for="add-title" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Название товара *</label>
          <input 
            id="add-title" 
            type="text" 
            bind:value={formData.title} 
            required 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
            placeholder="Например: Тормозные колодки передние" 
          />
        </div>
        
        <!-- Артикул -->
        <div>
          <label for="add-manufacturer-number" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Артикул</label>
          <input 
            id="add-manufacturer-number" 
            type="text" 
            bind:value={formData.manufacturer_number} 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner font-mono" 
            placeholder="BRK-12345" 
          />
        </div>
        
        <!-- Бренд и Склад -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Бренд -->
          <div>
            <label for="add-brand-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Бренд *</label>
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
                id="add-brand-custom" 
                type="text" 
                bind:value={formData.brand_name} 
                placeholder="Введите название бренда" 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
              />
            {:else}
              <select 
                id="add-brand-select" 
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
            <label for="add-warehouse-select" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Склад *</label>
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
                id="add-warehouse-custom" 
                type="text" 
                bind:value={formData.warehouse_name} 
                placeholder="Введите название склада" 
                class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner" 
              />
            {:else}
              <select 
                id="add-warehouse-select" 
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
              <label for="add-stock" class="block text-xs font-medium text-gray-500 mb-1">Количество на складе *</label>
              <input 
                id="add-stock" 
                type="number" 
                bind:value={formData.stock} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all" 
                placeholder="10" 
              />
            </div>
            <div>
              <label for="add-price-opt" class="block text-xs font-medium text-gray-500 mb-1">Цена продажи (₽) *</label>
              <input 
                id="add-price-opt" 
                type="number" 
                step="0.01" 
                bind:value={formData.price_opt} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all font-medium" 
                placeholder="2500.00" 
              />
            </div>
             <div>
              <label for="add-cost-price" class="block text-xs font-medium text-gray-500 mb-1">Себестоимость (₽)</label>
              <input 
                id="add-cost-price" 
                type="number" 
                step="0.01" 
                bind:value={formData.cost_price} 
                min="0" 
                class="w-full bg-white border border-gray-200 focus:border-gray-400 rounded-lg px-3 py-2 text-sm transition-all text-gray-500" 
                placeholder="1800.00" 
              />
            </div>
            <div class="flex items-center">
               <div class="w-full px-3 py-2 bg-gray-100/50 rounded-lg border border-gray-200/50">
                 <span class="text-xs text-gray-500 block mb-0.5">Маржа</span>
                 <span class="font-semibold {(formData.price_opt - formData.cost_price) > 0 ? 'text-green-600' : 'text-gray-600'}">
                    {formData.price_opt > 0 ? ((formData.price_opt - formData.cost_price) / formData.price_opt * 100).toFixed(1) : 0}%
                 </span>
               </div>
            </div>
          </div>
        </div>
        
        <!-- Описание -->
        <div>
          <label for="add-description" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Описание</label>
          <textarea 
            id="add-description" 
            bind:value={formData.description} 
            rows="3" 
            class="w-full bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 rounded-xl px-4 py-3 text-sm transition-all shadow-inner resize-none" 
            placeholder="Описание товара..."
          ></textarea>
        </div>
        
        <!-- Изображения -->
        <div>
          <label for="add-images" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Изображения товара</label>
          <div class="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-gray-400 hover:bg-gray-50 transition-all group">
            <input 
              id="add-images"
              type="file" 
              accept="image/*" 
              multiple 
              onchange={handleImageUpload}
              class="hidden"
              disabled={isUploadingImage}
            />
            <label for="add-images" class="cursor-pointer flex flex-col items-center">
              {#if isUploadingImage}
                <div class="animate-spin w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full mb-2"></div>
                <span class="text-sm text-gray-600">Загрузка...</span>
              {:else}
                <svg class="w-10 h-10 text-gray-300 group-hover:text-gray-500 mb-2 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-sm text-gray-600 font-medium">Нажмите для загрузки изображений</span>
                <span class="text-xs text-gray-400 mt-1">Можно выбрать несколько файлов</span>
              {/if}
            </label>
          </div>
          
          {#if uploadedImages.length > 0}
            <div class="grid grid-cols-4 gap-3 mt-4">
              {#each uploadedImages as image, index}
                <div class="relative group">
                  <img src={image.url} alt={image.name} class="w-full h-24 object-cover rounded-lg border border-gray-200" />
                  <button 
                    onclick={() => removeImage(index)}
                    class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>
          {/if}
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
          onclick={handleCreate}
          disabled={isCreating || !formData.title || (!formData.brand && !formData.brand_name) || (!formData.warehouse && !formData.warehouse_name)}
          class="flex-1 py-3 px-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isCreating ? 'Создание...' : 'Создать товар'}
        </button>
      </div>
    </div>
  </div>
{/if}
