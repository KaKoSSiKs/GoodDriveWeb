// Утилита для перевода статусов на русский

export const statusLabels = {
  // Статусы заказов
  new: 'Новый',
  processing: 'В обработке',
  shipped: 'Отправлен',
  completed: 'Завершён',
  canceled: 'Отменён',
  
  // Категории клиентов
  vip: 'VIP',
  regular: 'Постоянный',
  wholesale: 'Оптовый'
};

export function getStatusLabel(status, defaultLabel = status) {
  return statusLabels[status] || defaultLabel;
}

export function getStatusColor(status) {
  const colors = {
    new: 'orange',
    processing: 'indigo',
    shipped: 'purple',
    completed: 'green',
    canceled: 'red'
  };
  return colors[status] || 'gray';
}

export function getStatusClasses(status) {
  const color = getStatusColor(status);
  return `bg-${color}-100 text-${color}-700`;
}

