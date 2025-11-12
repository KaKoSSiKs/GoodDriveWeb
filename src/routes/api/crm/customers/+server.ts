// GET /api/crm/customers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const page = parseInt(url.searchParams.get('page') || '1');
		const search = url.searchParams.get('search') || '';
		const skip = (page - 1) * limit;

		const where = search
			? {
					OR: [
						{ name: { contains: search } },
						{ phone: { contains: search } },
						{ email: { contains: search } }
					]
			  }
			: {};

		const customers = await prisma.customer.findMany({
			where,
			include: {
				customerNotes: {
					orderBy: { createdAt: 'desc' },
					take: 5
				}
			},
			orderBy: { lastOrderDate: 'desc' },
			take: limit,
			skip
		});

		const total = await prisma.customer.count({ where });

		return json({
			success: true,
			count: customers.length,
			total,
			results: customers.map((c) => ({
				id: c.id,
				name: c.name,
				phone: c.phone,
				email: c.email,
				city: c.city,
				address: c.address,
				category: c.category,
				totalOrders: c.totalOrders,
				total_orders: c.totalOrders, // для совместимости
				totalSpent: parseFloat(c.totalSpent.toString()),
				total_spent: parseFloat(c.totalSpent.toString()), // для совместимости
				averageOrder: parseFloat(c.averageOrder.toString()),
				average_order: parseFloat(c.averageOrder.toString()), // для совместимости
				lastOrderDate: c.lastOrderDate,
				last_order_date: c.lastOrderDate, // для совместимости
				notesCount: c.customerNotes.length,
				createdAt: c.createdAt,
				created_at: c.createdAt // для совместимости
			})),
			page,
			pages: Math.ceil(total / limit)
		});
	} catch (error) {
		console.error('Failed to fetch customers:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch customers'
			},
			{ status: 500 }
		);
	}
};

// POST /api/crm/customers - Create customer
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const { name, phone, email, city, address, notes } = data;

		if (!name || !phone) {
			return json(
				{
					success: false,
					error: 'Name and phone are required'
				},
				{ status: 400 }
			);
		}

		const customer = await prisma.customer.create({
			data: {
				name,
				phone,
				email: email || null,
				city: city || null,
				address: address || null,
				notes: notes || null
			}
		});

		return json({
			success: true,
			data: customer
		});
	} catch (error) {
		console.error('Failed to create customer:', error);
		return json(
			{
				success: false,
				error: 'Failed to create customer'
			},
			{ status: 500 }
		);
	}
};

