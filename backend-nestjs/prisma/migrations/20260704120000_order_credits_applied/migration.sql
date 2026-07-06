-- Cờ idempotent: đơn đã cộng doanh thu/hoa hồng/soldCount hay chưa (chống cộng/đảo lặp)
ALTER TABLE `orders` ADD COLUMN `credits_applied` BOOLEAN NOT NULL DEFAULT false;
