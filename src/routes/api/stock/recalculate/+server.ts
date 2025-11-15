import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

// POST /api/stock/recalculate
// Пересчитывает резерв и доступный остаток по всем товарам на основе текущих заказов
export const POST: RequestHandler = async () => {
	try {
		// Статусы заказов, которые держат товар в резерве
		const activeStatuses = ['new', 'processing', 'shipped'];

		// Группируем позиции заказов по товару и считаем суммарное количество в активных заказах
		const reservedByPart = await prisma.orderItem.groupBy({
			by: ['partId'],
			_sum: {
				quantity: true
			},
			where: {
				order: {
					status: {
						in: activeStatuses
					}
				}
			}
		});

		const reservedMap = new Map<number, number>();
		for (const row of reservedByPart) {
			const sumQty = row._sum.quantity ?? 0;
			if (sumQty > 0) {
				reservedMap.set(row.partId, sumQty);
			}
		}

		// Получаем все товары
		const parts = await prisma.part.findMany({
			select: {
				id: true,
				stock: true
			}
		});

		for (const part of parts) {
			const stock = Number(part.stock ?? 0);
			const reserve = reservedMap.get(part.id) ?? 0;
			const available = Math.max(0, stock - reserve);

			await prisma.part.update({
				where: { id: part.id },
				data: {
					reserve,
					available
				}
			});
		}

		return json(
			{
				success: true,
				message: 'Stock successfully recalculated based on orders.'
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Failed to recalculate stock based on orders:', error);
		return json(
			{
				success: false,
				error: 'Failed to recalculate stock based on orders'
			},
			{ status: 500 }
		);
	}
};


