// GET /api/parts/template - Скачать Excel-шаблон для импорта товаров
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// CSV шаблон с заголовками
		const template = [
			'title',
			'original_number',
			'manufacturer_number',
			'brand_name',
			'warehouse_name',
			'quantity',
			'price_opt',
			'cost_price',
			'description'
		].join(';');

		const exampleRow = [
			'Тормозные колодки передние',
			'1234567',
			'ABC123',
			'BREMBO',
			'Склад Москва',
			'10',
			'2500.00',
			'1800.00',
			'Керамические тормозные колодки для легковых автомобилей'
		].join(';');

		const csv = `${template}\n${exampleRow}\n`;

		return new Response('\uFEFF' + csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': 'attachment; filename="parts_template.csv"'
			}
		});
	} catch (err) {
		console.error('Failed to generate template:', err);
		throw error(500, 'Failed to generate template');
	}
};

