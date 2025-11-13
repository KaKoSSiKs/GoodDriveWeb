// GET /api/health - Health check endpoint
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Проверяем подключение к базе данных
		await prisma.$queryRaw`SELECT 1`;
		
		return json({
			status: 'ok',
			timestamp: new Date().toISOString(),
			database: 'connected'
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

