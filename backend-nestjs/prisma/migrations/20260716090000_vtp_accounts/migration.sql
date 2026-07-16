-- Nhiều tài khoản ViettelPost (chỉ đồng bộ về CRM): bảng tài khoản phụ + gắn đơn theo tài khoản.
CREATE TABLE `vtp_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password_enc` TEXT NOT NULL,
    `web_token` TEXT NULL,
    `web_token_saved_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_import_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vtp_accounts_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Đơn thuộc tài khoản VTP nào (NULL = tài khoản chính từ env).
ALTER TABLE `viettel_customers` ADD COLUMN `vtp_account_id` VARCHAR(191) NULL;
CREATE INDEX `viettel_customers_vtpAccountId_idx` ON `viettel_customers`(`vtp_account_id`);
