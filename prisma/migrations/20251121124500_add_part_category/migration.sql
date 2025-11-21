-- Add category column to catalog_parts for product categorization
ALTER TABLE `catalog_parts`
ADD COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'other';


