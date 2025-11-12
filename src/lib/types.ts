// Type definitions
import type { User } from '@prisma/client';

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
}

export type SafeUser = Omit<User, 'password'>;

export interface CartItem {
	partId: number;
	title: string;
	price: number;
	quantity: number;
}

export interface CheckoutData {
	customerName: string;
	customerPhone: string;
	customerEmail?: string;
	deliveryAddress: string;
	deliveryCity: string;
	deliveryPostalCode?: string;
	notes?: string;
	items: CartItem[];
}

