CREATE TABLE `message_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `store_id` VARCHAR(191) NULL,
  `actor_id` VARCHAR(191) NULL,
  `actor_role` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `entity_type` VARCHAR(191) NOT NULL,
  `entity_id` VARCHAR(191) NULL,
  `payload` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `message_audit_logs_store_id_idx`(`store_id`),
  INDEX `message_audit_logs_actor_id_idx`(`actor_id`),
  INDEX `message_audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
  INDEX `message_audit_logs_action_created_at_idx`(`action`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
