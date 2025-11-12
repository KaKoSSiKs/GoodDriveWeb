import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { PUBLIC_SITE_URL } from '$env/static/public';

export const prerender = false;

export const GET: RequestHandler = async () => {
	try {
		// Используем environment variable для base URL
		// В development будет localhost, в production - реальный домен
		const baseUrl = PUBLIC_SITE_URL || 'http://localhost:3000';
		const buildDate = new Date().toUTCString();

		// Получаем последние 50 товаров
		const parts = await db.part.findMany({
			take: 50,
			select: {
				id: true,
				title: true,
				description: true,
				price_opt: true,
				available: true,
				created_at: true,
				updated_at: true,
				brand: {
					select: {
						name: true
					}
				},
				images: {
					take: 1,
					select: {
						image_url: true
					}
				}
			},
			where: {
				available: {
					gt: 0
				}
			},
			orderBy: {
				created_at: 'desc'
			}
		});

		// Генерируем RSS feed
		const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
	<channel>
		<title>GoodDrive - Автозапчасти</title>
		<link>${baseUrl}</link>
		<description>Новые поступления автозапчастей в интернет-магазине GoodDrive</description>
		<language>ru</language>
		<lastBuildDate>${buildDate}</lastBuildDate>
		<atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
		<copyright>© ${new Date().getFullYear()} GoodDrive. Все права защищены.</copyright>
		<ttl>60</ttl>
		
		${parts
			.map((part) => {
				const imageUrl = part.images[0]?.image_url || '';
				const description = part.description || `${part.title} от ${part.brand.name}`;
				const pubDate = new Date(part.created_at).toUTCString();

				return `
		<item>
			<title>${escapeXml(part.title)}</title>
			<link>${baseUrl}/product/${part.id}</link>
			<guid isPermaLink="true">${baseUrl}/product/${part.id}</guid>
			<description><![CDATA[${escapeXml(description)}]]></description>
			<dc:creator>GoodDrive</dc:creator>
			<pubDate>${pubDate}</pubDate>
			<category>${escapeXml(part.brand.name)}</category>
			${imageUrl ? `<enclosure url="${escapeXml(imageUrl)}" type="image/jpeg"/>` : ''}
			<content:encoded><![CDATA[
				<div>
					${imageUrl ? `<img src="${escapeXml(imageUrl)}" alt="${escapeXml(part.title)}" style="max-width: 400px; height: auto;"/>` : ''}
					<h2>${escapeXml(part.title)}</h2>
					<p><strong>Бренд:</strong> ${escapeXml(part.brand.name)}</p>
					<p><strong>Цена:</strong> ${part.price_opt} ₽</p>
					<p><strong>Наличие:</strong> ${part.available} шт</p>
					<p>${escapeXml(description)}</p>
					<p><a href="${baseUrl}/product/${part.id}">Подробнее →</a></p>
				</div>
			]]></content:encoded>
		</item>`;
			})
			.join('')}
	</channel>
</rss>`;

		return new Response(rss.trim(), {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600' // Кешируем на 1 час
			}
		});
	} catch (error) {
		console.error('Error generating RSS feed:', error);
		return new Response('Error generating RSS feed', { status: 500 });
	}
};

// Вспомогательная функция для экранирования XML
function escapeXml(unsafe: string): string {
	if (!unsafe) return '';
	return unsafe
		.toString()
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

