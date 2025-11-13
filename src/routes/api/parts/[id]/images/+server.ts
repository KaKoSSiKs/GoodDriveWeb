// POST /api/parts/[id]/images - Upload image for a part
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { ApiResponse } from '$lib/types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const partId = parseInt(params.id);
		
		if (isNaN(partId) || partId <= 0) {
			return json<ApiResponse>({
				success: false,
				error: 'Invalid part ID'
			}, { status: 400 });
		}

		// Проверяем, существует ли товар
		const part = await prisma.part.findUnique({
			where: { id: partId }
		});

		if (!part) {
			return json<ApiResponse>({
				success: false,
				error: 'Part not found'
			}, { status: 404 });
		}

		// Получаем FormData из запроса
		const formData = await request.formData();
		const file = formData.get('image') as File;

		if (!file) {
			return json<ApiResponse>({
				success: false,
				error: 'No image file provided'
			}, { status: 400 });
		}

		// Проверяем тип файла
		if (!file.type.startsWith('image/')) {
			return json<ApiResponse>({
				success: false,
				error: 'File must be an image'
			}, { status: 400 });
		}

		// Проверяем размер файла (максимум 10MB)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return json<ApiResponse>({
				success: false,
				error: 'File size exceeds 10MB limit'
			}, { status: 400 });
		}

		// Конвертируем файл в base64 или сохраняем URL
		// Для простоты сохраняем как base64 в поле imageUrl
		// В production лучше использовать файловое хранилище (S3, Cloudinary и т.д.)
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64 = buffer.toString('base64');
		const dataUrl = `data:${file.type};base64,${base64}`;

		// Получаем текущее максимальное значение orderIndex для этого товара
		const maxOrderIndex = await prisma.partImage.findFirst({
			where: { partId },
			orderBy: { orderIndex: 'desc' },
			select: { orderIndex: true }
		});

		const nextOrderIndex = (maxOrderIndex?.orderIndex ?? -1) + 1;

		// Создаем запись об изображении в базе данных
		const partImage = await prisma.partImage.create({
			data: {
				partId,
				imageUrl: dataUrl,
				altText: part.title,
				orderIndex: nextOrderIndex
			}
		});

		return json<ApiResponse>({
			success: true,
			data: {
				id: partImage.id,
				image_url: partImage.imageUrl,
				alt_text: partImage.altText,
				order_index: partImage.orderIndex
			}
		});
	} catch (err) {
		console.error('Image upload error:', err);
		return json<ApiResponse>({
			success: false,
			error: err instanceof Error ? err.message : 'Failed to upload image'
		}, { status: 500 });
	}
};

