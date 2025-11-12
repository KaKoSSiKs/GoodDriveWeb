// Server hooks for authentication and security
import { verifyToken, type UserSession } from '$lib/server/auth';
import { prisma } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { apiRateLimiter, authRateLimiter, sitemapRateLimiter, getRateLimitKey } from '$lib/server/rate-limiter';
import { RateLimitError, createErrorResponse } from '$lib/server/error-handler';
import { logger } from '$lib/server/logger';

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting для API endpoints
	if (event.url.pathname.startsWith('/api/')) {
		try {
			// Специальный rate limiter для авторизации
			if (event.url.pathname.startsWith('/api/auth/login') || event.url.pathname.startsWith('/api/auth/register')) {
				const key = getRateLimitKey(event, 'auth');
				await authRateLimiter.consume(key);
			} else {
				// Общий rate limiter для API
				const key = getRateLimitKey(event, 'api');
				await apiRateLimiter.consume(key);
			}
		} catch (error) {
			if (error instanceof RateLimitError) {
				const retryAfter = error.details?.retryAfter || 60;
				const response = createErrorResponse(error);
				response.headers.set('Retry-After', String(retryAfter));
				response.headers.set('X-RateLimit-Limit', event.url.pathname.startsWith('/api/auth') ? '5' : '100');
				response.headers.set('X-RateLimit-Remaining', '0');
				response.headers.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + retryAfter));
				return response;
			}
			throw error;
		}
	}

	// Rate limiting для sitemap
	if (event.url.pathname === '/sitemap.xml') {
		try {
			const key = getRateLimitKey(event, 'sitemap');
			await sitemapRateLimiter.consume(key);
		} catch (error) {
			if (error instanceof RateLimitError) {
				logger.warn('Sitemap rate limit exceeded', { ip: event.getClientAddress() });
				return createErrorResponse(error);
			}
			throw error;
		}
	}

	// Get token from cookie
	const token = event.cookies.get('auth_token');

	if (token) {
		const payload = verifyToken(token);
		if (payload) {
			// Load full user data
			try {
				const user = await prisma.user.findUnique({
					where: { id: payload.userId },
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						isAdmin: true,
						isStaff: true,
						isActive: true
					}
				});

				if (user && user.isActive) {
					event.locals.user = user as UserSession;
				}
			} catch (error) {
				logger.error('Error loading user', error, 'auth');
				// Не прерываем запрос, просто не устанавливаем user
			}
		}
	}

	// Resolve the request
	const response = await resolve(event);

	// Security Headers (только для production)
	if (!dev) {
		// Защита от clickjacking
		response.headers.set('X-Frame-Options', 'DENY');
		
		// Предотвращение MIME type sniffing
		response.headers.set('X-Content-Type-Options', 'nosniff');
		
		// Referrer Policy
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		
		// Permissions Policy
		response.headers.set(
			'Permissions-Policy',
			'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
		);
		
		// HSTS (HTTP Strict Transport Security)
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
		
		// Content Security Policy
		const cspDirectives = [
			"default-src 'self'",
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru https://yandex.ru https://www.googletagmanager.com https://www.google-analytics.com",
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
			"img-src 'self' data: https: http:",
			"font-src 'self' https://fonts.gstatic.com data:",
			"connect-src 'self' https://mc.yandex.ru https://www.google-analytics.com",
			"frame-src 'self' https://yandex.ru https://yandex.com",
			"object-src 'none'",
			"base-uri 'self'",
			"form-action 'self'",
			"frame-ancestors 'none'",
			"upgrade-insecure-requests"
		];
		response.headers.set('Content-Security-Policy', cspDirectives.join('; '));
		
		// X-XSS-Protection (legacy, но все еще полезен)
		response.headers.set('X-XSS-Protection', '1; mode=block');
	}
	
	// CORS для API endpoints
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		
		// В production указать конкретный origin
		if (dev) {
			response.headers.set('Access-Control-Allow-Origin', '*');
		}

		// Добавляем rate limit headers
		if (event.url.pathname.startsWith('/api/auth/login') || event.url.pathname.startsWith('/api/auth/register')) {
			const key = getRateLimitKey(event, 'auth');
			const info = authRateLimiter.getInfo(key);
			if (info) {
				response.headers.set('X-RateLimit-Limit', '5');
				response.headers.set('X-RateLimit-Remaining', String(info.remaining));
				response.headers.set('X-RateLimit-Reset', String(Math.floor(info.resetTime / 1000)));
			}
		} else {
			const key = getRateLimitKey(event, 'api');
			const info = apiRateLimiter.getInfo(key);
			if (info) {
				response.headers.set('X-RateLimit-Limit', '100');
				response.headers.set('X-RateLimit-Remaining', String(info.remaining));
				response.headers.set('X-RateLimit-Reset', String(Math.floor(info.resetTime / 1000)));
			}
		}
	}

	return response;
};

