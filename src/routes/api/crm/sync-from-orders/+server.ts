// POST /api/crm/sync-from-orders - Sync customers from orders
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const POST: RequestHandler = async () => {
	try {
		// Получаем все заказы
		const orders = await prisma.order.findMany({
			orderBy: { createdAt: 'asc' }
		});

		let created = 0;
		let updated = 0;

		for (const order of orders) {
			// Ищем клиента по телефону
			let customer = await prisma.customer.findUnique({
				where: { phone: order.customerPhone }
			});

			if (!customer) {
				// Создаем нового клиента
				customer = await prisma.customer.create({
					data: {
						name: order.customerName,
						phone: order.customerPhone,
						email: order.customerEmail,
						city: order.deliveryCity,
						address: order.deliveryAddress,
						totalOrders: 1,
						totalSpent: order.totalAmount,
						averageOrder: order.totalAmount,
						lastOrderDate: order.createdAt
					}
				});
				created++;
			} else {
				// Обновляем существующего
				const totalOrders = customer.totalOrders + 1;
				const totalSpent = parseFloat(customer.totalSpent.toString()) + parseFloat(order.totalAmount.toString());
				const averageOrder = totalSpent / totalOrders;

				await prisma.customer.update({
					where: { id: customer.id },
					data: {
						totalOrders,
						totalSpent,
						averageOrder,
						lastOrderDate: order.createdAt
					}
				});
				updated++;
			}
		}

		return json({
			success: true,
			message: `Synced ${created} new customers, updated ${updated} existing`,
			created,
			updated
		});
	} catch (error) {
		console.error('Failed to sync customers:', error);
		return json(
			{
				success: false,
				error: 'Failed to sync customers'
			},
			{ status: 500 }
		);
	}
};

