// POST /api/crm/customers/[id]/notes - Create customer note
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();
		const { note } = data;

		if (!note || note.trim() === '') {
			return json(
				{
					success: false,
					error: 'Note is required'
				},
				{ status: 400 }
			);
		}

		// Проверяем, что клиент существует
		const customer = await prisma.customer.findUnique({
			where: { id }
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

		// Создаем комментарий
		// createdBy может быть null, если пользователь не авторизован (например, из публичного API)
		const customerNote = await prisma.customerNote.create({
			data: {
				customerId: id,
				note: note.trim(),
				createdBy: locals.user?.id || null
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true
					}
				}
			}
		});

		return json({
			success: true,
			data: customerNote
		});
	} catch (error) {
		console.error('Failed to create customer note:', error);
		return json(
			{
				success: false,
				error: 'Failed to create customer note'
			},
			{ status: 500 }
		);
	}
};

