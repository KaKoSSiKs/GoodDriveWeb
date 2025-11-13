// DELETE /api/parts/[id]/images/[imageId] - Delete image for a part
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { ApiResponse } from '$lib/types';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const partId = parseInt(params.id);
		const imageId = parseInt(params.imageId);
		
		if (isNaN(partId) || partId <= 0) {
			return json<ApiResponse>({
				success: false,
				error: 'Invalid part ID'
			}, { status: 400 });
		}

		if (isNaN(imageId) || imageId <= 0) {
			return json<ApiResponse>({
				success: false,
				error: 'Invalid image ID'
			}, { status: 400 });
		}

		// Проверяем, существует ли изображение и принадлежит ли оно товару
		const image = await prisma.partImage.findFirst({
			where: {
				id: imageId,
				partId: partId
			}
		});

		if (!image) {
			return json<ApiResponse>({
				success: false,
				error: 'Image not found'
			}, { status: 404 });
		}

		// Удаляем изображение из базы данных
		await prisma.partImage.delete({
			where: { id: imageId }
		});

		return json<ApiResponse>({
			success: true,
			message: 'Image deleted successfully'
		});
	} catch (err) {
		console.error('Image delete error:', err);
		return json<ApiResponse>({
			success: false,
			error: err instanceof Error ? err.message : 'Failed to delete image'
		}, { status: 500 });
	}
};

