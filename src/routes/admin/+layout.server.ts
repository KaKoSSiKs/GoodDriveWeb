// Server-side authentication check for admin pages
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Разрешаем доступ к странице логина без проверки
	if (url.pathname === '/admin') {
		return {};
	}

	// Для всех остальных страниц админ панели требуется авторизация и права администратора
	if (!locals.user || !locals.user.isAdmin) {
		throw redirect(302, '/admin');
	}

	return {
		user: locals.user
	};
};

