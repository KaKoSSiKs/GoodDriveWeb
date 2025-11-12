// PATCH /api/notifications/[id] - Mark as read
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const PATCH: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		const notification = await prisma.notification.update({
			where: { id },
			data: { isRead: true }
		});

		return json({
			success: true,
			data: notification
		});
	} catch (error) {
		console.error('Failed to mark notification as read:', error);
		return json(
			{
				success: false,
				error: 'Failed to update notification'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/notifications/[id]
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		await prisma.notification.delete({
			where: { id }
		});

		return json({
			success: true
		});
	} catch (error) {
		console.error('Failed to delete notification:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete notification'
			},
			{ status: 500 }
		);
	}
};

