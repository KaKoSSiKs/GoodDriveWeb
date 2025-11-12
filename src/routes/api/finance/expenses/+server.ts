// GET /api/finance/expenses
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const page = parseInt(url.searchParams.get('page') || '1');
		const skip = (page - 1) * limit;

		const expenses = await prisma.expense.findMany({
			include: {
				category: true,
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true
					}
				}
			},
			orderBy: { date: 'desc' },
			take: limit,
			skip
		});

		const total = await prisma.expense.count();

		return json({
			success: true,
			count: expenses.length,
			total,
			results: expenses,
			page,
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		console.error('Failed to fetch expenses:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch expenses'
			},
			{ status: 500 }
		);
	}
};

// POST /api/finance/expenses - Create expense
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const { categoryId, amount, description, date } = data;

		if (!categoryId || !amount || !description || !date) {
			return json(
				{
					success: false,
					error: 'Missing required fields'
				},
				{ status: 400 }
			);
		}

		const expense = await prisma.expense.create({
			data: {
				categoryId: parseInt(categoryId),
				amount: parseFloat(amount),
				description,
				date: new Date(date)
			},
			include: {
				category: true
			}
		});

		return json({
			success: true,
			data: expense
		});
	} catch (error) {
		console.error('Failed to create expense:', error);
		return json(
			{
				success: false,
				error: 'Failed to create expense'
			},
			{ status: 500 }
		);
	}
};

