// GET /api/finance/summary
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const period = parseInt(url.searchParams.get('period') || '30'); // days
		const dateFrom = new Date();
		dateFrom.setDate(dateFrom.getDate() - period);

		// Получаем завершенные заказы за период
		const orders = await prisma.order.findMany({
			where: {
				status: 'completed',
				createdAt: {
					gte: dateFrom
				}
			}
		});

		// Считаем выручку
		const totalRevenue = orders.reduce(
			(sum, order) => sum + parseFloat(order.totalAmount.toString()),
			0
		);

		// Получаем расходы за период
		const expenses = await prisma.expense.findMany({
			where: {
				date: {
					gte: dateFrom
				}
			}
		});

		const totalExpenses = expenses.reduce(
			(sum, expense) => sum + parseFloat(expense.amount.toString()),
			0
		);

		// Считаем прибыль
		const profit = totalRevenue - totalExpenses;

		// Получаем статистику всех заказов (не только completed)
		const allOrders = await prisma.order.findMany({
			where: {
				createdAt: {
					gte: dateFrom
				}
			}
		});

		// Рассчитываем все показатели
		const ordersCount = orders.length;
		const averageOrder = ordersCount > 0 ? totalRevenue / ordersCount : 0;
		
		// Для упрощения считаем себестоимость как 60% от выручки
		// В реальности это должно браться из данных о закупочных ценах
		const costOfGoods = totalRevenue * 0.6;
		const grossProfit = totalRevenue - costOfGoods;
		
		// Операционные расходы = все расходы
		const operatingExpenses = totalExpenses;
		
		// Чистая прибыль
		const netProfit = grossProfit - operatingExpenses;
		
		// Маржа в процентах
		const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

		return json({
			success: true,
			period,
			revenue: totalRevenue,
			expenses: totalExpenses,
			profit,
			orders: ordersCount,
			totalOrders: allOrders.length,
			averageOrder,
			// Дополнительные поля для страницы финансов
			cost_of_goods: costOfGoods,
			gross_profit: grossProfit,
			operating_expenses: operatingExpenses,
			net_profit: netProfit,
			margin_percent: marginPercent,
			orders_count: ordersCount,
			average_order: averageOrder
		});
	} catch (error) {
		console.error('Failed to fetch finance summary:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch finance summary'
			},
			{ status: 500 }
		);
	}
};

