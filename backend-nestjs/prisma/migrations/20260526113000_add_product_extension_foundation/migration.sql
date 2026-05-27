-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `note` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `suppliers_code_key`(`code`),
    INDEX `suppliers_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `materials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `materials_name_key`(`name`),
    UNIQUE INDEX `materials_code_key`(`code`),
    INDEX `materials_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `units_name_key`(`name`),
    UNIQUE INDEX `units_code_key`(`code`),
    INDEX `units_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_tags_name_key`(`name`),
    UNIQUE INDEX `product_tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_tag_map` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `tag_id` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `product_tag_map_product_id_tag_id_key`(`product_id`, `tag_id`),
    INDEX `product_tag_map_product_id_idx`(`product_id`),
    INDEX `product_tag_map_tag_id_idx`(`tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_combo_items` (
    `id` VARCHAR(191) NOT NULL,
    `combo_product_id` VARCHAR(191) NOT NULL,
    `child_product_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_combo_items_combo_product_id_child_product_id_key`(`combo_product_id`, `child_product_id`),
    INDEX `product_combo_items_combo_product_id_idx`(`combo_product_id`),
    INDEX `product_combo_items_child_product_id_idx`(`child_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `products`
    ADD COLUMN `supplier_id` VARCHAR(191) NULL,
    ADD COLUMN `material_id` VARCHAR(191) NULL,
    ADD COLUMN `unit_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `products_supplier_id_idx` ON `products`(`supplier_id`);

-- CreateIndex
CREATE INDEX `products_material_id_idx` ON `products`(`material_id`);

-- CreateIndex
CREATE INDEX `products_unit_id_idx` ON `products`(`unit_id`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_supplier_id_fkey`
    FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_material_id_fkey`
    FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_unit_id_fkey`
    FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_tag_map` ADD CONSTRAINT `product_tag_map_product_id_fkey`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_tag_map` ADD CONSTRAINT `product_tag_map_tag_id_fkey`
    FOREIGN KEY (`tag_id`) REFERENCES `product_tags`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_combo_items` ADD CONSTRAINT `product_combo_items_combo_product_id_fkey`
    FOREIGN KEY (`combo_product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_combo_items` ADD CONSTRAINT `product_combo_items_child_product_id_fkey`
    FOREIGN KEY (`child_product_id`) REFERENCES `products`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
