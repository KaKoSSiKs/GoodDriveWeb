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
		// Проверка согласия на обработку персональных данных (обязательно)
		if (!data.consentPd || data.consentPd !== true) {
			errors.push('Необходимо дать согласие на обработку персональных данных');
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

		// Update stock: move items to reserve and update available quantity
		try {
			for (const item of order.items) {
				// Get current part data
				const part = await prisma.part.findUnique({
					where: { id: item.partId }
				});

				if (!part) {
					console.error(`Part not found: ${item.partId}`);
					continue;
				}

				// Update reserve and available
				// Резерв увеличиваем на количество заказанного товара
				const newReserve = part.reserve + item.quantity;
				// Доступное количество = склад - резерв
				const newAvailable = Math.max(0, part.stock - newReserve);

				await prisma.part.update({
					where: { id: item.partId },
					data: {
						reserve: newReserve,
						available: newAvailable
					}
				});

				// Логируем обновление остатков
				console.log(`Updated stock for part ${item.partId}: stock=${part.stock}, reserve=${newReserve}, available=${newAvailable}`);
			}
		} catch (stockUpdateError) {
			// Log error but don't fail the order creation
			console.error('Failed to update stock:', stockUpdateError);
		}

		// Create or update customer in CRM
		try {
			// Ищем клиента по телефону
			let customer = await prisma.customer.findUnique({
				where: { phone: data.customerPhone }
			});

			if (!customer) {
				// Создаем нового клиента
				customer = await prisma.customer.create({
					data: {
						name: data.customerName,
						phone: data.customerPhone,
						email: data.customerEmail || null,
						city: data.deliveryCity || null,
						address: data.deliveryAddress || null,
						totalOrders: 1,
						totalSpent: totalAmount,
						averageOrder: totalAmount,
						lastOrderDate: order.createdAt,
						category: 'new' // 1 заказ = новый клиент
					}
				});
				console.log(`Created new customer: ${customer.id} - ${customer.name}`);
			} else {
				// Обновляем существующего клиента
				const newTotalOrders = customer.totalOrders + 1;
				const newTotalSpent = parseFloat(customer.totalSpent.toString()) + totalAmount;
				const newAverageOrder = newTotalSpent / newTotalOrders;
				
				// Определяем категорию: 1 заказ = новый, 2+ = постоянный
				// Если было 1 заказ, теперь станет 2, значит постоянный клиент
				const newCategory = newTotalOrders === 1 ? 'new' : 'regular';

				customer = await prisma.customer.update({
					where: { id: customer.id },
					data: {
						name: data.customerName, // Обновляем имя на случай изменения
						email: data.customerEmail || customer.email,
						city: data.deliveryCity || customer.city,
						address: data.deliveryAddress || customer.address,
						totalOrders: newTotalOrders,
						totalSpent: newTotalSpent,
						averageOrder: newAverageOrder,
						lastOrderDate: order.createdAt,
						category: newCategory
					}
				});
				console.log(`Updated customer: ${customer.id} - ${customer.name}, orders: ${newTotalOrders}, category: ${newCategory}`);
			}
		} catch (customerError) {
			// Log error but don't fail the order creation
			console.error('Failed to create/update customer:', customerError);
		}

		// Create notification for admin
		try {
			await prisma.notification.create({
				data: {
					type: 'new_order',
					title: 'Новый заказ',
					message: `Заказ №${order.orderNumber} на сумму ${totalAmount.toFixed(2)} ₽ от ${data.customerName}`,
					link: `/admin/orders/${order.id}`,
					isRead: false
				}
			});
		} catch (notificationError) {
			// Log error but don't fail the order creation
			console.error('Failed to create notification:', notificationError);
		}

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

