-- Bảng map quảng cáo (campaign) -> sản phẩm, phục vụ phân tích lãi/lỗ
CREATE TABLE `ad_product_maps` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `level` VARCHAR(191) NOT NULL,
    `ad_entity_external_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ad_product_maps_platform_level_ad_entity_external_id_key`(`platform`, `level`, `ad_entity_external_id`),
    INDEX `ad_product_maps_product_id_idx`(`product_id`),
    INDEX `ad_product_maps_store_id_idx`(`store_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ad_product_maps` ADD CONSTRAINT `ad_product_maps_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
