import { prisma } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { logger } from '$lib/server/logger';
import { handleError, createErrorResponse } from '$lib/server/error-handler';

export const prerender = false;

// Экранирование XML
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export const GET: RequestHandler = async () => {
	try {
		// Используем environment variable для base URL
		const baseUrl = PUBLIC_SITE_URL || 'http://localhost:3000';
		const today = new Date().toISOString().split('T')[0];

		// Параллельные запросы для оптимизации
		const [parts, brands] = await Promise.all([
			// Получаем товары с изображениями
			prisma.part.findMany({
				where: {
					isActive: true,
					available: {
						gt: 0
					}
				},
				select: {
					id: true,
					title: true,
					updatedAt: true,
					images: {
						where: {
							imageUrl: {
								not: null
							}
						},
						select: {
							imageUrl: true,
							altText: true
						},
						orderBy: {
							orderIndex: 'asc'
						},
						take: 1 // Берем только первое изображение для sitemap
					},
					brand: {
						select: {
							name: true
						}
					}
				},
				orderBy: {
					updatedAt: 'desc'
				}
			}),
			// Получаем бренды
			prisma.brand.findMany({
				select: {
					id: true,
					name: true
				}
			})
		]);

		logger.info('Sitemap generated', { partsCount: parts.length, brandsCount: brands.length });

		// Генерируем XML sitemap с Image Sitemap
		const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
	
	<!-- Главная страница -->
	<url>
		<loc>${baseUrl}/</loc>
		<lastmod>${today}</lastmod>
		<changefreq>daily</changefreq>
		<priority>1.0</priority>
	</url>
	
	<!-- Каталог -->
	<url>
		<loc>${baseUrl}/catalog</loc>
		<lastmod>${today}</lastmod>
		<changefreq>daily</changefreq>
		<priority>0.9</priority>
	</url>
	
	<!-- Корзина -->
	<url>
		<loc>${baseUrl}/cart</loc>
		<lastmod>${today}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.7</priority>
	</url>
	
	<!-- Оформление заказа -->
	<url>
		<loc>${baseUrl}/checkout</loc>
		<lastmod>${today}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.7</priority>
	</url>
	
	<!-- Страницы брендов в каталоге -->
	${brands
		.map(
			(brand) => `
	<url>
		<loc>${baseUrl}/catalog?brand=${brand.id}</loc>
		<lastmod>${today}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>
	</url>`
		)
		.join('')}
	
	<!-- Страницы товаров с изображениями -->
	${parts
		.map((part) => {
			const productUrl = `${baseUrl}/product/${part.id}`;
			const lastmod = part.updatedAt.toISOString().split('T')[0];
			const imageTag = part.images.length > 0 && part.images[0].imageUrl
				? `
		<image:image>
			<image:loc>${escapeXml(part.images[0].imageUrl)}</image:loc>
			<image:title>${escapeXml(part.images[0].altText || part.title)}</image:title>
			<image:caption>${escapeXml(`${part.title}${part.brand?.name ? ` от ${part.brand.name}` : ''}`)}</image:caption>
		</image:image>`
				: '';

			return `
	<url>
		<loc>${productUrl}</loc>
		<lastmod>${lastmod}</lastmod>
		<changefreq>weekly</changefreq>
		<priority>0.8</priority>${imageTag}
	</url>`;
		})
		.join('')}
	
</urlset>`;

		return new Response(sitemap.trim(), {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Кешируем на 1 час
				'X-Content-Type-Options': 'nosniff'
			}
		});
	} catch (error) {
		logger.error('Error generating sitemap', error, 'sitemap');
		const appError = handleError(error, 'sitemap');
		return createErrorResponse(appError);
	}
};

