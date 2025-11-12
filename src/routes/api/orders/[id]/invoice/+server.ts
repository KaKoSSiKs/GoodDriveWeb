// GET /api/orders/[id]/invoice - Печать накладной
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

		// Формируем HTML накладной
		const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Накладная №${order.orderNumber}</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: 'Arial', sans-serif;
			padding: 20px;
			max-width: 800px;
			margin: 0 auto;
		}
		.header {
			text-align: center;
			margin-bottom: 30px;
			border-bottom: 2px solid #333;
			padding-bottom: 20px;
		}
		.header h1 { font-size: 24px; margin-bottom: 10px; }
		.info-block {
			margin-bottom: 20px;
			padding: 15px;
			background: #f5f5f5;
			border-radius: 5px;
		}
		.info-block h3 {
			font-size: 14px;
			color: #666;
			margin-bottom: 10px;
			text-transform: uppercase;
		}
		.info-row {
			display: flex;
			justify-content: space-between;
			padding: 5px 0;
		}
		.info-label { font-weight: bold; color: #333; }
		.info-value { color: #666; }
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 20px 0;
		}
		thead {
			background: #333;
			color: white;
		}
		th, td {
			padding: 12px;
			text-align: left;
			border-bottom: 1px solid #ddd;
		}
		th { font-weight: bold; }
		tr:hover { background: #f9f9f9; }
		.total-row {
			font-weight: bold;
			background: #f0f0f0;
		}
		.total-row td {
			padding: 15px 12px;
			font-size: 18px;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #ddd;
			text-align: center;
			color: #666;
			font-size: 12px;
		}
		.text-right { text-align: right; }
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>НАКЛАДНАЯ</h1>
		<p>№ ${order.orderNumber}</p>
		<p>от ${new Date(order.createdAt).toLocaleDateString('ru-RU')}</p>
	</div>

	<div class="info-block">
		<h3>Информация о клиенте</h3>
		<div class="info-row">
			<span class="info-label">Имя:</span>
			<span class="info-value">${order.customerName}</span>
		</div>
		<div class="info-row">
			<span class="info-label">Телефон:</span>
			<span class="info-value">${order.customerPhone}</span>
		</div>
		${order.customerEmail ? `
		<div class="info-row">
			<span class="info-label">Email:</span>
			<span class="info-value">${order.customerEmail}</span>
		</div>
		` : ''}
	</div>

	<div class="info-block">
		<h3>Адрес доставки</h3>
		<div class="info-row">
			<span class="info-label">Город:</span>
			<span class="info-value">${order.deliveryCity}</span>
		</div>
		<div class="info-row">
			<span class="info-label">Адрес:</span>
			<span class="info-value">${order.deliveryAddress}</span>
		</div>
		${order.deliveryPostalCode ? `
		<div class="info-row">
			<span class="info-label">Индекс:</span>
			<span class="info-value">${order.deliveryPostalCode}</span>
		</div>
		` : ''}
	</div>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование</th>
				<th>Бренд</th>
				<th class="text-right">Кол-во</th>
				<th class="text-right">Цена</th>
				<th class="text-right">Сумма</th>
			</tr>
		</thead>
		<tbody>
			${order.items
				.map(
					(item, index) => `
				<tr>
					<td>${index + 1}</td>
					<td>${item.partTitle}</td>
					<td>${item.part?.brand?.name || '-'}</td>
					<td class="text-right">${item.quantity} шт.</td>
					<td class="text-right">${parseFloat(item.price.toString()).toFixed(2)} ₽</td>
					<td class="text-right">${parseFloat(item.subtotal.toString()).toFixed(2)} ₽</td>
				</tr>
			`
				)
				.join('')}
		</tbody>
		<tfoot>
			<tr class="total-row">
				<td colspan="5" class="text-right">ИТОГО:</td>
				<td class="text-right">${parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</td>
			</tr>
		</tfoot>
	</table>

	${order.notes ? `
	<div class="info-block">
		<h3>Комментарии</h3>
		<p>${order.notes}</p>
	</div>
	` : ''}

	<div class="footer">
		<p>GoodDrive - Автозапчасти</p>
		<p>Документ создан: ${new Date().toLocaleString('ru-RU')}</p>
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
		console.error('Failed to generate invoice:', err);
		throw error(500, 'Failed to generate invoice');
	}
};

