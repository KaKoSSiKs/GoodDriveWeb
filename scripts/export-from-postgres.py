#!/usr/bin/env python3
"""
Export data from PostgreSQL Django database to JSON
Run this script from the Django backend directory:
    python ../gooddrive-sveltekit/scripts/export-from-postgres.py
"""

import os
import sys
import django
import json
from decimal import Decimal
from datetime import datetime, date

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gooddrive_backend.settings')
django.setup()

from catalog.models import Brand, Warehouse, Part, PartImage
from orders.models import Order, OrderItem
from crm.models import Customer
from finance.models import ExpenseCategory, Expense

def serialize_value(obj):
    """Convert Django model values to JSON-serializable types"""
    if isinstance(obj, Decimal):
        return str(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif obj is None:
        return None
    return obj

def export_brands():
    brands = []
    for brand in Brand.objects.all():
        brands.append({
            'id': brand.id,
            'name': brand.name,
            'country': brand.country,
            'site': brand.site
        })
    return brands

def export_warehouses():
    warehouses = []
    for wh in Warehouse.objects.all():
        warehouses.append({
            'id': wh.id,
            'name': wh.name,
            'address': wh.address
        })
    return warehouses

def export_parts():
    parts = []
    for part in Part.objects.all():
        parts.append({
            'id': part.id,
            'is_active': part.is_active,
            'title': part.title,
            'label': part.label,
            'original_number': part.original_number,
            'manufacturer_number': part.manufacturer_number,
            'brand_id': part.brand_id,
            'warehouse_id': part.warehouse_id,
            'quantity': part.quantity,
            'stock': part.stock,
            'reserve': part.reserve,
            'available': part.available,
            'price_opt': serialize_value(part.price_opt),
            'cost_price': serialize_value(part.cost_price),
            'description': part.description,
            'created_at': serialize_value(part.created_at),
            'updated_at': serialize_value(part.updated_at)
        })
    return parts

def export_part_images():
    images = []
    for img in PartImage.objects.all():
        images.append({
            'id': img.id,
            'part_id': img.part_id,
            'image': str(img.image) if img.image else None,
            'image_url': img.image_url,
            'alt_text': img.alt_text,
            'order_index': img.order_index
        })
    return images

def export_orders():
    orders = []
    for order in Order.objects.all():
        orders.append({
            'id': order.id,
            'order_number': order.order_number,
            'customer_name': order.customer_name,
            'customer_phone': order.customer_phone,
            'customer_email': order.customer_email,
            'delivery_address': order.delivery_address,
            'delivery_city': order.delivery_city,
            'delivery_postal_code': order.delivery_postal_code,
            'total_amount': serialize_value(order.total_amount),
            'status': order.status,
            'notes': order.notes,
            'created_at': serialize_value(order.created_at),
            'updated_at': serialize_value(order.updated_at)
        })
    return orders

def main():
    print("🚀 Exporting data from PostgreSQL...\n")

    data = {
        'brands': export_brands(),
        'warehouses': export_warehouses(),
        'parts': export_parts(),
        'partImages': export_part_images(),
        'orders': export_orders()
    }

    print(f"✓ Exported {len(data['brands'])} brands")
    print(f"✓ Exported {len(data['warehouses'])} warehouses")
    print(f"✓ Exported {len(data['parts'])} parts")
    print(f"✓ Exported {len(data['partImages'])} images")
    print(f"✓ Exported {len(data['orders'])} orders")
    print()

    # Save to file
    output_path = os.path.join(
        os.path.dirname(__file__),
        'exported-data.json'
    )
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Data exported to: {output_path}")
    print(f"📁 File size: {os.path.getsize(output_path) / 1024:.2f} KB")
    print()
    print("Next step: Run 'node scripts/migrate-data.js' to import into MySQL")

if __name__ == '__main__':
    main()

