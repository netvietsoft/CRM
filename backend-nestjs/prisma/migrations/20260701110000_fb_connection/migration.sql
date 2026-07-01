-- Facebook OAuth connection (long-lived user token, mã hoá)
CREATE TABLE `fb_connections` (
  `id` VARCHAR(191) NOT NULL,
  `store_id` VARCHAR(191) NULL,
  `fb_user_id` VARCHAR(191) NOT NULL,
  `fb_name` TEXT NULL,
  `token_enc` TEXT NOT NULL,
  `token_iv` VARCHAR(191) NOT NULL,
  `token_tag` VARCHAR(191) NOT NULL,
  `token_expires_at` DATETIME(3) NULL,
  `scopes` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `last_refresh_at` DATETIME(3) NULL,
  `raw` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `fb_connections_store_id_fb_user_id_key`(`store_id`, `fb_user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
