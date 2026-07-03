-- Ngày sinh khách trên contact Messenger (đồng bộ sang User.dob nếu khớp SĐT)
ALTER TABLE `msg_contacts` ADD COLUMN `dob` DATETIME(3) NULL;
