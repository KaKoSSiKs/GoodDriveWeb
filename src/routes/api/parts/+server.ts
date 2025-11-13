// GET /api/parts - List parts with pagination and filtering
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { PaginatedResponse } from '$lib/types';
import { partsQuerySchema } from '$lib/server/validators/parts.validator';
import { createApiHandler, handleError, createErrorResponse, ValidationError } from '$lib/server/error-handler';
import { logger } from '$lib/server/logger';
import type { Prisma } from '@prisma/client';

// Валидация и обработка запроса
const handler: RequestHandler = async ({ url }) => {
	try {
		// Валидация query параметров
		const queryParams: Record<string, any> = Object.fromEntries(url.searchParams.entries());
	
	// Преобразуем boolean параметры из строк в boolean перед валидацией
	// Если параметр присутствует в URL, преобразуем его в boolean, иначе удаляем
	if ('in_stock' in queryParams) {
		const value = queryParams.in_stock;
		if (value === 'true' || value === '1' || value === true || value === 1) {
			queryParams.in_stock = true;
		} else if (value === 'false' || value === '0' || value === false || value === 0) {
			queryParams.in_stock = false;
		} else {
			// Если значение не распознано, удаляем параметр
			delete queryParams.in_stock;
		}
	}
	
	if ('low_stock' in queryParams) {
		const value = queryParams.low_stock;
		if (value === 'true' || value === '1' || value === true || value === 1) {
			queryParams.low_stock = true;
		} else if (value === 'false' || value === '0' || value === false || value === 0) {
			queryParams.low_stock = false;
		} else {
			// Если значение не распознано, удаляем параметр
			delete queryParams.low_stock;
		}
	}
	
	let params;
	try {
		params = partsQuerySchema.parse(queryParams);
	} catch (error) {
		// Детальная информация об ошибке валидации
		let errorDetails = 'Invalid query parameters';
		if (error && typeof error === 'object' && 'issues' in error) {
			const zodError = error as any;
			const issues = zodError.issues?.map((issue: any) => {
				const path = issue.path?.join('.') || 'unknown';
				return `${path}: ${issue.message}`;
			}).join(', ') || 'Unknown validation error';
			errorDetails = `Validation failed: ${issues}`;
		}
		
		logger.error('Validation error', { 
			error: error instanceof Error ? error.message : error,
			errorDetails,
			queryParams,
			url: url.toString()
		});
		throw new ValidationError(errorDetails, error);
	}

	const { page, page_size, search, brand, warehouse, price_min, price_max, low_stock, available_max, in_stock, ordering } = params;

	// Build where clause
	const where: Prisma.PartWhereInput = { isActive: true };
	
	// Поиск (поддержка нескольких слов через пробел или +)
	if (search) {
		// Заменяем + на пробелы и разбиваем на слова
		const searchTerms = search.replace(/\+/g, ' ').trim().split(/\s+/).filter(term => term.length > 0);
		
		if (searchTerms.length > 0) {
			// Если одно слово - простой поиск
			// MySQL по умолчанию регистронезависим для utf8mb4_unicode_ci collation
			if (searchTerms.length === 1) {
				const term = searchTerms[0];
				where.OR = [
					{ title: { contains: term } },
					{ originalNumber: { contains: term } },
					{ manufacturerNumber: { contains: term } }
				];
			} else {
				// Если несколько слов - все должны быть найдены (AND)
				where.AND = where.AND || [];
				where.AND.push({
					AND: searchTerms.map(term => ({
						OR: [
							{ title: { contains: term } },
							{ originalNumber: { contains: term } },
							{ manufacturerNumber: { contains: term } }
						]
					}))
				});
			}
		}
	}

	// Фильтр по бренду (поддержка множественных значений)
	if (brand) {
		if (Array.isArray(brand)) {
			where.brandId = { in: brand };
		} else {
			where.brandId = brand;
		}
	}

	// Фильтр по складу (поддержка множественных значений)
	if (warehouse) {
		if (Array.isArray(warehouse)) {
			where.warehouseId = { in: warehouse };
		} else {
			where.warehouseId = warehouse;
		}
	}

	// Фильтр по наличию (объединяем все условия для available)
	const availableConditions: any = {};
	
	// Если in_stock = true, показываем только товары с available > 0
	if (in_stock === true) {
		availableConditions.gt = 0;
	}
	
	if (low_stock) {
		availableConditions.lte = 5;
		if (!availableConditions.gt) {
			availableConditions.gt = 0;
		}
	}
	
	if (available_max !== undefined) {
		availableConditions.lte = available_max;
		// Если available_max = 0 и in_stock не установлен, показываем только товары с available = 0
		if (available_max === 0 && in_stock !== true) {
			availableConditions.gt = undefined;
			availableConditions.gte = 0;
			availableConditions.lte = 0;
		}
	}
	
	if (Object.keys(availableConditions).length > 0) {
		// Удаляем undefined значения
		Object.keys(availableConditions).forEach(key => {
			if (availableConditions[key] === undefined) {
				delete availableConditions[key];
			}
		});
		where.available = availableConditions;
	}

	// Фильтр по цене
	if (price_min !== undefined || price_max !== undefined) {
		where.priceOpt = {};
		if (price_min !== undefined) {
			where.priceOpt.gte = price_min;
		}
		if (price_max !== undefined) {
			where.priceOpt.lte = price_max;
		}
	}

	// Build orderBy
	const orderBy: Prisma.PartOrderByWithRelationInput[] = [];
	if (ordering) {
		const isDesc = ordering.startsWith('-');
		const field = isDesc ? ordering.substring(1) : ordering;
		const direction = isDesc ? 'desc' : 'asc';
		
		if (field === 'created_at') {
			orderBy.push({ createdAt: direction });
		} else if (field === 'price_opt') {
			orderBy.push({ priceOpt: direction });
		} else if (field === 'title') {
			orderBy.push({ title: direction });
		} else if (field === 'available') {
			orderBy.push({ available: direction });
		}
	}

	// Параллельные запросы для оптимизации
	let total, parts;
	try {
		[total, parts] = await Promise.all([
			prisma.part.count({ where }),
			prisma.part.findMany({
				where,
				skip: (page - 1) * page_size,
				take: page_size,
				orderBy: orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
				include: {
					brand: {
						select: {
							id: true,
							name: true,
							country: true,
							site: true
						}
					},
					warehouse: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					images: {
						orderBy: { orderIndex: 'asc' },
						select: {
							id: true,
							imageUrl: true,
							altText: true,
							orderIndex: true
						}
					}
				}
			})
		]);
	} catch (dbError) {
		logger.error('Database query error', {
			error: dbError instanceof Error ? dbError.message : String(dbError),
			stack: dbError instanceof Error ? dbError.stack : undefined,
			where,
			page,
			page_size
		});
		throw dbError;
	}

	const results = parts.map(part => ({
		id: part.id,
		is_active: part.isActive,
		title: part.title,
		label: part.label,
		original_number: part.originalNumber,
		manufacturer_number: part.manufacturerNumber,
		brand: part.brand,
		brand_name: part.brand?.name || '',
		warehouse: part.warehouse,
		warehouse_name: part.warehouse?.name || '',
		quantity: part.quantity ?? 0,
		stock: part.stock ?? 0,
		reserve: part.reserve ?? 0,
		available: part.available ?? 0,
		price_opt: part.priceOpt.toFixed(2),
		cost_price: part.costPrice.toFixed(2),
		description: part.description,
		images: part.images.map(img => ({
			id: img.id,
			image_url: img.imageUrl,
			alt_text: img.altText || part.title,
			order_index: img.orderIndex
		})),
		created_at: part.createdAt.toISOString(),
		updated_at: part.updatedAt.toISOString()
	}));

	const totalPages = Math.ceil(total / page_size);

	logger.info('Parts fetched successfully', { 
		count: total, 
		page, 
		page_size,
		filters: { search, brand, warehouse, price_min, price_max }
	});

	return json<PaginatedResponse<typeof results[0]>>({
		count: total,
		next: page < totalPages ? `/api/parts?page=${page + 1}&page_size=${page_size}` : null,
		previous: page > 1 ? `/api/parts?page=${page - 1}&page_size=${page_size}` : null,
		results
	});
	} catch (error) {
		// Логируем ошибку перед тем, как она будет обработана createApiHandler
		logger.error('Error in parts handler', {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			url: url.toString()
		});
		// Пробрасываем ошибку дальше для обработки createApiHandler
		throw error;
	}
};

// Экспорт с обработкой ошибок
export const GET = createApiHandler(handler, 'GET /api/parts');

