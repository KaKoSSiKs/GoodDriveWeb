// Простой rate limiter на основе памяти (для production использовать Redis)
import { RateLimitError } from './error-handler';
import { logger } from './logger';

interface RateLimitConfig {
	points: number; // Количество запросов
	duration: number; // В секундах
}

interface RateLimitRecord {
	count: number;
	resetTime: number;
}

// In-memory storage (для production использовать Redis)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Очистка устаревших записей каждые 5 минут
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of rateLimitStore.entries()) {
		if (record.resetTime < now) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

/**
 * Простой rate limiter
 */
export class RateLimiter {
	private config: RateLimitConfig;

	constructor(config: RateLimitConfig) {
		this.config = config;
	}

	/**
	 * Проверка rate limit
	 */
	async consume(key: string): Promise<void> {
		const now = Date.now();
		const record = rateLimitStore.get(key);

		// Если запись не существует или истекла, создаем новую
		if (!record || record.resetTime < now) {
			rateLimitStore.set(key, {
				count: 1,
				resetTime: now + this.config.duration * 1000
			});
			return;
		}

		// Если лимит превышен
		if (record.count >= this.config.points) {
			const retryAfter = Math.ceil((record.resetTime - now) / 1000);
			logger.warn('Rate limit exceeded', { key, count: record.count, retryAfter });
			throw new RateLimitError('Too many requests', retryAfter);
		}

		// Увеличиваем счетчик
		record.count++;
		rateLimitStore.set(key, record);
	}

	/**
	 * Получить информацию о rate limit
	 */
	getInfo(key: string): { remaining: number; resetTime: number } | null {
		const record = rateLimitStore.get(key);
		if (!record || record.resetTime < Date.now()) {
			return null;
		}
		return {
			remaining: Math.max(0, this.config.points - record.count),
			resetTime: record.resetTime
		};
	}
}

// Глобальные rate limiters
export const apiRateLimiter = new RateLimiter({
	points: 100, // 100 запросов
	duration: 60 // за 60 секунд
});

export const authRateLimiter = new RateLimiter({
	points: 5, // 5 попыток
	duration: 900 // за 15 минут
});

export const sitemapRateLimiter = new RateLimiter({
	points: 10, // 10 запросов
	duration: 60 // за 60 секунд
});

/**
 * Получить ключ для rate limiting из запроса
 */
export function getRateLimitKey(event: any, prefix: string = ''): string {
	const ip = event.getClientAddress();
	const path = event.url.pathname;
	return `${prefix}:${ip}:${path}`;
}

