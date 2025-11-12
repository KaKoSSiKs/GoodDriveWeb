-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_staff` BOOLEAN NOT NULL DEFAULT false,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_brands` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `country` VARCHAR(50) NOT NULL,
    `site` VARCHAR(255) NULL,

    UNIQUE INDEX `catalog_brands_name_key`(`name`),
    INDEX `catalog_brands_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `address` TEXT NOT NULL,

    INDEX `catalog_warehouses_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_parts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `title` VARCHAR(200) NOT NULL,
    `label` VARCHAR(100) NULL,
    `original_number` VARCHAR(50) NULL,
    `manufacturer_number` VARCHAR(50) NULL,
    `brand_id` INTEGER NOT NULL,
    `warehouse_id` INTEGER NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `stock` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `reserve` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `available` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `price_opt` DECIMAL(10, 2) NOT NULL,
    `cost_price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog_parts_brand_id_is_active_idx`(`brand_id`, `is_active`),
    INDEX `catalog_parts_warehouse_id_is_active_idx`(`warehouse_id`, `is_active`),
    INDEX `catalog_parts_price_opt_idx`(`price_opt`),
    INDEX `catalog_parts_available_idx`(`available`),
    INDEX `catalog_parts_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_part_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `part_id` INTEGER NOT NULL,
    `image` VARCHAR(255) NULL,
    `image_url` VARCHAR(500) NULL,
    `alt_text` VARCHAR(200) NULL,
    `order_index` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    INDEX `catalog_part_images_part_id_idx`(`part_id`),
    INDEX `catalog_part_images_order_index_idx`(`order_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(50) NOT NULL,
    `customer_name` VARCHAR(100) NOT NULL,
    `customer_phone` VARCHAR(20) NOT NULL,
    `customer_email` VARCHAR(255) NULL,
    `delivery_address` TEXT NOT NULL,
    `delivery_city` VARCHAR(100) NOT NULL,
    `delivery_postal_code` VARCHAR(10) NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'new',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    INDEX `orders_order_number_idx`(`order_number`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_customer_phone_idx`(`customer_phone`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `part_id` INTEGER NOT NULL,
    `part_title` VARCHAR(200) NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_part_id_idx`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_status_history_order_id_idx`(`order_id`),
    INDEX `order_status_history_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `address` TEXT NULL,
    `category` VARCHAR(20) NOT NULL DEFAULT 'new',
    `total_orders` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_spent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `average_order` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `last_order_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crm_customers_phone_key`(`phone`),
    INDEX `crm_customers_phone_idx`(`phone`),
    INDEX `crm_customers_category_idx`(`category`),
    INDEX `crm_customers_total_spent_idx`(`total_spent`),
    INDEX `crm_customers_last_order_date_idx`(`last_order_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crm_customer_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `note` TEXT NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `crm_customer_notes_customer_id_idx`(`customer_id`),
    INDEX `crm_customer_notes_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_expense_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `finance_expense_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_expenses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `category_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` TEXT NOT NULL,
    `date` DATE NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `finance_expenses_category_id_date_idx`(`category_id`, `date`),
    INDEX `finance_expenses_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_cash_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(10) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` VARCHAR(20) NOT NULL DEFAULT 'cash',
    `description` TEXT NOT NULL,
    `order_id` INTEGER NULL,
    `expense_id` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `finance_cash_transactions_date_idx`(`date`),
    INDEX `finance_cash_transactions_type_date_idx`(`type`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finance_profit_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `revenue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `cost_of_goods` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `gross_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `operating_expenses` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `net_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `orders_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `average_order` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `margin_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `finance_profit_reports_date_key`(`date`),
    INDEX `finance_profit_reports_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `link` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_is_read_created_at_idx`(`is_read`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seo_metadata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `page` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `keywords` TEXT NULL,
    `og_title` VARCHAR(200) NULL,
    `og_description` TEXT NULL,
    `og_image` VARCHAR(500) NULL,

    UNIQUE INDEX `seo_metadata_page_key`(`page`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog_parts` ADD CONSTRAINT `catalog_parts_brand_id_fkey` FOREIGN KEY (`brand_id`) REFERENCES `catalog_brands`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog_parts` ADD CONSTRAINT `catalog_parts_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `catalog_warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog_part_images` ADD CONSTRAINT `catalog_part_images_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `catalog_parts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `catalog_parts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_customer_notes` ADD CONSTRAINT `crm_customer_notes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `crm_customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crm_customer_notes` ADD CONSTRAINT `crm_customer_notes_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_expenses` ADD CONSTRAINT `finance_expenses_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `finance_expense_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_expenses` ADD CONSTRAINT `finance_expenses_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_expense_id_fkey` FOREIGN KEY (`expense_id`) REFERENCES `finance_expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finance_cash_transactions` ADD CONSTRAINT `finance_cash_transactions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
