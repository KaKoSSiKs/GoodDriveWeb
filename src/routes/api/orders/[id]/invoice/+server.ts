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
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			padding: 40px 20px;
			max-width: 900px;
			margin: 0 auto;
			background: #f8f9fa;
			color: #212529;
			line-height: 1.6;
		}
		.document {
			background: white;
			padding: 40px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
			border-radius: 8px;
		}
		.header {
			border-bottom: 3px solid #334e68;
			padding-bottom: 20px;
			margin-bottom: 30px;
		}
		.company-info {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 20px;
		}
		.company-left {
			flex: 1;
		}
		.company-name {
			font-size: 28px;
			font-weight: bold;
			color: #334e68;
			margin-bottom: 5px;
		}
		.company-tagline {
			font-size: 14px;
			color: #6c757d;
			margin-bottom: 15px;
		}
		.document-title {
			font-size: 32px;
			font-weight: bold;
			color: #212529;
			text-align: center;
			margin: 20px 0;
			text-transform: uppercase;
			letter-spacing: 2px;
		}
		.document-number {
			text-align: center;
			font-size: 18px;
			color: #495057;
			margin-bottom: 10px;
		}
		.document-date {
			text-align: center;
			font-size: 16px;
			color: #6c757d;
		}
		.info-section {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 30px;
			margin-bottom: 30px;
		}
		.info-block {
			background: #f8f9fa;
			padding: 20px;
			border-radius: 6px;
			border-left: 4px solid #334e68;
		}
		.info-block h3 {
			font-size: 16px;
			font-weight: bold;
			color: #334e68;
			margin-bottom: 15px;
			text-transform: uppercase;
			letter-spacing: 1px;
		}
		.info-row {
			display: flex;
			justify-content: space-between;
			padding: 8px 0;
			border-bottom: 1px solid #dee2e6;
		}
		.info-row:last-child {
			border-bottom: none;
		}
		.info-label {
			font-weight: 600;
			color: #495057;
			flex: 0 0 40%;
		}
		.info-value {
			color: #212529;
			text-align: right;
			flex: 1;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin: 30px 0;
			background: white;
		}
		thead {
			background: linear-gradient(135deg, #334e68 0%, #486581 100%);
			color: white;
		}
		th {
			padding: 15px 12px;
			text-align: left;
			font-weight: 600;
			font-size: 14px;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
		th.text-right {
			text-align: right;
		}
		td {
			padding: 12px;
			border-bottom: 1px solid #dee2e6;
			color: #495057;
		}
		tbody tr:hover {
			background: #f8f9fa;
		}
		tbody tr:last-child td {
			border-bottom: none;
		}
		td.text-right {
			text-align: right;
		}
		.total-section {
			margin-top: 20px;
			background: #f8f9fa;
			padding: 20px;
			border-radius: 6px;
		}
		.total-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding: 12px 0;
			font-size: 18px;
			font-weight: bold;
			color: #212529;
			border-top: 2px solid #334e68;
			margin-top: 10px;
			padding-top: 20px;
		}
		.total-label {
			font-size: 20px;
			text-transform: uppercase;
			letter-spacing: 1px;
		}
		.total-value {
			font-size: 24px;
			color: #334e68;
		}
		.notes-block {
			margin-top: 30px;
			padding: 20px;
			background: #fff3cd;
			border-left: 4px solid #ffc107;
			border-radius: 6px;
		}
		.notes-block h3 {
			font-size: 16px;
			font-weight: bold;
			color: #856404;
			margin-bottom: 10px;
			text-transform: uppercase;
		}
		.notes-block p {
			color: #856404;
			margin: 0;
		}
		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 2px solid #dee2e6;
			text-align: center;
			color: #6c757d;
			font-size: 12px;
		}
		.footer p {
			margin: 5px 0;
		}
		.print-buttons {
			margin-top: 30px;
			text-align: center;
		}
		.btn {
			padding: 12px 30px;
			font-size: 16px;
			cursor: pointer;
			border: none;
			border-radius: 6px;
			margin: 0 10px;
			font-weight: 600;
			transition: all 0.3s;
		}
		.btn-print {
			background: #334e68;
			color: white;
		}
		.btn-print:hover {
			background: #486581;
		}
		.btn-close {
			background: #6c757d;
			color: white;
		}
		.btn-close:hover {
			background: #5a6268;
		}
		@media print {
			body {
				background: white;
				padding: 0;
			}
			.document {
				box-shadow: none;
				padding: 20px;
			}
			.no-print {
				display: none;
			}
			.info-section {
				page-break-inside: avoid;
			}
			table {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<div class="document">
		<div class="header">
			<div class="company-info">
				<div class="company-left">
					<div class="company-name">GoodDrive</div>
					<div class="company-tagline">Автозапчасти</div>
				</div>
				<div style="text-align: right; color: #6c757d; font-size: 12px;">
					<p>тел: +7 (922) 708-15-53</p>
					<p>email: info@gooddrive.ru</p>
				</div>
			</div>
			<div class="document-title">Накладная</div>
			<div class="document-number">№ ${order.orderNumber}</div>
			<div class="document-date">от ${new Date(order.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
		</div>

		<div class="info-section">
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
		</div>

		<table>
			<thead>
				<tr>
					<th style="width: 50px;">№</th>
					<th>Наименование товара</th>
					<th>Бренд</th>
					<th class="text-right" style="width: 100px;">Кол-во</th>
					<th class="text-right" style="width: 120px;">Цена, ₽</th>
					<th class="text-right" style="width: 120px;">Сумма, ₽</th>
				</tr>
			</thead>
			<tbody>
				${order.items
					.map(
						(item, index) => `
					<tr>
						<td style="text-align: center; color: #6c757d;">${index + 1}</td>
						<td>${item.partTitle}</td>
						<td style="color: #6c757d;">${item.part?.brand?.name || '-'}</td>
						<td class="text-right">${item.quantity} шт.</td>
						<td class="text-right">${parseFloat(item.price.toString()).toFixed(2)}</td>
						<td class="text-right"><strong>${parseFloat(item.subtotal.toString()).toFixed(2)}</strong></td>
					</tr>
				`
					)
					.join('')}
			</tbody>
		</table>

		<div class="total-section">
			<div class="total-row">
				<span class="total-label">Итого к оплате:</span>
				<span class="total-value">${parseFloat(order.totalAmount.toString()).toFixed(2)} ₽</span>
			</div>
		</div>

		${order.notes ? `
		<div class="notes-block">
			<h3>Комментарии к заказу</h3>
			<p>${order.notes}</p>
		</div>
		` : ''}

		<div class="footer">
			<p><strong>GoodDrive</strong> - Автозапчасти</p>
			<p>Документ создан: ${new Date().toLocaleString('ru-RU')}</p>
			<p style="margin-top: 10px; font-size: 11px; color: #adb5bd;">
				Данный документ является основанием для передачи товара покупателю
			</p>
		</div>

		<div class="no-print print-buttons">
			<button class="btn btn-print" onclick="window.print()">🖨️ Печать</button>
			<button class="btn btn-close" onclick="window.close()">✕ Закрыть</button>
		</div>
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

