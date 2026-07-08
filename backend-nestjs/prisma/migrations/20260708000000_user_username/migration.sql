-- Thêm cột username (tên đăng nhập) cho nhân viên; unique, cho phép NULL.
ALTER TABLE `users` ADD COLUMN `username` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);
