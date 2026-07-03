-- AlterTable
ALTER TABLE `ad_accounts` ADD COLUMN `account_status` INTEGER NULL,
    ADD COLUMN `admin_count` INTEGER NULL,
    ADD COLUMN `amount_spent` DOUBLE NULL,
    ADD COLUMN `balance` DOUBLE NULL,
    ADD COLUMN `business_external_id` VARCHAR(191) NULL,
    ADD COLUMN `business_name` TEXT NULL,
    ADD COLUMN `disable_reason` INTEGER NULL,
    ADD COLUMN `funding_source` VARCHAR(191) NULL,
    ADD COLUMN `my_role` VARCHAR(191) NULL,
    ADD COLUMN `spend_cap` DOUBLE NULL,
    ADD COLUMN `user_count` INTEGER NULL;

-- CreateTable
CREATE TABLE `ad_businesses` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` TEXT NULL,
    `verification_status` VARCHAR(191) NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_businesses_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_pages` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` TEXT NULL,
    `category` VARCHAR(191) NULL,
    `business_external_id` VARCHAR(191) NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ad_pages_business_external_id_idx`(`business_external_id`),
    UNIQUE INDEX `ad_pages_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
