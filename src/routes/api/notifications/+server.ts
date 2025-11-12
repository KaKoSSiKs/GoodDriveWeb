// GET /api/notifications
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const unreadOnly = url.searchParams.get('unread') === 'true';

		const where = unreadOnly ? { isRead: false } : {};

		const notifications = await prisma.notification.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			take: limit
		});

		const unreadCount = await prisma.notification.count({
			where: { isRead: false }
		});

		return json({
			success: true,
			count: notifications.length,
			unreadCount,
			results: notifications
		});
	} catch (error) {
		console.error('Failed to fetch notifications:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch notifications'
			},
			{ status: 500 }
		);
	}
};

// POST /api/notifications - Create notification
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const { type, title, message, link } = data;

		if (!type || !title || !message) {
			return json(
				{
					success: false,
					error: 'Missing required fields'
				},
				{ status: 400 }
			);
		}

		const notification = await prisma.notification.create({
			data: {
				type,
				title,
				message,
				link: link || null
			}
		});

		return json({
			success: true,
			data: notification
		});
	} catch (error) {
		console.error('Failed to create notification:', error);
		return json(
			{
				success: false,
				error: 'Failed to create notification'
			},
			{ status: 500 }
		);
	}
};

