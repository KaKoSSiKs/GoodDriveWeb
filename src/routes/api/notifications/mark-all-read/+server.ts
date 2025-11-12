// POST /api/notifications/mark-all-read
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const POST: RequestHandler = async () => {
	try {
		await prisma.notification.updateMany({
			where: { isRead: false },
			data: { isRead: true }
		});

		return json({
			success: true,
			message: 'All notifications marked as read'
		});
	} catch (error) {
		console.error('Failed to mark all notifications as read:', error);
		return json(
			{
				success: false,
				error: 'Failed to update notifications'
			},
			{ status: 500 }
		);
	}
};

