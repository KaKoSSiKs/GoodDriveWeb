// Валидация входных данных для API endpoints Auth
import { z } from 'zod';

// Валидация body для POST /api/auth/login
export const loginSchema = z.object({
	email: z.string().email().max(255),
	password: z.string().min(6).max(255)
});

export type LoginInput = z.infer<typeof loginSchema>;

// Валидация body для POST /api/auth/register (если будет)
export const registerSchema = z.object({
	email: z.string().email().max(255),
	password: z.string().min(8).max(255).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
		message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
	}),
	firstName: z.string().max(100).optional(),
	lastName: z.string().max(100).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Валидация body для POST /api/auth/reset-password (если будет)
export const resetPasswordSchema = z.object({
	email: z.string().email().max(255)
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Валидация body для POST /api/auth/change-password (если будет)
export const changePasswordSchema = z.object({
	currentPassword: z.string().min(6).max(255),
	newPassword: z.string().min(8).max(255).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
		message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
	})
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

