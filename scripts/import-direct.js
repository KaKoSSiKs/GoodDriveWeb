// Direct import from PostgreSQL to MySQL via Docker
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';

const prisma = new PrismaClient();

async function getData(model) {
	return new Promise((resolve, reject) => {
		const cmd = spawn('docker-compose', [
			'exec',
			'-T',
			'backend',
			'python',
			'manage.py',
			'shell',
			'-c',
			`import json; from decimal import Decimal; from datetime import datetime, date; from catalog.models import ${model}; def s(o): return str(o) if isinstance(o, (Decimal, datetime, date)) else o; print(json.dumps([{k: s(v) for k, v in obj.__dict__.items() if not k.startswith('_')} for obj in ${model}.objects.all()], ensure_ascii=False))`
		], { cwd: '../' });

		let output = '';
		cmd.stdout.on('data', (data) => {
			output += data.toString();
		});

		cmd.on('close', (code) => {
			try {
				const lines = output.split('\n');
				const jsonLine = lines.find(l => l.trim().startsWith('['));
				if (jsonLine) {
					resolve(JSON.parse(jsonLine));
				} else {
					reject(new Error('No JSON data found'));
				}
			} catch (e) {
				reject(e);
			}
		});
	});
}

async function migrate() {
	console.log('🚀 Direct migration from PostgreSQL to MySQL...\n');

	try {
		// Get brands
		console.log('📍 Fetching brands from PostgreSQL...');
		const brands = await getData('Brand');
		console.log(`  Found: ${brands.length} brands`);

		for (const b of brands) {
			await prisma.brand.create({
				data: {
					id: b.id,
					name: b.name,
					country: b.country || '',
					site: b.site
				}
			});
		}
		console.log(`✓ Migrated ${brands.length} brands\n`);

		// Get warehouses
		console.log('📍 Fetching warehouses from PostgreSQL...');
		const warehouses = await getData('Warehouse');
		console.log(`  Found: ${warehouses.length} warehouses`);

		for (const w of warehouses) {
			await prisma.warehouse.create({
				data: {
					id: w.id,
					name: w.name,
					address: w.address || ''
				}
			});
		}
		console.log(`✓ Migrated ${warehouses.length} warehouses\n`);

		// Get parts
		console.log('📍 Fetching parts from PostgreSQL...');
		const parts = await getData('Part');
		console.log(`  Found: ${parts.length} parts`);

		for (const p of parts) {
			await prisma.part.create({
				data: {
					id: p.id,
					isActive: p.is_active !== undefined ? p.is_active : true,
					title: p.title,
					label: p.label || '',
					originalNumber: p.original_number || '',
					manufacturerNumber: p.manufacturer_number || '',
					brandId: p.brand_id,
					warehouseId: p.warehouse_id,
					quantity: p.quantity || 0,
					stock: p.stock || 0,
					reserve: p.reserve || 0,
					available: p.available || 0,
					priceOpt: parseFloat(p.price_opt) || 0,
					costPrice: parseFloat(p.cost_price) || 0,
					description: p.description || '',
					createdAt: p.created_at ? new Date(p.created_at) : new Date(),
					updatedAt: p.updated_at ? new Date(p.updated_at) : new Date()
				}
			});
		}
		console.log(`✓ Migrated ${parts.length} parts\n`);

		// Get images
		console.log('📍 Fetching images from PostgreSQL...');
		const images = await getData('PartImage');
		console.log(`  Found: ${images.length} images`);

		for (const img of images) {
			await prisma.partImage.create({
				data: {
					id: img.id,
					partId: img.part_id,
					image: img.image || '',
					imageUrl: img.image_url || '',
					altText: img.alt_text || '',
					orderIndex: img.order_index || 0
				}
			});
		}
		console.log(`✓ Migrated ${images.length} images\n`);

		console.log('✅ Migration completed!\n');
		console.log('Summary:');
		console.log(`  Brands: ${brands.length}`);
		console.log(`  Warehouses: ${warehouses.length}`);
		console.log(`  Parts: ${parts.length}`);
		console.log(`  Images: ${images.length}`);

	} catch (error) {
		console.error('❌ Migration failed:', error.message);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

migrate();

