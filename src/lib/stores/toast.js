import { writable } from 'svelte/store';

function createToastStore() {
	const { subscribe, update } = writable([]);
	
	let nextId = 1;
	
	return {
		subscribe,
		
		add(message, type = 'success', duration = 3000) {
			const id = nextId++;
			const toast = { id, message, type, duration, createdAt: Date.now() };
			
			update(toasts => [...toasts, toast]);
			
			setTimeout(() => {
				this.remove(id);
			}, duration);
			
			return id;
		},
		
		remove(id) {
			update(toasts => toasts.filter(t => t.id !== id));
		},
		
		clear() {
			update(() => []);
		},
		
		success(message, duration) {
			return this.add(message, 'success', duration);
		},
		
		error(message, duration) {
			return this.add(message, 'error', duration);
		},
		
		warning(message, duration) {
			return this.add(message, 'warning', duration);
		},
		
		info(message, duration) {
			return this.add(message, 'info', duration);
		}
	};
}

export const toastStore = createToastStore();

