-- CreateTable
CREATE TABLE `ad_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `timezone_name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `last_synced_at` DATETIME(3) NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_accounts_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `objective` VARCHAR(191) NULL,
    `daily_budget` DOUBLE NULL,
    `lifetime_budget` DOUBLE NULL,
    `start_time` DATETIME(3) NULL,
    `stop_time` DATETIME(3) NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ad_campaigns_account_id_idx`(`account_id`),
    UNIQUE INDEX `ad_campaigns_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_sets` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `daily_budget` DOUBLE NULL,
    `lifetime_budget` DOUBLE NULL,
    `optimization_goal` VARCHAR(191) NULL,
    `billing_event` VARCHAR(191) NULL,
    `targeting` JSON NULL,
    `start_time` DATETIME(3) NULL,
    `stop_time` DATETIME(3) NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ad_sets_account_id_idx`(`account_id`),
    INDEX `ad_sets_campaign_id_idx`(`campaign_id`),
    UNIQUE INDEX `ad_sets_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ads` (
    `id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `ad_set_id` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `external_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `creative` JSON NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ads_account_id_idx`(`account_id`),
    INDEX `ads_campaign_id_idx`(`campaign_id`),
    INDEX `ads_ad_set_id_idx`(`ad_set_id`),
    UNIQUE INDEX `ads_platform_external_id_key`(`platform`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_insights` (
    `id` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
    `level` VARCHAR(191) NOT NULL,
    `entity_external_id` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NULL,
    `ad_set_id` VARCHAR(191) NULL,
    `ad_id` VARCHAR(191) NULL,
    `date` DATE NOT NULL,
    `spend` DOUBLE NULL,
    `impressions` INTEGER NULL,
    `reach` INTEGER NULL,
    `clicks` INTEGER NULL,
    `unique_clicks` INTEGER NULL,
    `ctr` DOUBLE NULL,
    `cpc` DOUBLE NULL,
    `cpm` DOUBLE NULL,
    `frequency` DOUBLE NULL,
    `results` INTEGER NULL,
    `cost_per_result` DOUBLE NULL,
    `actions` JSON NULL,
    `action_values` JSON NULL,
    `raw` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ad_insights_account_id_date_idx`(`account_id`, `date`),
    INDEX `ad_insights_campaign_id_date_idx`(`campaign_id`, `date`),
    UNIQUE INDEX `ad_insights_platform_level_entity_external_id_date_key`(`platform`, `level`, `entity_external_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `ad_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_sets` ADD CONSTRAINT `ad_sets_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `ad_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_sets` ADD CONSTRAINT `ad_sets_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ads` ADD CONSTRAINT `ads_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `ad_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ads` ADD CONSTRAINT `ads_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ads` ADD CONSTRAINT `ads_ad_set_id_fkey` FOREIGN KEY (`ad_set_id`) REFERENCES `ad_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_insights` ADD CONSTRAINT `ad_insights_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `ad_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_insights` ADD CONSTRAINT `ad_insights_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_insights` ADD CONSTRAINT `ad_insights_ad_set_id_fkey` FOREIGN KEY (`ad_set_id`) REFERENCES `ad_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_insights` ADD CONSTRAINT `ad_insights_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `ads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

