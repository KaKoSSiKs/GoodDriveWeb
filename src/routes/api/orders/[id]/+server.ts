// GET /api/orders/[id] - Получить детали заказа
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid order ID'
				},
				{ status: 400 }
			);
		}

		const order = await prisma.order.findUnique({
			where: { id },
			include: {
				items: {
					include: {
						part: {
							include: {
								brand: true,
								warehouse: true,
								images: true
							}
						}
					}
				},
				statusHistory: {
					orderBy: { createdAt: 'desc' }
				}
			}
		});

		if (!order) {
			return json(
				{
					success: false,
					error: 'Order not found'
				},
				{ status: 404 }
			);
		}

		// Форматируем ответ
		return json({
			success: true,
			data: {
				id: order.id,
				orderNumber: order.orderNumber,
				customerName: order.customerName,
				customerPhone: order.customerPhone,
				customerEmail: order.customerEmail,
				deliveryAddress: order.deliveryAddress,
				deliveryCity: order.deliveryCity,
				deliveryPostalCode: order.deliveryPostalCode,
				totalAmount: parseFloat(order.totalAmount.toString()),
				status: order.status,
				notes: order.notes,
				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
				items: order.items.map((item) => ({
					id: item.id,
					partId: item.partId,
					partTitle: item.partTitle,
					quantity: item.quantity,
					price: parseFloat(item.price.toString()),
					subtotal: parseFloat(item.subtotal.toString()),
					part: item.part
						? {
								id: item.part.id,
								title: item.part.title,
								brand: item.part.brand?.name,
								warehouse: item.part.warehouse?.name,
								images: item.part.images
						  }
						: null
				})),
				statusHistory: order.statusHistory
			}
		});
	} catch (error) {
		console.error('Failed to fetch order details:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch order details'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/orders/[id] - Обновить заказ
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid order ID'
				},
				{ status: 400 }
			);
		}

		// Обновляем заказ
		const updateData: any = {};
		
		if (data.status) {
			updateData.status = data.status;
		}
		if (data.notes !== undefined) {
			updateData.notes = data.notes;
		}
		if (data.customerName) {
			updateData.customerName = data.customerName;
		}
		if (data.customerPhone) {
			updateData.customerPhone = data.customerPhone;
		}
		if (data.customerEmail !== undefined) {
			updateData.customerEmail = data.customerEmail;
		}
		if (data.deliveryAddress) {
			updateData.deliveryAddress = data.deliveryAddress;
		}
		if (data.deliveryCity) {
			updateData.deliveryCity = data.deliveryCity;
		}

		const order = await prisma.order.update({
			where: { id },
			data: updateData,
			include: {
				items: true
			}
		});

		// Если обновлен статус, добавляем в историю
		if (data.status) {
			await prisma.orderStatusHistory.create({
				data: {
					orderId: id,
					status: data.status,
					comment: data.statusComment || null
				}
			});
		}

		return json({
			success: true,
			data: order
		});
	} catch (error) {
		console.error('Failed to update order:', error);
		return json(
			{
				success: false,
				error: 'Failed to update order'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/orders/[id] - Удалить заказ
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			return json(
				{
					success: false,
					error: 'Invalid order ID'
				},
				{ status: 400 }
			);
		}

		await prisma.order.delete({
			where: { id }
		});

		return json({
			success: true,
			message: 'Order deleted successfully'
		});
	} catch (error) {
		console.error('Failed to delete order:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete order'
			},
			{ status: 500 }
		);
	}
};

