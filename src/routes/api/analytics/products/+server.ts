// GET /api/analytics/products
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '10');

		// Топ продаваемых товаров
		const orderItems = await prisma.orderItem.findMany({
			include: {
				part: {
					include: {
						brand: true
					}
				}
			}
		});

		// Группируем по товарам
		const productStats = orderItems.reduce((acc: Record<number, any>, item) => {
			const partId = item.partId;
			if (!acc[partId]) {
				acc[partId] = {
					partId,
					title: item.partTitle,
					brand: item.part?.brand?.name || 'Unknown',
					totalSold: 0,
					totalRevenue: 0
				};
			}
			acc[partId].totalSold += item.quantity;
			acc[partId].totalRevenue += parseFloat(item.subtotal.toString());
			return acc;
		}, {});

		// Сортируем по количеству продаж
		const topProducts = Object.values(productStats)
			.sort((a: any, b: any) => b.totalSold - a.totalSold)
			.slice(0, limit);

		// Статистика по категориям (брендам)
		const brandStats = orderItems.reduce((acc: Record<string, any>, item) => {
			const brandName = item.part?.brand?.name || 'Unknown';
			if (!acc[brandName]) {
				acc[brandName] = {
					brand: brandName,
					totalSold: 0,
					totalRevenue: 0
				};
			}
			acc[brandName].totalSold += item.quantity;
			acc[brandName].totalRevenue += parseFloat(item.subtotal.toString());
			return acc;
		}, {});

		const topBrands = Object.values(brandStats)
			.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
			.slice(0, limit);

		// Общая статистика
		const totalProducts = await prisma.part.count({ where: { isActive: true } });
		const lowStock = await prisma.part.count({
			where: {
				isActive: true,
				available: {
					lte: 5,
					gt: 0
				}
			}
		});
		const outOfStock = await prisma.part.count({
			where: {
				isActive: true,
				available: 0
			}
		});

		return json({
			success: true,
			topProducts,
			topBrands,
			totalProducts,
			lowStock,
			outOfStock
		});
	} catch (error) {
		console.error('Failed to fetch product analytics:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch product analytics'
			},
			{ status: 500 }
		);
	}
};

