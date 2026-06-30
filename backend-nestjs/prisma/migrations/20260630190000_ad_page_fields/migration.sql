-- AlterTable: bổ sung field cho ad_pages (quyền/tasks, follower, verify, scope store)
ALTER TABLE `ad_pages`
  ADD COLUMN `store_id` VARCHAR(191) NULL,
  ADD COLUMN `tasks` JSON NULL,
  ADD COLUMN `fan_count` INTEGER NULL,
  ADD COLUMN `followers_count` INTEGER NULL,
  ADD COLUMN `link` TEXT NULL,
  ADD COLUMN `verification_status` VARCHAR(191) NULL,
  ADD COLUMN `is_published` BOOLEAN NULL,
  ADD COLUMN `last_synced_at` DATETIME(3) NULL;
