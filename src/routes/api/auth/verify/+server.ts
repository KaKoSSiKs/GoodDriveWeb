// GET /api/auth/verify
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json<ApiResponse>({
			success: false,
			error: 'Not authenticated'
		}, { status: 401 });
	}

	return json<ApiResponse>({
		success: true,
		data: locals.user
	});
};

