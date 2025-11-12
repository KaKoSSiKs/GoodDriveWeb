// POST /api/auth/login
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { verifyPassword, generateToken } from '$lib/server/auth';
import type { ApiResponse } from '$lib/types';
import { loginSchema } from '$lib/server/validators/auth.validator';
import { createApiHandler, ValidationError, UnauthorizedError } from '$lib/server/error-handler';
import { logger } from '$lib/server/logger';

// Валидация и обработка запроса
const handler: RequestHandler = async ({ request, cookies }) => {
	// Валидация body
	const body = await request.json();
	
	let loginData;
	try {
		loginData = loginSchema.parse(body);
	} catch (error) {
		throw new ValidationError('Invalid email or password format', error);
	}

	const { email, password } = loginData;

	// Find user
	const user = await prisma.user.findUnique({
		where: { email: email.toLowerCase() }
	});

	if (!user || !user.isActive) {
		logger.warn('Login attempt failed: user not found or inactive', { email });
		throw new UnauthorizedError('Invalid credentials');
	}

	// Verify password
	const isValid = await verifyPassword(password, user.password);
	if (!isValid) {
		logger.warn('Login attempt failed: invalid password', { email, userId: user.id });
		throw new UnauthorizedError('Invalid credentials');
	}

	// Generate token
	const token = generateToken({
		id: user.id,
		email: user.email,
		isAdmin: user.isAdmin
	});

	// Set cookie
	const isProduction = process.env.NODE_ENV === 'production';
	cookies.set('auth_token', token, {
		path: '/',
		httpOnly: true,
		secure: isProduction,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});

	logger.info('User logged in successfully', { userId: user.id, email: user.email });

	return json<ApiResponse>({
		success: true,
		data: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			isAdmin: user.isAdmin,
			token
		}
	});
};

// Экспорт с обработкой ошибок
export const POST = createApiHandler(handler, 'POST /api/auth/login');

