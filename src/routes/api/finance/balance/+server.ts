// GET /api/finance/balance
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Получаем все транзакции
		const transactions = await prisma.cashTransaction.findMany();

		// Считаем баланс
		const balance = transactions.reduce((sum, transaction) => {
			const amount = parseFloat(transaction.amount.toString());
			return transaction.type === 'income' ? sum + amount : sum - amount;
		}, 0);

		// Считаем доход и расход
		const income = transactions
			.filter((t) => t.type === 'income')
			.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

		const expense = transactions
			.filter((t) => t.type === 'expense')
			.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

		return json({
			success: true,
			balance,
			income,
			expense,
			transactionsCount: transactions.length
		});
	} catch (error) {
		console.error('Failed to fetch balance:', error);
		return json(
			{
				success: false,
				error: 'Failed to fetch balance'
			},
			{ status: 500 }
		);
	}
};

