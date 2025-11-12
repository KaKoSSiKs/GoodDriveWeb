// GET /api/crm/customers/[id]
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		const customer = await prisma.customer.findUnique({
			where: { id },
			include: {
				customerNotes: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true
							}
						}
					},
					orderBy: { createdAt: 'desc' }
				}
			}
		});

		if (!customer) {
			return json(
				{
					success: false,
					error: 'Customer not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: customer
		});
	} catch (error) {
		console.error('Failed to fetch customer:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch customer'
			},
			{ status: 500 }
		);
	}
};

// PATCH /api/crm/customers/[id] - Update customer
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		const customer = await prisma.customer.update({
			where: { id },
			data: {
				name: data.name,
				phone: data.phone,
				email: data.email || null,
				city: data.city || null,
				address: data.address || null,
				category: data.category,
				notes: data.notes || null
			}
		});

		return json({
			success: true,
			data: customer
		});
	} catch (error) {
		console.error('Failed to update customer:', error);
		return json(
			{
				success: false,
				error: 'Failed to update customer'
			},
			{ status: 500 }
		);
	}
};

