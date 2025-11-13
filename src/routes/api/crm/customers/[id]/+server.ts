// GET /api/crm/customers/[id]
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		const customer = await prisma.customer.findUnique({
			where: { id },
			include: {
				customerNotes: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		});

		if (!customer) {
			return json(
				{
					success: false,
					error: 'Customer not found'
				},
				{ status: 404 }
			);
		}

		// Определяем категорию клиента: 1 заказ = новый, 2+ = постоянный
		const getCategoryInfo = (totalOrders: number, category: string) => {
			if (totalOrders === 1) {
				return { category: 'new', category_display: 'Новый клиент' };
			} else if (totalOrders >= 2) {
				return { category: 'regular', category_display: 'Постоянный клиент' };
			}
			// Fallback на существующую категорию
			const categoryDisplay = {
				'new': 'Новый клиент',
				'regular': 'Постоянный клиент',
				'vip': 'VIP клиент',
				'inactive': 'Неактивный клиент'
			};
			return { 
				category: category || 'new', 
				category_display: categoryDisplay[category as keyof typeof categoryDisplay] || 'Новый клиент'
			};
		};

		const categoryInfo = getCategoryInfo(customer.totalOrders, customer.category);

		return json({
			success: true,
			data: {
				...customer,
				category: categoryInfo.category,
				category_display: categoryInfo.category_display
			}
		});
	} catch (error) {
		console.error('Failed to fetch customer:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch customer'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/crm/customers/[id] - Update customer
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Получаем текущего клиента для определения категории
		const currentCustomer = await prisma.customer.findUnique({
			where: { id }
		});

		if (!currentCustomer) {
			return json(
				{
					success: false,
					error: 'Customer not found'
				},
				{ status: 404 }
			);
		}

		// Определяем категорию на основе totalOrders: 1 заказ = новый, 2+ = постоянный
		const newCategory = currentCustomer.totalOrders === 1 ? 'new' : 'regular';

		const customer = await prisma.customer.update({
			where: { id },
			data: {
				name: data.name,
				phone: data.phone,
				email: data.email || null,
				city: data.city || null,
				address: data.address || null,
				category: newCategory, // Обновляем категорию на основе количества заказов
				notes: data.notes || null
			}
		});

		// Определяем категорию для ответа
		const getCategoryInfo = (totalOrders: number, category: string) => {
			if (totalOrders === 1) {
				return { category: 'new', category_display: 'Новый клиент' };
			} else if (totalOrders >= 2) {
				return { category: 'regular', category_display: 'Постоянный клиент' };
			}
			const categoryDisplay = {
				'new': 'Новый клиент',
				'regular': 'Постоянный клиент',
				'vip': 'VIP клиент',
				'inactive': 'Неактивный клиент'
			};
			return { 
				category: category || 'new', 
				category_display: categoryDisplay[category as keyof typeof categoryDisplay] || 'Новый клиент'
			};
		};

		const categoryInfo = getCategoryInfo(customer.totalOrders, customer.category);

		return json({
			success: true,
			data: {
				...customer,
				category: categoryInfo.category,
				category_display: categoryInfo.category_display
			}
		});
	} catch (error) {
		console.error('Failed to update customer:', error);
		return json(
			{
				success: false,
				error: 'Failed to update customer'
			},
			{ status: 500 }
		);
	}
};

