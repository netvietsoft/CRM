-- Quyền NV theo page: FULL (truy cập đầy đủ) | VIEW (chỉ xem, không gửi tin)
ALTER TABLE `msg_page_staff` ADD COLUMN `access` VARCHAR(191) NOT NULL DEFAULT 'FULL';
