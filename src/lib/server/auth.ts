// Authentication utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { env } from '$env/dynamic/private';

const SALT_ROUNDS = 10;

// КРИТИЧНО: JWT_SECRET должен быть установлен в environment variables
// В production ОБЯЗАТЕЛЬНО использовать сильный случайный ключ (минимум 32 символа)
// Используем $env/dynamic/private для runtime переменных (не требуются во время сборки)
// Это позволяет не включать секреты в build-time и использовать их только в runtime

// Функция для проверки и получения JWT_SECRET (вызывается во время выполнения)
function getJwtSecretWithValidation(): string {
  const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    // Предупреждение при первом использовании
    console.error('❌ CRITICAL SECURITY ERROR:');
    console.error('❌ JWT_SECRET environment variable is required!');
    console.error('❌ Please set it in your .env file.');
    console.error('❌ For production, use a strong random string (minimum 32 characters).');
    console.error('');
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Please set it in your .env file. ' +
      'For production, use a strong random string (minimum 32 characters).'
    );
  }

  // Проверка на слабый дефолтный ключ (только предупреждение)
  if (JWT_SECRET === 'supersecretkey12345678901234567890123456789012') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. This is INSECURE!');
    console.warn('⚠️  Please set a unique JWT_SECRET in your .env file!');
  }

  // Проверка длины ключа (минимум 32 символа для безопасности)
  if (JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is shorter than 32 characters.');
    console.warn('⚠️  For production, use a strong random string (minimum 32 characters).');
  }

  return JWT_SECRET;
}

// JWT_EXPIRES_IN - используем process.env как fallback, так как это опциональная переменная
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
	userId: number;
	email: string;
	isAdmin: boolean;
}

export interface UserSession {
	id: number;
	email: string;
	firstName: string | null;
	lastName: string | null;
	isAdmin: boolean;
	isStaff: boolean;
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
	return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(user: { id: number; email: string; isAdmin: boolean }): string {
	const secret = getJwtSecretWithValidation();

	const payload: JWTPayload = {
		userId: user.id,
		email: user.email,
		isAdmin: user.isAdmin
	};

	return jwt.sign(payload, secret, {
		expiresIn: JWT_EXPIRES_IN || '7d'
	});
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
	const JWT_SECRET = env.JWT_SECRET || process.env.JWT_SECRET;
	
	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set. Cannot verify token.');
		return null;
	}

	try {
		// Используем JWT_SECRET напрямую, так как мы уже проверили, что он существует
		// Валидация будет выполнена только для предупреждений, но не для ошибок
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch {
		// Ошибка верификации токена (неверный токен, истек срок и т.д.)
		return null;
	}
}

/**
 * Convert User to UserSession
 */
export function toUserSession(user: User): UserSession {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		isAdmin: user.isAdmin,
		isStaff: user.isStaff
	};
}

