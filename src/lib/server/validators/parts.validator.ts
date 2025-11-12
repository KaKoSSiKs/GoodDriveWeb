// Валидация входных данных для API endpoints Parts
import { z } from 'zod';

// Валидация query параметров для GET /api/parts
export const partsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(1000).default(1),
	page_size: z.coerce.number().int().min(1).max(100).default(20),
	search: z.string().max(200).optional(),
	// Поддержка множественных брендов через запятую: "1,2,3"
	brand: z.union([
		z.coerce.number().int().positive(),
		z.string().transform((val) => {
			if (!val) return undefined;
			const ids = val.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
			return ids.length > 0 ? ids : undefined;
		})
	]).optional(),
	// Поддержка множественных складов через запятую: "1,2,3"
	warehouse: z.union([
		z.coerce.number().int().positive(),
		z.string().transform((val) => {
			if (!val) return undefined;
			const ids = val.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
			return ids.length > 0 ? ids : undefined;
		})
	]).optional(),
	price_min: z.coerce.number().nonnegative().optional(),
	price_max: z.coerce.number().nonnegative().optional(),
	low_stock: z.coerce.boolean().optional(),
	available_max: z.coerce.number().int().nonnegative().optional(),
	in_stock: z.coerce.boolean().optional(),
	ordering: z
		.enum([
			'created_at',
			'-created_at',
			'price_opt',
			'-price_opt',
			'title',
			'-title',
			'available',
			'-available'
		])
		.optional()
		.default('-created_at')
});

export type PartsQueryInput = z.infer<typeof partsQuerySchema>;

// Валидация параметров для GET /api/parts/[id]
export const partIdSchema = z.object({
	id: z.coerce.number().int().positive()
});

export type PartIdInput = z.infer<typeof partIdSchema>;

// Валидация body для POST /api/parts (создание товара)
export const createPartSchema = z.object({
	title: z.string().min(1).max(200),
	label: z.string().max(100).optional(),
	original_number: z.string().max(50).optional(),
	manufacturer_number: z.string().max(50).optional(),
	brand_id: z.number().int().positive(),
	warehouse_id: z.number().int().positive(),
	quantity: z.number().int().nonnegative().default(0),
	stock: z.number().int().nonnegative().default(0),
	reserve: z.number().int().nonnegative().default(0),
	available: z.number().int().nonnegative().default(0),
	price_opt: z.number().nonnegative(),
	cost_price: z.number().nonnegative().default(0),
	description: z.string().optional(),
	images: z
		.array(
			z.object({
				image_url: z.string().url(),
				alt_text: z.string().max(200).optional(),
				order_index: z.number().int().nonnegative().default(0)
			})
		)
		.optional()
});

export type CreatePartInput = z.infer<typeof createPartSchema>;

// Валидация body для PUT /api/parts/[id] (обновление товара)
export const updatePartSchema = createPartSchema.partial();

export type UpdatePartInput = z.infer<typeof updatePartSchema>;

