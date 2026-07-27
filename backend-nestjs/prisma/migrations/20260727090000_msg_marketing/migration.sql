-- Marketing Messages (Messenger): opt-in token + chiến dịch + người nhận (trạng thái Sent/Delivered/Read)

CREATE TABLE `msg_marketing_optins` (
    `id` VARCHAR(191) NOT NULL,
    `page_id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `contact_id` VARCHAR(191) NOT NULL,
    `token` TEXT NULL,
    `token_expiry` DATETIME(3) NULL,
    `frequency` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPTED_IN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `msg_marketing_optins_conversation_id_key`(`conversation_id`),
    INDEX `msg_marketing_optins_page_id_status_idx`(`page_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_marketing_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_marketing_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `optin_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `message_id` VARCHAR(191) NULL,
    `error` TEXT NULL,
    `sent_at` DATETIME(3) NULL,

    UNIQUE INDEX `msg_marketing_recipients_campaign_id_optin_id_key`(`campaign_id`, `optin_id`),
    INDEX `msg_marketing_recipients_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `msg_marketing_optins` ADD CONSTRAINT `msg_marketing_optins_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `msg_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_marketing_optins` ADD CONSTRAINT `msg_marketing_optins_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `msg_conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_marketing_optins` ADD CONSTRAINT `msg_marketing_optins_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `msg_contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_marketing_recipients` ADD CONSTRAINT `msg_marketing_recipients_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `msg_marketing_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_marketing_recipients` ADD CONSTRAINT `msg_marketing_recipients_optin_id_fkey` FOREIGN KEY (`optin_id`) REFERENCES `msg_marketing_optins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
