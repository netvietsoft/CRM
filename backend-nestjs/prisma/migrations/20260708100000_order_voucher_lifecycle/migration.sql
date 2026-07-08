-- Voucher đơn: chế độ duyệt (AUTO = tự kích hoạt khi đủ điều kiện; MANUAL = chờ admin duyệt).
ALTER TABLE `vouchers` ADD COLUMN `approval_mode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'AUTO';

-- UserVoucher: dấu vết duyệt thủ công.
ALTER TABLE `user_vouchers` ADD COLUMN `approved_at` DATETIME(3) NULL;
ALTER TABLE `user_vouchers` ADD COLUMN `approved_by_id` VARCHAR(191) NULL;

-- Cờ "Đơn đổi": bật thì chặn kích hoạt voucher + ghép marker vào ghi chú đơn.
ALTER TABLE `orders` ADD COLUMN `is_exchange` BOOLEAN NOT NULL DEFAULT false;
