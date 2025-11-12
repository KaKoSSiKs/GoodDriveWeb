// GET /api/warehouses - List all warehouses
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { PaginatedResponse, ApiResponse } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const warehouses = await prisma.warehouse.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: { parts: true }
				}
			}
		});

		const results = warehouses.map(warehouse => ({
			id: warehouse.id,
			name: warehouse.name,
			address: warehouse.address,
			parts_count: warehouse._count.parts
		}));

		return json<PaginatedResponse<typeof results[0]>>({
			count: results.length,
			next: null,
			previous: null,
			results
		});
	} catch (error) {
		console.error('Warehouses fetch error:', error);
		return json<ApiResponse>({
			success: false,
			error: 'Failed to fetch warehouses'
		}, { status: 500 });
	}
};

