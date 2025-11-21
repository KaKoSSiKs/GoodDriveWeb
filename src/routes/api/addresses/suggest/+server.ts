import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchAddressSuggestions } from '$lib/server/services/address';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const query = url.searchParams.get('query')?.trim();
		const type = url.searchParams.get('type')?.toLowerCase() || 'address';
		const city = url.searchParams.get('city')?.trim();
		const cityId = url.searchParams.get('city_id')?.trim();

		if (!query || query.length < 3) {
			return json({
				success: true,
				data: []
			});
		}

		let suggestions;

		if (type === 'city') {
			suggestions = await fetchAddressSuggestions(query, {
				limit: 10,
				fromBound: 'city',
				toBound: 'settlement',
				restrictValue: false
			});
		} else {
			suggestions = await fetchAddressSuggestions(query, {
				limit: 8,
				city,
				cityFiasId: cityId
			});
		}

		return json({
			success: true,
			data: suggestions
		});
	} catch (error) {
		console.error('Address suggestions error:', error);
		return json(
			{
				success: false,
				error: 'Не удалось получить подсказки адресов'
			},
			{ status: 500 }
		);
	}
};


