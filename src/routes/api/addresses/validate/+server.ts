import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasDadataCredentials, validateAddress } from '$lib/server/services/address';

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!hasDadataCredentials()) {
			return json(
				{
					success: false,
					error: 'Проверка адресов не настроена. Установите переменные DADATA_API_TOKEN и DADATA_SECRET.'
				},
				{ status: 500 }
			);
		}

		const body = await request.json();
		const address = body?.address?.trim();

		if (!address) {
			return json(
				{
					success: false,
					error: 'Не указан адрес для проверки'
				},
				{ status: 400 }
			);
		}

		const result = await validateAddress(address);

		if (!result.isValid) {
			return json(
				{
					success: false,
					error: result.warning || 'Адрес не найден в базе ФИАС',
					data: result
				},
				{ status: 400 }
			);
		}

		return json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Address validation error:', error);
		return json(
			{
				success: false,
				error: 'Не удалось проверить адрес'
			},
			{ status: 500 }
		);
	}
};


