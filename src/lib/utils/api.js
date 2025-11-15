// Утилиты для работы с API GoodDrive (адаптировано для SvelteKit)

// Для SvelteKit используем относительные пути
const API_BASE_URL = '';

export { API_BASE_URL };

// Базовый класс для работы с API
class ApiClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }
  
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'same-origin', // Включаем отправку cookies
      ...options,
    };
    
    try {
      const response = await fetch(url, config);
      
      // Пытаемся распарсить JSON ответ
      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
      }
      
      // Проверяем структуру ответа с success флагом
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        const errorMessage = data.error || data.message || 'Request failed';
        console.error('API returned error:', errorMessage, data);
        throw new Error(errorMessage);
      }
      
      if (!response.ok) {
        // Пытаемся получить детальную информацию об ошибке
        let errorMessage = `HTTP error! status: ${response.status}`;
        if (data) {
          if (data.error) {
            errorMessage = data.error;
          } else if (data.message) {
            errorMessage = data.message;
          }
        }
        
        // Специальная обработка ошибок авторизации
        if (response.status === 403 || response.status === 401) {
          console.error('Authentication error:', errorMessage);
          // Можно добавить редирект на страницу логина если нужно
        }
        
        throw new Error(errorMessage);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', {
        endpoint,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
  
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
      const value = params[key];
      // Пропускаем null, undefined и пустые строки
      if (value !== null && value !== undefined && value !== '') {
        // Boolean значения преобразуем в строки 'true'/'false'
        if (typeof value === 'boolean') {
          url.searchParams.append(key, value ? 'true' : 'false');
        } else {
          url.searchParams.append(key, value);
        }
      }
    });

    return this.request(url.pathname + url.search);
  }
  
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  
  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
  
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

const api = new ApiClient();

// API для работы с автозапчастями
export const partsApi = {
  async getParts(params = {}) {
    return api.get('/api/parts', params);
  },
  
  async getPart(id) {
    return api.get(`/api/parts/${id}`);
  },
  
  async getSimilarParts(id) {
    const parts = await this.getParts({ brand: id });
    return parts.results || [];
  },
  
  async getAvailableParts(params = {}) {
    return api.get('/api/parts', { ...params, available: 'true' });
  },
  
  async getLowStockParts(params = {}) {
    return api.get('/api/parts', { ...params, low_stock: 'true' });
  },
  
  async uploadPartImage(partId, file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const url = `/api/parts/${partId}/images`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to upload image: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.success && data.data) {
      return data.data;
    }
    throw new Error(data.error || 'Failed to upload image');
  },
  
  async deletePartImage(partId, imageId) {
    const url = `/api/parts/${partId}/images/${imageId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete image: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete image');
    }
    return data;
  },
  
  async updateImageOrder(partId, imageId, orderIndex) {
    const url = `/api/parts/${partId}/images/${imageId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ order_index: orderIndex })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update image order: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update image order');
    }
    return data;
  },
  
  async updatePart(id, data) {
    return api.put(`/api/parts/${id}`, data);
  },
};

// API для работы с брендами
export const brandsApi = {
  async getBrands(params = {}) {
    return api.get('/api/brands', params);
  },
  
  async getBrand(id) {
    return api.get(`/api/brands/${id}`);
  },
};

// API для работы со складами
export const warehousesApi = {
  async getWarehouses(params = {}) {
    return api.get('/api/warehouses', params);
  },
  
  async getWarehouse(id) {
    return api.get(`/api/warehouses/${id}`);
  },
};

