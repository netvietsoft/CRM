-- Kho hàng: bảng kho + sản phẩm gắn kho + log chuyển kho.
CREATE TABLE `warehouses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `warehouse_transfers` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `from_warehouse_id` VARCHAR(191) NULL,
    `to_warehouse_id` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `warehouse_transfers_product_id_idx`(`product_id`),
    INDEX `warehouse_transfers_from_warehouse_id_idx`(`from_warehouse_id`),
    INDEX `warehouse_transfers_to_warehouse_id_idx`(`to_warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `products` ADD COLUMN `warehouse_id` VARCHAR(191) NULL;
CREATE INDEX `products_warehouseId_idx` ON `products`(`warehouse_id`);
ALTER TABLE `products` ADD CONSTRAINT `products_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
