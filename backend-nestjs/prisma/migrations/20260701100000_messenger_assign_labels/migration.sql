-- Messenger GĐ3: gán nhân viên + nhãn cho hội thoại
ALTER TABLE `msg_conversations`
  ADD COLUMN `assigned_user_id` VARCHAR(191) NULL,
  ADD COLUMN `assigned_user_name` VARCHAR(191) NULL,
  ADD COLUMN `labels` JSON NULL;
