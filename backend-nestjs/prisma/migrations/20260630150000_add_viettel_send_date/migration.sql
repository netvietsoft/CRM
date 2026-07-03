-- Thêm cột ngày gửi (ORDER_SYSTEMDATE) cho thống kê tiền hàng ViettelPost
ALTER TABLE `viettel_customers` ADD COLUMN `send_date` DATETIME NULL;

-- Index phục vụ lọc theo khoảng ngày gửi
CREATE INDEX `viettel_customers_send_date_idx` ON `viettel_customers`(`send_date`);
