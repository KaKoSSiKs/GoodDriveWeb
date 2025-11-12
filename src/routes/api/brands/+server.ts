// GET /api/brands - List all brands
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { PaginatedResponse, ApiResponse } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const brands = await prisma.brand.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: { parts: true }
				}
			}
		});

		const results = brands.map(brand => ({
			id: brand.id,
			name: brand.name,
			country: brand.country,
			site: brand.site,
			parts_count: brand._count.parts
		}));

		return json<PaginatedResponse<typeof results[0]>>({
			count: results.length,
			next: null,
			previous: null,
			results
		});
	} catch (error) {
		console.error('Brands fetch error:', error);
		return json<ApiResponse>({
			success: false,
			error: 'Failed to fetch brands'
		}, { status: 500 });
	}
};

