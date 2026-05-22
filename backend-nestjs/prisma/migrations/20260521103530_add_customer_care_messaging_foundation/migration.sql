-- CreateTable
CREATE TABLE `message_channels` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('ZALO', 'MESSENGER', 'SMS', 'WHATSAPP', 'TIKTOK', 'SHOPEE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `message_channels_code_key`(`code`),
    INDEX `message_channels_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('PRESET', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `content` LONGTEXT NOT NULL,
    `variables` JSON NULL,
    `metadata` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_templates_channel_id_is_active_idx`(`channel_id`, `is_active`),
    INDEX `message_templates_store_id_idx`(`store_id`),
    INDEX `message_templates_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `provider_config_id` VARCHAR(191) NULL,
    `automation_rule_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `audience_source` ENUM('MANUAL', 'FILTER', 'IMPORT') NOT NULL DEFAULT 'MANUAL',
    `send_mode` ENUM('IMMEDIATE', 'SCHEDULED', 'AUTOMATED') NOT NULL DEFAULT 'IMMEDIATE',
    `status` ENUM('DRAFT', 'READY', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
    `filters` JSON NULL,
    `message_content` LONGTEXT NULL,
    `scheduled_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_campaigns_channel_id_status_idx`(`channel_id`, `status`),
    INDEX `message_campaigns_store_id_idx`(`store_id`),
    INDEX `message_campaigns_template_id_idx`(`template_id`),
    INDEX `message_campaigns_provider_config_id_idx`(`provider_config_id`),
    INDEX `message_campaigns_automation_rule_id_idx`(`automation_rule_id`),
    INDEX `message_campaigns_created_by_id_idx`(`created_by_id`),
    INDEX `message_campaigns_scheduled_at_idx`(`scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_audiences` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NULL,
    `contact_identity_id` VARCHAR(191) NULL,
    `recipient_name` VARCHAR(191) NULL,
    `recipient_value` VARCHAR(191) NOT NULL,
    `snapshot_data` JSON NULL,
    `status` ENUM('PENDING', 'QUEUED', 'SKIPPED', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_audiences_campaign_id_idx`(`campaign_id`),
    INDEX `message_audiences_channel_id_status_idx`(`channel_id`, `status`),
    INDEX `message_audiences_store_id_idx`(`store_id`),
    INDEX `message_audiences_user_id_idx`(`user_id`),
    INDEX `message_audiences_order_id_idx`(`order_id`),
    INDEX `message_audiences_contact_identity_id_idx`(`contact_identity_id`),
    INDEX `message_audiences_recipient_value_idx`(`recipient_value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `campaign_id` VARCHAR(191) NULL,
    `automation_rule_id` VARCHAR(191) NULL,
    `provider_config_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `run_at` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `payload` JSON NULL,
    `attempt_count` INTEGER NOT NULL DEFAULT 0,
    `last_attempt_at` DATETIME(3) NULL,
    `last_error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_schedules_channel_id_status_run_at_idx`(`channel_id`, `status`, `run_at`),
    INDEX `message_schedules_store_id_idx`(`store_id`),
    INDEX `message_schedules_campaign_id_idx`(`campaign_id`),
    INDEX `message_schedules_automation_rule_id_idx`(`automation_rule_id`),
    INDEX `message_schedules_provider_config_id_idx`(`provider_config_id`),
    INDEX `message_schedules_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_rules` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `provider_config_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `trigger_type` ENUM('BIRTHDAY', 'ORDER_SHIPPING_STATUS', 'ORDER_DELIVERED_PAID') NOT NULL,
    `trigger_config` JSON NULL,
    `audience_filter` JSON NULL,
    `metadata` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_run_at` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `automation_rules_channel_id_trigger_type_is_active_idx`(`channel_id`, `trigger_type`, `is_active`),
    INDEX `automation_rules_store_id_idx`(`store_id`),
    INDEX `automation_rules_template_id_idx`(`template_id`),
    INDEX `automation_rules_provider_config_id_idx`(`provider_config_id`),
    INDEX `automation_rules_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_contact_identities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` ENUM('PHONE', 'EMAIL', 'ZALO_UID', 'MESSENGER_PSID', 'WHATSAPP_PHONE', 'TIKTOK_UID', 'SHOPEE_UID') NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_contact_identities_user_id_type_idx`(`user_id`, `type`),
    INDEX `customer_contact_identities_value_idx`(`value`),
    UNIQUE INDEX `customer_contact_identities_type_value_key`(`type`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_provider_configs` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `provider_key` VARCHAR(191) NOT NULL,
    `settings` JSON NULL,
    `secret_settings` JSON NULL,
    `metadata` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_provider_configs_channel_id_is_active_idx`(`channel_id`, `is_active`),
    INDEX `message_provider_configs_store_id_idx`(`store_id`),
    INDEX `message_provider_configs_provider_key_idx`(`provider_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_opt_outs` (
    `id` VARCHAR(191) NOT NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `contact_identity_id` VARCHAR(191) NULL,
    `recipient_value` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `source` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_opt_outs_user_id_idx`(`user_id`),
    INDEX `message_opt_outs_contact_identity_id_idx`(`contact_identity_id`),
    INDEX `message_opt_outs_is_active_idx`(`is_active`),
    UNIQUE INDEX `message_opt_outs_channel_id_recipient_value_key`(`channel_id`, `recipient_value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_logs` (
    `id` VARCHAR(191) NOT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `channel_id` VARCHAR(191) NOT NULL,
    `store_id` VARCHAR(191) NULL,
    `campaign_id` VARCHAR(191) NULL,
    `template_id` VARCHAR(191) NULL,
    `automation_rule_id` VARCHAR(191) NULL,
    `provider_config_id` VARCHAR(191) NULL,
    `audience_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `recipient_name` VARCHAR(191) NULL,
    `recipient_value` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `rendered_variables` JSON NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'QUEUED',
    `provider_message_id` VARCHAR(191) NULL,
    `error_code` VARCHAR(191) NULL,
    `error_message` TEXT NULL,
    `queued_at` DATETIME(3) NULL,
    `sent_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `read_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `message_logs_idempotency_key_key`(`idempotency_key`),
    INDEX `message_logs_idempotency_key_idx`(`idempotency_key`),
    INDEX `message_logs_channel_id_status_idx`(`channel_id`, `status`),
    INDEX `message_logs_store_id_idx`(`store_id`),
    INDEX `message_logs_campaign_id_idx`(`campaign_id`),
    INDEX `message_logs_template_id_idx`(`template_id`),
    INDEX `message_logs_automation_rule_id_idx`(`automation_rule_id`),
    INDEX `message_logs_provider_config_id_idx`(`provider_config_id`),
    INDEX `message_logs_audience_id_idx`(`audience_id`),
    INDEX `message_logs_user_id_idx`(`user_id`),
    INDEX `message_logs_order_id_idx`(`order_id`),
    INDEX `message_logs_created_by_id_idx`(`created_by_id`),
    INDEX `message_logs_recipient_value_idx`(`recipient_value`),
    INDEX `message_logs_sent_at_idx`(`sent_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `message_channels` (`id`, `code`, `name`, `description`, `is_active`, `metadata`, `createdAt`, `updatedAt`)
VALUES
    (UUID(), 'SMS', 'SMS', 'Kenh nhan tin SMS uu tien trien khai hien tai', true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (UUID(), 'ZALO', 'Zalo', 'Kenh Zalo Official Account, chua kich hoat', false, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (UUID(), 'MESSENGER', 'Messenger', 'Kenh Facebook Messenger, chua kich hoat', false, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (UUID(), 'WHATSAPP', 'WhatsApp', 'Kenh WhatsApp, chua kich hoat', false, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (UUID(), 'TIKTOK', 'TikTok', 'Kenh TikTok, chua kich hoat', false, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
    (UUID(), 'SHOPEE', 'Shopee', 'Kenh Shopee, chua kich hoat', false, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `description` = VALUES(`description`),
    `is_active` = VALUES(`is_active`),
    `updatedAt` = CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `message_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_automation_rule_id_fkey` FOREIGN KEY (`automation_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_campaigns` ADD CONSTRAINT `message_campaigns_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `message_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_audiences` ADD CONSTRAINT `message_audiences_contact_identity_id_fkey` FOREIGN KEY (`contact_identity_id`) REFERENCES `customer_contact_identities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `message_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_automation_rule_id_fkey` FOREIGN KEY (`automation_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `message_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_schedules` ADD CONSTRAINT `message_schedules_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `message_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_rules` ADD CONSTRAINT `automation_rules_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_contact_identities` ADD CONSTRAINT `customer_contact_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_provider_configs` ADD CONSTRAINT `message_provider_configs_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_provider_configs` ADD CONSTRAINT `message_provider_configs_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_opt_outs` ADD CONSTRAINT `message_opt_outs_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_opt_outs` ADD CONSTRAINT `message_opt_outs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_opt_outs` ADD CONSTRAINT `message_opt_outs_contact_identity_id_fkey` FOREIGN KEY (`contact_identity_id`) REFERENCES `customer_contact_identities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_channel_id_fkey` FOREIGN KEY (`channel_id`) REFERENCES `message_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `message_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_automation_rule_id_fkey` FOREIGN KEY (`automation_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_provider_config_id_fkey` FOREIGN KEY (`provider_config_id`) REFERENCES `message_provider_configs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_audience_id_fkey` FOREIGN KEY (`audience_id`) REFERENCES `message_audiences`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_logs` ADD CONSTRAINT `message_logs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
