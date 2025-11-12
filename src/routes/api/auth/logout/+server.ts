// POST /api/auth/logout
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse } from '$lib/types';

export const POST: RequestHandler = async ({ cookies }) => {
	cookies.delete('auth_token', { path: '/' });

	return json<ApiResponse>({
		success: true,
		message: 'Logged out successfully'
	});
};

