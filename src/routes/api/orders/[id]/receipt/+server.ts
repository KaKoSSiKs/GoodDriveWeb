// GET /api/orders/[id]/receipt - Печать чека
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		if (isNaN(id)) {
			throw error(400, 'Invalid order ID');
		}

		const order = await prisma.order.findUnique({
			where: { id },
			include: {
				items: {
					include: {
						part: {
							include: {
								brand: true
							}
						}
					}
				}
			}
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		// Формируем HTML чека
		const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Чек №${order.orderNumber}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: 'Courier New', monospace;
			padding: 20px;
			max-width: 400px;
			margin: 0 auto;
			background: #f5f5f5;
		}
		.receipt {
			background: white;
			padding: 20px;
			border: 2px dashed #333;
		}
		.header {
			text-align: center;
			margin-bottom: 20px;
			border-bottom: 1px dashed #333;
			padding-bottom: 15px;
		}
		.header h1 {
			font-size: 20px;
			margin-bottom: 5px;
		}
		.header p {
			font-size: 12px;
			color: #666;
		}
		.section {
			margin: 15px 0;
			padding: 10px 0;
			border-bottom: 1px dashed #ddd;
		}
		.section:last-child {
			border-bottom: none;
		}
		.row {
			display: flex;
			justify-content: space-between;
			padding: 3px 0;
			font-size: 13px;
		}
		.label {
			color: #666;
		}
		.value {
			font-weight: bold;
			color: #333;
		}
		.item {
			margin: 10px 0;
		}
		.item-name {
			font-size: 13px;
			margin-bottom: 3px;
		}
		.item-details {
			display: flex;
			justify-content: space-between;
			font-size: 12px;
			color: #666;
		}
		.total-section {
			margin-top: 20px;
			padding-top: 15px;
			border-top: 2px solid #333;
		}
		.total {
			display: flex;
			justify-content: space-between;
			font-size: 18px;
			font-weight: bold;
			margin-top: 10px;
		}
		.footer {
			text-align: center;
			margin-top: 20px;
			padding-top: 15px;
			border-top: 1px dashed #333;
			font-size: 11px;
			color: #666;
		}
		@media print {
			body {
				background: white;
				padding: 0;
			}
			.no-print {
				display: none;
			}
		}
	</style>
</head>
<body>
	<div class="receipt">
		<div class="header">
			<h1>GoodDrive</h1>
			<p>Автозапчасти</p>
			<p>ЧЕК</p>
		</div>

		<div class="section">
			<div class="row">
				<span class="label">Заказ №:</span>
				<span class="value">${order.orderNumber}</span>
			</div>
			<div class="row">
				<span class="label">Дата:</span>
				<span class="value">${new Date(order.createdAt).toLocaleString('ru-RU')}</span>
			</div>
			<div class="row">
				<span class="label">Клиент:</span>
				<span class="value">${order.customerName}</span>
			</div>
			<div class="row">
				<span class="label">Телефон:</span>
				<span class="value">${order.customerPhone}</span>
			</div>
		</div>

		<div class="section">
			<div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">Товары:</div>
			${order.items
				.map(
					(item, index) => `
				<div class="item">
					<div class="item-name">${index + 1}. ${item.partTitle}</div>
					<div class="item-details">
						<span>${item.quantity} × ${parseFloat(item.price.toString()).toFixed(2)} ₽</span>
						<span style="font-weight: bold;">${parseFloat(item.subtotal.toString()).toFixed(2)} ₽</span>
					</div>
					${item.part?.brand?.name ? `<div style="font-size: 11px; color: #999;">Бренд: ${item.part.brand.name}</div>` : ''}
				</div>
			`
				)
				.join('')}
		</div>

		<div class="total-section">
			<div class="row">
				<span>Товаров:</span>
				<span>${order.items.length} шт.</span>
			</div>
			<div class="row">
				<span>Количество:</span>
				<span>${order.items.reduce((sum, item) => sum + item.quantity, 0)} шт.</span>
			</div>
			<div class="total">
				<span>ИТОГО:</span>
				<span>${parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</span>
			</div>
		</div>

		${order.notes ? `
		<div class="section">
			<div style="font-weight: bold; margin-bottom: 5px; font-size: 12px;">Комментарий:</div>
			<div style="font-size: 11px;">${order.notes}</div>
		</div>
		` : ''}

		<div class="footer">
			<p>Спасибо за покупку!</p>
			<p>Сохраняйте чек до получения товара</p>
			<p style="margin-top: 10px;">${new Date().toLocaleString('ru-RU')}</p>
		</div>
	</div>

	<div class="no-print" style="margin-top: 20px; text-align: center;">
		<button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #333; color: white; border: none; border-radius: 5px;">
			Печать
		</button>
		<button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #666; color: white; border: none; border-radius: 5px; margin-left: 10px;">
			Закрыть
		</button>
	</div>
</body>
</html>
		`;

		return new Response(html, {
			headers: {
				'Content-Type': 'text/html; charset=utf-8'
			}
		});
	} catch (err) {
		console.error('Failed to generate receipt:', err);
		throw error(500, 'Failed to generate receipt');
	}
};

