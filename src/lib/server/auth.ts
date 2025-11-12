// Authentication utilities
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

const SALT_ROUNDS = 10;

// КРИТИЧНО: JWT_SECRET должен быть установлен в environment variables
// В production ОБЯЗАТЕЛЬНО использовать сильный случайный ключ (минимум 32 символа)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  const error = new Error(
    'JWT_SECRET environment variable is required. ' +
    'Please set it in your .env file. ' +
    'For production, use a strong random string (minimum 32 characters).'
  );
  
  if (process.env.NODE_ENV === 'production') {
    // В production прерываем запуск если JWT_SECRET не установлен
    throw error;
  } else {
    // В development предупреждаем, но не прерываем
    console.error('❌ CRITICAL SECURITY WARNING:');
    console.error('❌ JWT_SECRET is not set in environment variables!');
    console.error('❌ This is INSECURE and should never happen in production!');
    console.error('❌ Please set JWT_SECRET in your .env file immediately!');
    console.error('');
    console.error('Example:');
    console.error('JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"');
    console.error('');
  }
}

// Проверка на слабый дефолтный ключ
if (JWT_SECRET === 'supersecretkey12345678901234567890123456789012') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. This is INSECURE!');
  console.warn('⚠️  Please set a unique JWT_SECRET in your .env file!');
}

// Проверка длины ключа (минимум 32 символа для безопасности)
if (JWT_SECRET && JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is shorter than 32 characters.');
  console.warn('⚠️  For production, use a strong random string (minimum 32 characters).');
}

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
 * Get JWT secret (throws if not set)
 */
function getJwtSecret(): string {
	if (!JWT_SECRET) {
		throw new Error(
			'JWT_SECRET is not set. Please set it in your .env file. ' +
			'For production, use a strong random string (minimum 32 characters).'
		);
	}
	return JWT_SECRET;
}

/**
 * Generate JWT token
 */
export function generateToken(user: { id: number; email: string; isAdmin: boolean }): string {
	if (!JWT_SECRET) {
		throw new Error('JWT_SECRET is required to generate tokens');
	}

	const payload: JWTPayload = {
		userId: user.id,
		email: user.email,
		isAdmin: user.isAdmin
	};

	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: JWT_EXPIRES_IN || '7d'
	});
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
	if (!JWT_SECRET) {
		console.error('JWT_SECRET is not set. Cannot verify token.');
		return null;
	}

	try {
		return jwt.verify(token, JWT_SECRET) as JWTPayload;
	} catch {
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

