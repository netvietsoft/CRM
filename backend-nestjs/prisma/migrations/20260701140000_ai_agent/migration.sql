-- AI chốt đơn qua chat (CCM): config theo page + state hội thoại + gợi ý (shadow/audit)
CREATE TABLE `ai_agent_configs` (
  `id` VARCHAR(191) NOT NULL,
  `page_id` VARCHAR(191) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `mode` VARCHAR(191) NOT NULL DEFAULT 'SHADOW',
  `persona` TEXT NULL,
  `product_scope` JSON NULL,
  `daily_token_cap` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ai_agent_configs_page_id_key`(`page_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_conversation_states` (
  `id` VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `slots` JSON NULL,
  `last_ai_at` DATETIME(3) NULL,
  `tokens_today` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ai_conversation_states_conversation_id_key`(`conversation_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_suggestions` (
  `id` VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `reply_text` TEXT NULL,
  `tool_calls` JSON NULL,
  `order_draft` JSON NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ai_suggestions_conversation_id_status_idx`(`conversation_id`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
