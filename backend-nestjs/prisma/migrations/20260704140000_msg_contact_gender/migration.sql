-- Giới tính khách trên contact Messenger (set từ 3A); đồng bộ User.gender nếu khớp SĐT duy nhất.
ALTER TABLE `msg_contacts` ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL;
