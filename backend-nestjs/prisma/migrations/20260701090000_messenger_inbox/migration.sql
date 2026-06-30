-- Messenger inbox: pages / contacts / conversations / messages
CREATE TABLE `msg_pages` (
  `id` VARCHAR(191) NOT NULL,
  `store_id` VARCHAR(191) NULL,
  `platform` VARCHAR(191) NOT NULL DEFAULT 'META',
  `external_id` VARCHAR(191) NOT NULL,
  `name` TEXT NULL,
  `access_token` TEXT NULL,
  `subscribed` BOOLEAN NOT NULL DEFAULT false,
  `last_synced_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `msg_pages_platform_external_id_key`(`platform`, `external_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_contacts` (
  `id` VARCHAR(191) NOT NULL,
  `page_id` VARCHAR(191) NOT NULL,
  `psid` VARCHAR(191) NOT NULL,
  `name` TEXT NULL,
  `avatar_url` TEXT NULL,
  `raw` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `msg_contacts_page_id_psid_key`(`page_id`, `psid`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_conversations` (
  `id` VARCHAR(191) NOT NULL,
  `page_id` VARCHAR(191) NOT NULL,
  `contact_id` VARCHAR(191) NOT NULL,
  `last_message_at` DATETIME(3) NULL,
  `last_message_text` TEXT NULL,
  `last_message_dir` VARCHAR(191) NULL,
  `unread_count` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `msg_conversations_page_id_contact_id_key`(`page_id`, `contact_id`),
  INDEX `msg_conversations_page_id_last_message_at_idx`(`page_id`, `last_message_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_messages` (
  `id` VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `mid` VARCHAR(191) NULL,
  `direction` VARCHAR(191) NOT NULL,
  `text` TEXT NULL,
  `attachments` JSON NULL,
  `status` VARCHAR(191) NULL,
  `sent_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `msg_messages_mid_key`(`mid`),
  INDEX `msg_messages_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `msg_contacts` ADD CONSTRAINT `msg_contacts_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `msg_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_conversations` ADD CONSTRAINT `msg_conversations_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `msg_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_conversations` ADD CONSTRAINT `msg_conversations_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `msg_contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_messages` ADD CONSTRAINT `msg_messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `msg_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
