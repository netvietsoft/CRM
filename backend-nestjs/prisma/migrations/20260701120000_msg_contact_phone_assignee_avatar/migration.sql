-- CCM chat: SĐT khách (trích từ chat) + avatar nhân viên đang xử lý
ALTER TABLE `msg_contacts` ADD COLUMN `phone` VARCHAR(191) NULL;
ALTER TABLE `msg_conversations` ADD COLUMN `assigned_user_avatar` TEXT NULL;
