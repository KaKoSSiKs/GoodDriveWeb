// GET /api/health - Health check endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Проверяем подключение к базе данных
		await prisma.$queryRaw`SELECT 1`;
		
		// Проверяем количество товаров
		const partsCount = await prisma.part.count({
			where: { isActive: true }
		});

		return json({
			status: 'ok',
			database: 'connected',
			partsCount,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Health check failed:', error);
		return json(
			{
				status: 'error',
				timestamp: new Date().toISOString(),
				database: 'disconnected',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 503 }
		);
	}
};

