// Валидация входных данных для API endpoints Orders
import { z } from 'zod';

// Валидация query параметров для GET /api/orders
export const ordersQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(1000).default(1),
	page_size: z.coerce.number().int().min(1).max(100).default(20),
	status: z.string().max(20).optional(),
	customer_phone: z.string().max(20).optional(),
	customer_email: z.string().email().max(255).optional(),
	ordering: z
		.enum([
			'created_at',
			'-created_at',
			'updated_at',
			'-updated_at',
			'total_amount',
			'-total_amount'
		])
		.optional()
		.default('-created_at')
});

export type OrdersQueryInput = z.infer<typeof ordersQuerySchema>;

// Валидация параметров для GET /api/orders/[id]
export const orderIdSchema = z.object({
	id: z.coerce.number().int().positive()
});

export type OrderIdInput = z.infer<typeof orderIdSchema>;

// Валидация body для POST /api/orders (создание заказа)
export const createOrderSchema = z.object({
	customer_name: z.string().min(1).max(100),
	customer_phone: z.string().min(10).max(20),
	customer_email: z.string().email().max(255).optional(),
	delivery_address: z.string().min(1),
	delivery_city: z.string().min(1).max(100),
	delivery_postal_code: z.string().max(10).optional(),
	notes: z.string().optional(),
	items: z
		.array(
			z.object({
				part_id: z.number().int().positive(),
				quantity: z.number().int().positive(),
				price: z.number().nonnegative()
			})
		)
		.min(1, 'Order must contain at least one item')
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Валидация body для PUT /api/orders/[id] (обновление заказа)
export const updateOrderSchema = z.object({
	status: z.string().max(20).optional(),
	notes: z.string().optional(),
	customer_name: z.string().min(1).max(100).optional(),
	customer_phone: z.string().min(10).max(20).optional(),
	customer_email: z.string().email().max(255).optional(),
	delivery_address: z.string().min(1).optional(),
	delivery_city: z.string().min(1).max(100).optional(),
	delivery_postal_code: z.string().max(10).optional()
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

