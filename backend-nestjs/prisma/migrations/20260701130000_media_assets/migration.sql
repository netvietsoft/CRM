-- Thư viện media dùng chung (ảnh/tệp/video upload R2) cho picker chat CCM
CREATE TABLE `media_assets` (
  `id` VARCHAR(191) NOT NULL,
  `url` TEXT NOT NULL,
  `name` VARCHAR(191) NULL,
  `type` VARCHAR(191) NOT NULL DEFAULT 'image',
  `folder` VARCHAR(191) NULL,
  `size` INT NULL,
  `uploader_id` VARCHAR(191) NULL,
  `store_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `media_assets_store_id_idx`(`store_id`),
  INDEX `media_assets_type_idx`(`type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
