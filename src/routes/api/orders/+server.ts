// GET /api/orders - List orders
// POST /api/orders - Create new order
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { PaginatedResponse, ApiResponse, CheckoutData } from '$lib/types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Only admin can view all orders
		if (!locals.user?.isAdmin) {
			return json<ApiResponse>({
				success: false,
				error: 'Unauthorized'
			}, { status: 403 });
		}

		const page = parseInt(url.searchParams.get('page') || '1');
		const pageSize = parseInt(url.searchParams.get('page_size') || '20');
		const status = url.searchParams.get('status');
		const search = url.searchParams.get('search');
		const createdAfter = url.searchParams.get('created_after');
		const createdBefore = url.searchParams.get('created_before');
		const ordering = url.searchParams.get('ordering') || '-created_at';

		const where: any = {};
		if (status) {
			where.status = status;
		}

		// Фильтр по датам
		if (createdAfter || createdBefore) {
			where.createdAt = {};
			if (createdAfter) {
				// Начало дня
				const dateFrom = new Date(createdAfter);
				dateFrom.setHours(0, 0, 0, 0);
				where.createdAt.gte = dateFrom;
			}
			if (createdBefore) {
				// Конец дня
				const dateTo = new Date(createdBefore);
				dateTo.setHours(23, 59, 59, 999);
				where.createdAt.lte = dateTo;
			}
		}

		// Поиск по номеру заказа, имени клиента, телефону или email
		if (search) {
			where.OR = [
				{ orderNumber: { contains: search, mode: 'insensitive' } },
				{ customerName: { contains: search, mode: 'insensitive' } },
				{ customerPhone: { contains: search, mode: 'insensitive' } },
				{ customerEmail: { contains: search, mode: 'insensitive' } }
			];
		}

		const total = await prisma.order.count({ where });

		// Определяем порядок сортировки
		let orderBy: any = { createdAt: 'desc' };
		if (ordering) {
			const orderField = ordering.startsWith('-') ? ordering.slice(1) : ordering;
			const orderDirection = ordering.startsWith('-') ? 'desc' : 'asc';
			
			if (orderField === 'created_at') {
				orderBy = { createdAt: orderDirection };
			} else if (orderField === 'total_amount') {
				orderBy = { totalAmount: orderDirection };
			} else if (orderField === 'status') {
				orderBy = { status: orderDirection };
			}
		}

		const orders = await prisma.order.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy,
			include: {
				items: {
					include: {
						part: {
							select: {
								id: true,
								title: true,
								brand: {
									select: { name: true }
								}
							}
						}
					}
				}
			}
		});

		const results = orders.map(order => ({
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
			items: order.items,
			itemsCount: order.items.length,
			createdAt: order.createdAt.toISOString(),
			updatedAt: order.updatedAt.toISOString()
		}));

		const totalPages = Math.ceil(total / pageSize);

		return json<PaginatedResponse<typeof results[0]>>({
			count: total,
			next: page < totalPages ? `/api/orders?page=${page + 1}&page_size=${pageSize}` : null,
			previous: page > 1 ? `/api/orders?page=${page - 1}&page_size=${pageSize}` : null,
			results
		});
	} catch (error) {
		console.error('Orders fetch error:', error);
		return json<ApiResponse>({
			success: false,
			error: 'Failed to fetch orders'
		}, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: CheckoutData = await request.json();

		// Detailed validation with helpful error messages
		const errors = [];
		
		if (!data.customerName || data.customerName.trim() === '') {
			errors.push('Имя покупателя обязательно');
		}
		if (!data.customerPhone || data.customerPhone.trim() === '') {
			errors.push('Телефон обязателен');
		}
		if (!data.deliveryAddress || data.deliveryAddress.trim() === '') {
			errors.push('Адрес доставки обязателен');
		}
		if (!data.deliveryCity || data.deliveryCity.trim() === '') {
			errors.push('Город обязателен');
		}
		if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
			errors.push('Корзина пуста');
		}

		if (errors.length > 0) {
			console.error('Order validation failed:', errors);
			return json<ApiResponse>({
				success: false,
				error: errors.join(', ')
			}, { status: 400 });
		}

		// Generate order number
		const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

		// Calculate total
		const totalAmount = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

		// Create order
		const order = await prisma.order.create({
			data: {
				orderNumber,
				customerName: data.customerName,
				customerPhone: data.customerPhone,
				customerEmail: data.customerEmail,
				deliveryAddress: data.deliveryAddress,
				deliveryCity: data.deliveryCity,
				deliveryPostalCode: data.deliveryPostalCode,
				totalAmount,
				notes: data.notes,
				status: 'new',
				items: {
					create: data.items.map(item => ({
						partId: item.partId,
						partTitle: item.title,
						quantity: item.quantity,
						price: item.price,
						subtotal: item.price * item.quantity
					}))
				}
			},
			include: {
				items: true
			}
		});

		// Create status history
		await prisma.orderStatusHistory.create({
			data: {
				orderId: order.id,
				status: 'new',
				comment: 'Заказ создан'
			}
		});

		return json<ApiResponse>({
			success: true,
			data: {
				id: order.id,
				order_number: order.orderNumber,
				total_amount: order.totalAmount.toFixed(2)
			}
		}, { status: 201 });
	} catch (error) {
		console.error('Order creation error:', error);
		return json<ApiResponse>({
			success: false,
			error: 'Failed to create order'
		}, { status: 500 });
	}
};

