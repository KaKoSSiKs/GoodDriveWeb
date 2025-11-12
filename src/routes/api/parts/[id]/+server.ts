// GET /api/parts/[id] - Get single part by ID
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { ApiResponse } from '$lib/types';

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