// API для работы с заказами
export const ordersApi = {
  async createOrder(orderData) {
    return api.post('/api/orders', orderData);
  },
  
  async getOrders(params = {}) {
    return api.get('/api/orders', params);
  },
  
  async getOrder(id) {
    return api.get(`/api/orders/${id}`);
  },
  
  async updateOrderStatus(id, status, statusComment = '') {
    return api.patch(`/api/orders/${id}`, { status, statusComment });
  },
  
  async updateOrder(id, data) {
    return api.patch(`/api/orders/${id}`, data);
  },
  
  async deleteOrder(id) {
    return api.delete(`/api/orders/${id}`);
  },
  
  async getOrderStatistics(period = 30) {
    // Используем analytics endpoint
    return api.get(`/api/analytics/orders?period=${period}`);
  },
  
  async getOrdersByPhone(phone) {
    // Фильтруем заказы по телефону
    return api.get(`/api/orders?phone=${phone}`);
  }
};

// API для операций с остатками склада
export const stockApi = {
  // Пересчёт резерва и доступного остатка на основании заказов
  async recalculateFromOrders() {
    return api.post('/api/stock/recalculate');
  }
};

// Утилиты для работы с корзиной
export const cartUtils = {
  getCart() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return [];
      }
      const cart = localStorage.getItem('gooddrive_cart');
      if (!cart) return [];
      
      const parsedCart = JSON.parse(cart);
      return parsedCart;
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  },
  
  saveCart(cart) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      localStorage.setItem('gooddrive_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  },
  
  addToCart(part, quantity = 1) {
    const cart = this.getCart();
    const existingItem = cart.find(item => item.id === part.id);
    
    // Получаем доступное количество товара
    const available = typeof part.available === 'number' ? part.available : (typeof part.quantity === 'number' ? part.quantity : 0);
    
    if (existingItem) {
      // Товар уже в корзине - проверяем доступное количество
      const currentQuantity = existingItem.quantity;
      const requestedQuantity = currentQuantity + quantity;
      
      // Ограничиваем доступным количеством
      if (requestedQuantity > available) {
        existingItem.quantity = available;
        console.warn(`Недостаточно товара. Доступно: ${available}, уже в корзине: ${currentQuantity}, запрошено дополнительно: ${quantity}`);
      } else {
        existingItem.quantity = requestedQuantity;
      }
      // Обновляем доступное количество в корзине
      existingItem.available = available;
    } else {
      // Новый товар - проверяем доступное количество
      const actualQuantity = Math.min(quantity, available);
      if (actualQuantity < quantity) {
        console.warn(`Недостаточно товара. Доступно: ${available}, запрошено: ${quantity}`);
      }
      
      const brandName = part.brand_name || part.brand?.name || '';
      const imageUrl = part.main_image?.url || part.images?.[0]?.image_url || null;
      cart.push({
        id: part.id,
        title: part.title,
        brand: brandName,
        price: parseFloat(part.price_opt),
        image: imageUrl,
        quantity: actualQuantity,
        available: available,
      });
    }
    
    this.saveCart(cart);
    this.notifyCartUpdate();
    return cart;
  },
  
  updateQuantity(partId, quantity) {
    const cart = this.getCart();
    const item = cart.find(item => item.id === partId);
    
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(partId);
      } else {
        // Проверяем доступное количество
        const available = item.available || 0;
        // Ограничиваем количеством доступным
        const actualQuantity = Math.min(quantity, available);
        if (actualQuantity < quantity) {
          console.warn(`Недостаточно товара. Доступно: ${available}, запрошено: ${quantity}`);
        }
        item.quantity = actualQuantity;
        this.saveCart(cart);
        this.notifyCartUpdate();
      }
    }
    
    return this.getCart();
  },
  
  removeFromCart(partId) {
    const cart = this.getCart();
    const updatedCart = cart.filter(item => item.id !== partId);
    this.saveCart(updatedCart);
    this.notifyCartUpdate();
    return updatedCart;
  },
  
  clearCart() {
    this.saveCart([]);
    this.notifyCartUpdate();
    return [];
  },
  
  notifyCartUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    }
  },
  
  getTotalItems() {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPrice() {
    const cart = this.getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },
};

// Утилиты для форматирования
export const formatUtils = {
  formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(price);
  },
  
  formatNumber(number) {
    return new Intl.NumberFormat('ru-RU').format(number);
  },
  
  formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  },
  
  formatDateTime(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  },
};

