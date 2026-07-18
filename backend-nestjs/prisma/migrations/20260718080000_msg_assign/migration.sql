-- Nhân viên trực page + cài đặt chia hội thoại (rotation)

CREATE TABLE `msg_page_staff` (
    `id` VARCHAR(191) NOT NULL,
    `page_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `msg_page_staff_page_id_user_id_key`(`page_id`, `user_id`),
    INDEX `msg_page_staff_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `msg_assign_settings` (
    `id` VARCHAR(191) NOT NULL,
    `page_id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'OFF',
    `config` JSON NULL,
    `rr_state` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `msg_assign_settings_page_id_key`(`page_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `msg_page_staff` ADD CONSTRAINT `msg_page_staff_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `msg_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_page_staff` ADD CONSTRAINT `msg_page_staff_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `msg_assign_settings` ADD CONSTRAINT `msg_assign_settings_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `msg_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
