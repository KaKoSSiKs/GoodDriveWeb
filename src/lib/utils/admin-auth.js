// Утилиты для авторизации администраторов (адаптировано для SvelteKit)

export const adminAuth = {
  /**
   * Вход администратора
   */
  async login(username, password) {
    try {
      // В SvelteKit используем относительные пути и email вместо username
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: username, // username это email в нашем случае
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка авторизации');
      }
      
      // Сохраняем токен и данные пользователя
      if (data.data) {
        localStorage.setItem('admin_token', data.data.token);
        localStorage.setItem('admin_user', JSON.stringify(data.data));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Проверка токена
   */
  async verify() {
    const token = localStorage.getItem('admin_token');
    
    if (!token) {
      return false;
    }

    try {
      // Cookie автоматически отправляется, токен в localStorage для совместимости
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Verify error:', error);
      this.logout();
      return false;
    }
  },

  /**
   * Выход
   */
  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  /**
   * Получить текущего пользователя
   */
  getUser() {
    const userStr = localStorage.getItem('admin_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Получить токен
   */
  getToken() {
    return localStorage.getItem('admin_token');
  },

  /**
   * Проверка авторизации (синхронно)
   */
  isAuthenticated() {
    return !!this.getToken();
  }
};

