-- Corrective migration: these two tables exist in schema.prisma (models
-- OrderSource -> `order_sources`, ViettelCustomer -> `viettel_customers`) but
-- were originally created via `prisma db push` and never captured as a CREATE
-- migration. On a fresh database `migrate deploy` therefore failed when later
-- ALTER migrations touched `viettel_customers`. This creates both tables so the
-- full migration history replays cleanly. `viettel_customers` is created WITHOUT
-- the columns/index that the later ALTER migrations add:
--   20260630140000_add_viettel_cod_pay_status -> cod_pay_status / _name / _synced_at
--   20260630150000_add_viettel_send_date      -> send_date + send_date index

-- CreateTable
CREATE TABLE `order_sources` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `color` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_sources_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `viettel_customers` (
    `id` VARCHAR(191) NOT NULL,
    `tracking_code` VARCHAR(191) NOT NULL,
    `order_reference` VARCHAR(191) NULL,
    `status` INTEGER NULL,
    `status_name` VARCHAR(191) NULL,
    `status_date` DATETIME(3) NULL,
    `receiver_fullname` VARCHAR(191) NULL,
    `receiver_phone` VARCHAR(191) NULL,
    `receiver_address` TEXT NULL,
    `receiver_province_id` INTEGER NULL,
    `receiver_district_id` INTEGER NULL,
    `receiver_ward_id` INTEGER NULL,
    `product_name` TEXT NULL,
    `detail_payload` JSON NULL,
    `detail_enriched_at` DATETIME(3) NULL,
    `cod` DOUBLE NOT NULL DEFAULT 0,
    `cod_origin` DOUBLE NULL,
    `money_total` DOUBLE NULL,
    `money_total_fee` DOUBLE NULL,
    `money_total_vat` DOUBLE NULL,
    `money_fee_cod` DOUBLE NULL,
    `voucher_value` DOUBLE NULL,
    `product_weight` INTEGER NULL,
    `order_service` VARCHAR(191) NULL,
    `order_service_add` VARCHAR(191) NULL,
    `order_payment` INTEGER NULL,
    `expected_delivery` TEXT NULL,
    `expected_delivery_date` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `order_note` TEXT NULL,
    `location_currently` TEXT NULL,
    `employee_name` VARCHAR(191) NULL,
    `employee_phone` VARCHAR(191) NULL,
    `is_returning` BOOLEAN NOT NULL DEFAULT false,
    `reason_code` VARCHAR(191) NULL,
    `group_address_id` VARCHAR(191) NULL,
    `detail` JSON NULL,
    `pod` JSON NULL,
    `courier_history` JSON NULL,
    `raw_payload` JSON NULL,
    `store_id` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `viettel_customers_tracking_code_key`(`tracking_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
