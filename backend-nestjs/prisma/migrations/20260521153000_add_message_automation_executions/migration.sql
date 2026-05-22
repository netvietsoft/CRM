CREATE TABLE `message_automation_executions` (
    `id` VARCHAR(191) NOT NULL,
    `automation_rule_id` VARCHAR(191) NOT NULL,
    `message_log_id` VARCHAR(191) NULL,
    `store_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NULL,
    `trigger_type` ENUM('BIRTHDAY', 'ORDER_SHIPPING_STATUS', 'ORDER_DELIVERED_PAID') NOT NULL,
    `trigger_key` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'QUEUED', 'SENT', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `payload` JSON NULL,
    `executed_at` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `message_automation_executions_message_log_id_key`(`message_log_id`),
    UNIQUE INDEX `message_automation_executions_automation_rule_id_trigger_key_key`(`automation_rule_id`, `trigger_key`),
    INDEX `message_automation_executions_message_log_id_idx`(`message_log_id`),
    INDEX `message_automation_executions_store_id_idx`(`store_id`),
    INDEX `message_automation_executions_user_id_idx`(`user_id`),
    INDEX `message_automation_executions_order_id_idx`(`order_id`),
    INDEX `message_automation_executions_trigger_type_status_idx`(`trigger_type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `message_automation_executions` ADD CONSTRAINT `message_automation_executions_automation_rule_id_fkey` FOREIGN KEY (`automation_rule_id`) REFERENCES `automation_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `message_automation_executions` ADD CONSTRAINT `message_automation_executions_message_log_id_fkey` FOREIGN KEY (`message_log_id`) REFERENCES `message_logs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `message_automation_executions` ADD CONSTRAINT `message_automation_executions_store_id_fkey` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `message_automation_executions` ADD CONSTRAINT `message_automation_executions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `message_automation_executions` ADD CONSTRAINT `message_automation_executions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
