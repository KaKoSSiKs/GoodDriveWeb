/**
 * Data migration script from PostgreSQL to MySQL
 * 
 * Usage:
 * 1. First export data from PostgreSQL: node scripts/export-from-postgres.js
 * 2. Then run this script: node scripts/migrate-data.js
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function migrate() {
	console.log('🚀 Starting data migration...\n');

	try {
		// Read exported data
		const dataPath = path.join(__dirname, 'exported-data.json');
		
		if (!fs.existsSync(dataPath)) {
			console.error('❌ exported-data.json not found!');
			console.log('Please run: node scripts/export-from-postgres.js first');
			process.exit(1);
		}

		const rawData = fs.readFileSync(dataPath, 'utf-8');
		const data = JSON.parse(rawData);

		console.log('📦 Data loaded:');
		console.log(`  - Brands: ${data.brands.length}`);
		console.log(`  - Warehouses: ${data.warehouses.length}`);
		console.log(`  - Parts: ${data.parts.length}`);
		console.log(`  - Images: ${data.partImages.length}`);
		console.log('');

		// Migrate Brands
		console.log('📍 Migrating brands...');
		const brandMap = new Map();
		for (const brand of data.brands) {
			const newBrand = await prisma.brand.create({
				data: {
					id: brand.id,
					name: brand.name,
					country: brand.country || '',
					site: brand.site
				}
			});
			brandMap.set(brand.id, newBrand.id);
			process.stdout.write('.');
		}
		console.log(` ✓ ${data.brands.length} brands migrated\n`);

		// Migrate Warehouses
		console.log('📍 Migrating warehouses...');
		const warehouseMap = new Map();
		for (const warehouse of data.warehouses) {
			const newWarehouse = await prisma.warehouse.create({
				data: {
					id: warehouse.id,
					name: warehouse.name,
					address: warehouse.address || ''
				}
			});
			warehouseMap.set(warehouse.id, newWarehouse.id);
			process.stdout.write('.');
		}
		console.log(` ✓ ${data.warehouses.length} warehouses migrated\n`);

		// Migrate Parts
		console.log('📍 Migrating parts...');
		const partMap = new Map();
		for (const part of data.parts) {
			const newPart = await prisma.part.create({
				data: {
					id: part.id,
					isActive: part.is_active ?? true,
					title: part.title,
					label: part.label || '',
					originalNumber: part.original_number || '',
					manufacturerNumber: part.manufacturer_number || '',
					brandId: brandMap.get(part.brand_id) || part.brand_id,
					warehouseId: warehouseMap.get(part.warehouse_id) || part.warehouse_id,
					quantity: part.quantity || 0,
					stock: part.stock || 0,
					reserve: part.reserve || 0,
					available: part.available || 0,
					priceOpt: parseFloat(part.price_opt) || 0,
					costPrice: parseFloat(part.cost_price) || 0,
					description: part.description || '',
					createdAt: part.created_at ? new Date(part.created_at) : new Date(),
					updatedAt: part.updated_at ? new Date(part.updated_at) : new Date()
				}
			});
			partMap.set(part.id, newPart.id);
			process.stdout.write('.');
		}
		console.log(` ✓ ${data.parts.length} parts migrated\n`);

		// Migrate Part Images
		console.log('📍 Migrating part images...');
		for (const image of data.partImages) {
			await prisma.partImage.create({
				data: {
					id: image.id,
					partId: partMap.get(image.part_id) || image.part_id,
					image: image.image || '',
					imageUrl: image.image_url || '',
					altText: image.alt_text || '',
					orderIndex: image.order_index || 0
				}
			});
			process.stdout.write('.');
		}
		console.log(` ✓ ${data.partImages.length} images migrated\n`);

		// Migrate Orders if they exist
		if (data.orders && data.orders.length > 0) {
			console.log('📍 Migrating orders...');
			for (const order of data.orders) {
				await prisma.order.create({
					data: {
						id: order.id,
						orderNumber: order.order_number,
						customerName: order.customer_name,
						customerPhone: order.customer_phone,
						customerEmail: order.customer_email,
						deliveryAddress: order.delivery_address,
						deliveryCity: order.delivery_city,
						deliveryPostalCode: order.delivery_postal_code,
						totalAmount: parseFloat(order.total_amount),
						status: order.status,
						notes: order.notes,
						createdAt: new Date(order.created_at),
						updatedAt: new Date(order.updated_at)
					}
				});
				process.stdout.write('.');
			}
			console.log(` ✓ ${data.orders.length} orders migrated\n`);
		}

		console.log('✅ Migration completed successfully!\n');
		console.log('Summary:');
		console.log(`  - Brands: ${data.brands.length}`);
		console.log(`  - Warehouses: ${data.warehouses.length}`);
		console.log(`  - Parts: ${data.parts.length}`);
		console.log(`  - Images: ${data.partImages.length}`);
		if (data.orders) {
			console.log(`  - Orders: ${data.orders.length}`);
		}
		console.log('');

	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

migrate();