// Утилиты для валидации
export const validationUtils = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  },
  
  isValidPrice(price) {
    return !isNaN(price) && price >= 0;
  },
  
  isValidQuantity(quantity) {
    return Number.isInteger(quantity) && quantity > 0;
  },
};

// Утилиты для работы с изображениями
export const imageUtils = {
  // Преобразовать относительный URL изображения в абсолютный
  getAbsoluteUrl(imageUrl) {
    if (!imageUrl) return null;
    // Если URL уже абсолютный (начинается с http:// или https://), возвращаем как есть
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // Для относительных путей возвращаем как есть (SvelteKit static)
    return imageUrl;
  },
};

// API для работы с уведомлениями
export const notificationsApi = {
  async getNotifications(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.unread) queryParams.append('unread', 'true');
    
    const url = `/api/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await api.get(url);
    return response;
  },
  
  async getUnreadCount() {
    try {
      const response = await api.get('/api/notifications?unread=true');
      return response.unreadCount || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },
  
  async markAsRead(id) {
    return api.patch(`/api/notifications/${id}`, {});
  },
  
  async markAllAsRead() {
    return api.post('/api/notifications/mark-all-read', {});
  },
  
  async clearAll() {
    return api.delete('/api/notifications');
  },
};

// API для работы с финансами
export const financeApi = {
  async getExpenses(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    
    const url = `/api/finance/expenses${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return api.get(url);
  },
  
  async getExpenseCategories() {
    return api.get('/api/finance/categories');
  },
  
  async getCashTransactions(params = {}) {
    // TODO: Implement /api/finance/transactions endpoint if needed
    return { count: 0, results: [] };
  },
  
  async getBalance() {
    return api.get('/api/finance/balance');
  },
  
  async getProfitReports(params = {}) {
    // Используем summary endpoint
    return this.getProfitSummary(params.period || 30);
  },
  
  async getProfitSummary(period = 30) {
    return api.get(`/api/finance/summary?period=${period}`);
  },
  
  async createExpense(data) {
    return api.post('/api/finance/expenses', data);
  }
};

// API для работы с CRM
export const crmApi = {
  async getCustomers(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    if (params.search) queryParams.append('search', params.search);
    
    const url = `/api/crm/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return api.get(url);
  },
  
  async getCustomer(id) {
    return api.get(`/api/crm/customers/${id}`);
  },
  
  async getCustomerOrders(id) {
    // TODO: Implement dedicated endpoint if needed
    // Пока возвращаем через getCustomer который включает заметки
    const customer = await this.getCustomer(id);
    return { count: customer?.data?.totalOrders || 0, results: [] };
  },
  
  async syncFromOrders() {
    return api.post('/api/crm/sync-from-orders', {});
  },
  
  async createCustomer(data) {
    return api.post('/api/crm/customers', data);
  },
  
  async updateCustomer(id, data) {
    return api.patch(`/api/crm/customers/${id}`, data);
  }
};

// API для работы с аналитикой
export const analyticsApi = {
  async getOrderStatistics(period = 30) {
    return api.get(`/api/analytics/orders?period=${period}`);
  },
  
  async getProductStatistics(limit = 10) {
    return api.get(`/api/analytics/products?limit=${limit}`);
  }
};

// API для работы с запросами консультации
export const helpRequestsApi = {
  async getHelpRequests(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.page) queryParams.append('page', params.page);
    
    const url = `/api/help-requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return api.get(url);
  },
  
  async createHelpRequest(data) {
    return api.post('/api/help-requests', data);
  },
  
  async updateHelpRequestStatus(id, status) {
    return api.patch(`/api/help-requests/${id}`, { status });
  },
  
  async getHelpRequest(id) {
    return api.get(`/api/help-requests/${id}`);
  },
  
  async reDecodeVin(id) {
    return api.patch(`/api/help-requests/${id}`, { decodeVin: true });
  }
};

export default api;

