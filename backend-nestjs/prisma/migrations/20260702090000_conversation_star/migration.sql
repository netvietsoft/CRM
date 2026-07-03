-- Sao ưu tiên hội thoại (yellow|green|red|null) — đánh dấu dùng chung cả team
ALTER TABLE `msg_conversations` ADD COLUMN `star` VARCHAR(191) NULL;
