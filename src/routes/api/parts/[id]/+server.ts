// GET /api/parts/[id] - Get single part by ID
// PUT /api/parts/[id] - Update part
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { ApiResponse } from '$lib/types';
import { updatePartSchema } from '$lib/server/validators/parts.validator';
import { createErrorResponse, ValidationError } from '$lib/server/error-handler';
import { logger } from '$lib/server/logger';
import { getLocalImagesForPart } from '$lib/server/images';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const partId = parseInt(params.id);

		const part = await prisma.part.findUnique({
			where: { id: partId },
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
		});

		if (!part) {
			return json<ApiResponse>({
				success: false,
				error: 'Part not found'
			}, { status: 404 });
		}

		let images = part.images.map(img => ({
			id: img.id,
			image_url: img.imageUrl,
			alt_text: img.altText || part.title,
			order_index: img.orderIndex
		}));

		if (images.length === 0) {
			images = getLocalImagesForPart(part.id, part.title);
		}

		const result = {
			id: part.id,
			is_active: part.isActive,
			title: part.title,
			label: part.label,
			original_number: part.originalNumber,
			manufacturer_number: part.manufacturerNumber,
			brand: part.brand,
			warehouse: part.warehouse,
			quantity: part.quantity,
			stock: part.stock,
			reserve: part.reserve,
			available: part.available,
			category: part.category ?? 'other',
			price_opt: part.priceOpt.toFixed(2),
			cost_price: part.costPrice.toFixed(2),
			description: part.description,
			images,
			created_at: part.createdAt.toISOString(),
			updated_at: part.updatedAt.toISOString()
		};

		return json(result);
	} catch (error) {
		console.error('Part fetch error:', error);
		return json<ApiResponse>({
			success: false,
			error: 'Failed to fetch part'
		}, { status: 500 });
	}
};

// PUT /api/parts/[id] - Update part
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const partId = parseInt(params.id);
		
		if (isNaN(partId) || partId <= 0) {
			return json<ApiResponse>({
				success: false,
				error: 'Invalid part ID'
			}, { status: 400 });
		}

		// Проверяем, существует ли товар
		const existingPart = await prisma.part.findUnique({
			where: { id: partId }
		});

		if (!existingPart) {
			return json<ApiResponse>({
				success: false,
				error: 'Part not found'
			}, { status: 404 });
		}

		// Получаем и валидируем данные из запроса
		const body = await request.json();
		
		let validatedData;
		try {
			validatedData = updatePartSchema.parse(body);
		} catch (error) {
			logger.error('Validation error', {
				error: error instanceof Error ? error.message : error,
				body,
				partId
			});
			throw new ValidationError('Invalid input data', error);
		}

		// Подготавливаем данные для обновления
		const updateData: any = {};

		if (validatedData.title !== undefined) {
			updateData.title = validatedData.title;
		}
		if (validatedData.label !== undefined) {
			updateData.label = validatedData.label;
		}
		if (validatedData.original_number !== undefined) {
			updateData.originalNumber = validatedData.original_number;
		}
		if (validatedData.manufacturer_number !== undefined) {
			updateData.manufacturerNumber = validatedData.manufacturer_number;
		}
		if (validatedData.brand_id !== undefined) {
			updateData.brandId = validatedData.brand_id;
		}
		if (validatedData.warehouse_id !== undefined) {
			updateData.warehouseId = validatedData.warehouse_id;
		}
		if (validatedData.quantity !== undefined) {
			updateData.quantity = validatedData.quantity;
		}
		if (validatedData.category !== undefined) {
			updateData.category = validatedData.category;
		}
		if (validatedData.stock !== undefined) {
			updateData.stock = validatedData.stock;
			// Пересчитываем available
			updateData.available = validatedData.stock - (existingPart.reserve || 0);
		}
		if (validatedData.reserve !== undefined) {
			updateData.reserve = validatedData.reserve;
			// Пересчитываем available
			updateData.available = (existingPart.stock || 0) - validatedData.reserve;
		}
		if (validatedData.available !== undefined) {
			updateData.available = validatedData.available;
		}
		if (validatedData.price_opt !== undefined) {
			updateData.priceOpt = validatedData.price_opt;
		}
		if (validatedData.cost_price !== undefined) {
			updateData.costPrice = validatedData.cost_price;
		}
		if (validatedData.description !== undefined) {
			updateData.description = validatedData.description;
		}

		// Обновляем товар
		const updatedPart = await prisma.part.update({
			where: { id: partId },
			data: updateData,
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
		});

		logger.info(`Part ${partId} updated successfully`);

		let responseImages = updatedPart.images.map(img => ({
			id: img.id,
			image_url: img.imageUrl,
			alt_text: img.altText || updatedPart.title,
			order_index: img.orderIndex
		}));

		if (responseImages.length === 0) {
			responseImages = getLocalImagesForPart(updatedPart.id, updatedPart.title);
		}

		return json<ApiResponse>({
			success: true,
			data: {
				id: updatedPart.id,
				is_active: updatedPart.isActive,
				title: updatedPart.title,
				label: updatedPart.label,
				original_number: updatedPart.originalNumber,
				manufacturer_number: updatedPart.manufacturerNumber,
				brand: updatedPart.brand,
				warehouse: updatedPart.warehouse,
				quantity: updatedPart.quantity,
				stock: updatedPart.stock,
				reserve: updatedPart.reserve,
				available: updatedPart.available,
				price_opt: updatedPart.priceOpt.toFixed(2),
				cost_price: updatedPart.costPrice.toFixed(2),
				description: updatedPart.description,
				images: responseImages,
				created_at: updatedPart.createdAt.toISOString(),
				updated_at: updatedPart.updatedAt.toISOString()
			}
		});
	} catch (error) {
		logger.error('Part update error', {
			error: error instanceof Error ? error.message : error,
			stack: error instanceof Error ? error.stack : undefined,
			partId: params.id
		});
		return createErrorResponse(error);
	}
};

