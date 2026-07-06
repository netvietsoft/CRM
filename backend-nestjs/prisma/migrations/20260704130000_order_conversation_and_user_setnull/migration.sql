-- C2: đổi FK orders.user_id từ ON DELETE CASCADE -> SET NULL
-- (xoá/purge 1 khách KHÔNG được xoá lịch sử đơn — dữ liệu tài chính phải giữ lại).
ALTER TABLE `orders` DROP FOREIGN KEY `orders_user_id_fkey`;
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- I6: cột thật conversation_id (thay vì lọc JSON metadata.$.conversationId gây full scan).
ALTER TABLE `orders` ADD COLUMN `conversation_id` VARCHAR(191) NULL;

-- Backfill từ metadata JSON cho đơn CCM đã tạo trước đây.
UPDATE `orders`
  SET `conversation_id` = JSON_UNQUOTE(JSON_EXTRACT(`metadata`, '$.conversationId'))
  WHERE `metadata` IS NOT NULL
    AND JSON_EXTRACT(`metadata`, '$.conversationId') IS NOT NULL;

-- Index cho tra cứu theo hội thoại (mở panel CCM).
CREATE INDEX `orders_conversation_id_idx` ON `orders`(`conversation_id`);
