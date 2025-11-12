// GET /api/finance/categories
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const categories = await prisma.expenseCategory.findMany({
			where: { isActive: true },
			orderBy: { name: 'asc' }
		});

		return json({
			success: true,
			count: categories.length,
			results: categories
		});
	} catch (error) {
		console.error('Failed to fetch expense categories:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch categories'
			},
			{ status: 500 }
		);
	}
};

