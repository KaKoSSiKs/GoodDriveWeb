// Централизованная обработка ошибок для GoodDrive
import { json } from '@sveltejs/kit';
import { logger } from './logger';

// Custom App Error class
export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code?: string,
		public details?: any
	) {
		super(message);
		this.name = 'AppError';
		Error.captureStackTrace(this, this.constructor);
	}
}

// Validation Error
export class ValidationError extends AppError {
	constructor(message: string, details?: any) {
		super(message, 400, 'VALIDATION_ERROR', details);
		this.name = 'ValidationError';
	}
}

// Not Found Error
export class NotFoundError extends AppError {
	constructor(resource: string, id?: string | number) {
		super(
			`${resource}${id ? ` with id ${id}` : ''} not found`,
			404,
			'NOT_FOUND'
		);
		this.name = 'NotFoundError';
	}
}

// Unauthorized Error
export class UnauthorizedError extends AppError {
	constructor(message: string = 'Unauthorized') {
		super(message, 401, 'UNAUTHORIZED');
		this.name = 'UnauthorizedError';
	}
}

// Forbidden Error
export class ForbiddenError extends AppError {
	constructor(message: string = 'Forbidden') {
		super(message, 403, 'FORBIDDEN');
		this.name = 'ForbiddenError';
	}
}

// Rate Limit Error
export class RateLimitError extends AppError {
	constructor(message: string = 'Too many requests', retryAfter?: number) {
		super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
		this.name = 'RateLimitError';
	}
}

/**
 * Обработка ошибок и возврат JSON ответа
 */
export function handleError(error: unknown, context?: string): AppError {
	// Логирование ошибки
	if (error instanceof Error) {
		logger.error('Error occurred', error, context);
	} else {
		logger.error('Unknown error occurred', { error: String(error) }, context);
	}

	// Если это уже AppError, возвращаем как есть
	if (error instanceof AppError) {
		return error;
	}

	// Prisma errors
	if (error && typeof error === 'object' && 'code' in error) {
		const prismaError = error as any;
		
		switch (prismaError.code) {
			case 'P2002':
				return new AppError(
					'Duplicate entry',
					409,
					'DUPLICATE_ENTRY',
					{ field: prismaError.meta?.target }
				);
			case 'P2025':
				return new NotFoundError('Record');
			case 'P2003':
				return new AppError(
					'Foreign key constraint failed',
					400,
					'FOREIGN_KEY_ERROR',
					{ field: prismaError.meta?.field_name }
				);
			case 'P2014':
				return new AppError(
					'Required relation missing',
					400,
					'RELATION_ERROR'
				);
			default:
				logger.error('Unhandled Prisma error', prismaError, context);
				return new AppError(
					'Database error',
					500,
					'DATABASE_ERROR',
					process.env.NODE_ENV === 'development' ? prismaError : undefined
				);
		}
	}

	// Zod validation errors
	if (error && typeof error === 'object' && 'issues' in error) {
		const zodError = error as any;
		return new ValidationError(
			'Validation failed',
			zodError.issues?.map((issue: any) => ({
				path: issue.path.join('.'),
				message: issue.message
			}))
		);
	}

	// Unknown errors
	return new AppError(
		'Internal server error',
		500,
		'INTERNAL_ERROR',
		process.env.NODE_ENV === 'development' ? error : undefined
	);
}

/**
 * Создание JSON ответа с ошибкой
 */
export function createErrorResponse(error: AppError) {
	return json(
		{
			success: false,
			error: error.message,
			code: error.code,
			...(error.details && { details: error.details }),
			...(process.env.NODE_ENV === 'development' && error.stack && {
				stack: error.stack
			})
		},
		{
			status: error.statusCode,
			headers: {
				'X-Error-Code': error.code || 'UNKNOWN_ERROR'
			}
		}
	);
}

/**
 * Wrapper для API handlers с автоматической обработкой ошибок
 */
export function withErrorHandler<T>(
	handler: () => Promise<T>,
	context?: string
): Promise<T> {
	return handler().catch((error) => {
		const appError = handleError(error, context);
		throw appError;
	});
}

/**
 * Wrapper для SvelteKit RequestHandler с автоматической обработкой ошибок
 */
export function createApiHandler(
	handler: (event: any) => Promise<Response>,
	context?: string
) {
	return async (event: any) => {
		try {
			return await handler(event);
		} catch (error) {
			const appError = handleError(error, context);
			return createErrorResponse(appError);
		}
	};
}

