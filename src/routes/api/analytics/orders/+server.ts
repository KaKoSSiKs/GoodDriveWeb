// GET /api/analytics/orders
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Only admin can view analytics
		if (!locals.user?.isAdmin) {
			return json({
				success: false,
				error: 'Unauthorized'
			}, { status: 403 });
		}

		const period = parseInt(url.searchParams.get('period') || '30'); // days
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - period);

		// Получаем все заказы
		const allOrders = await prisma.order.findMany();

		// Заказы за период
		const recentOrders = await prisma.order.findMany({
			where: {
				createdAt: {
					gte: dateFrom
				}
			}
		});

		// Статистика по статусам
		const byStatus = {
			total: allOrders.length,
			new: allOrders.filter((o) => o.status === 'new').length,
			processing: allOrders.filter((o) => o.status === 'processing').length,
			shipped: allOrders.filter((o) => o.status === 'shipped').length,
			completed: allOrders.filter((o) => o.status === 'completed').length,
			canceled: allOrders.filter((o) => o.status === 'canceled').length
		};

		// Последняя неделя
		const lastWeekDate = new Date();
		lastWeekDate.setDate(lastWeekDate.getDate() - 7);
		
		const lastWeekOrders = allOrders.filter(
			(o) => new Date(o.createdAt) > lastWeekDate
		);

		// Группировка по дням для графика
		const ordersByDay = recentOrders.reduce((acc: Record<string, number>, order) => {
			const date = new Date(order.createdAt).toISOString().split('T')[0];
			acc[date] = (acc[date] || 0) + 1;
			return acc;
		}, {});

		// Средний чек
		const totalRevenue = recentOrders.reduce(
			(sum, order) => sum + parseFloat(order.totalAmount.toString()),
			0
		);
		const averageOrder = recentOrders.length > 0 ? totalRevenue / recentOrders.length : 0;

		return json({
			success: true,
			period,
			total: byStatus.total,
			new: byStatus.new,
			processing: byStatus.processing,
			shipped: byStatus.shipped,
			completed: byStatus.completed,
			canceled: byStatus.canceled,
			lastWeek: lastWeekOrders.length,
			recentOrders: recentOrders.length,
			byStatus,
			ordersByDay,
			averageOrder,
			totalRevenue
		});
	} catch (error) {
		console.error('Failed to fetch order analytics:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch order analytics'
			},
			{ status: 500 }
		);
	}
};

