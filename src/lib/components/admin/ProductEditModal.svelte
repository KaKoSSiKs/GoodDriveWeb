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
      
      for (const file of files) {
        // Сразу загружаем изображение на сервер
        const result = await partsApi.uploadPartImage(part.id, file);
        uploadedImages.push({
          url: result.image_url,
          id: result.id
        });
      }
      
      uploadedImages = [...uploadedImages];
      alert('Изображения загружены!');
      
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка загрузки изображения');
    } finally {
      isUploadingImage = false;
    }
  }
  
  function removeImage(index) {
    uploadedImages.splice(index, 1);
    uploadedImages = [...uploadedImages];
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
        brand: brandId,
        warehouse: warehouseId,
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
      uploadedImages = [];
    }
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick={onClose}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900">Редактировать товар</h2>
        <button onclick={onClose} class="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Название -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Название товара *</label>
          <input type="text" bind:value={formData.title} required class="input w-full" />
        </div>
        
        <!-- Артикул -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Артикул</label>
          <input type="text" bind:value={formData.manufacturer_number} class="input w-full" />
        </div>
        
        <!-- Бренд -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Бренд *</label>
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
            <input type="text" bind:value={formData.brand_name} placeholder="Введите название бренда" class="input w-full" />
          {:else}
            <select bind:value={formData.brand} class="input w-full">
              <option value="">Выберите бренд</option>
              {#each brands as brand}
                <option value={brand.id}>{brand.name}</option>
              {/each}
            </select>
          {/if}
        </div>
        
        <!-- Склад -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Склад *</label>
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
            <input type="text" bind:value={formData.warehouse_name} placeholder="Введите название склада" class="input w-full" />
          {:else}
            <select bind:value={formData.warehouse} class="input w-full">
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
            <label class="block text-sm font-medium text-gray-700 mb-2">Количество на складе *</label>
            <input type="number" bind:value={formData.stock} min="0" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Цена продажи (₽) *</label>
            <input type="number" step="0.01" bind:value={formData.price_opt} min="0" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Себестоимость (₽)</label>
            <input type="number" step="0.01" bind:value={formData.cost_price} min="0" class="input w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Маржа</label>
            <div class="input w-full bg-gray-50">
              {formData.price_opt > 0 ? ((formData.price_opt - formData.cost_price) / formData.price_opt * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
        
        <!-- Описание -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Описание</label>
          <textarea bind:value={formData.description} rows="3" class="input w-full"></textarea>
        </div>
        
        <!-- Изображения -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Изображения</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onchange={handleImageUpload}
              class="hidden"
              id="image-upload"
            />
            <label for="image-upload" class="cursor-pointer flex flex-col items-center">
              <svg class="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-gray-600">Нажмите для загрузки изображений</span>
            </label>
          </div>
          
          {#if uploadedImages.length > 0}
            <div class="grid grid-cols-4 gap-2 mt-4">
              {#each uploadedImages as image, index}
                <div class="relative">
                  <img src={image.url} alt="" class="w-full h-24 object-cover rounded-lg" />
                  <button 
                    onclick={() => removeImage(index)}
                    class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>
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
