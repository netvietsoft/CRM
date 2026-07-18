-- Xác nhận hàng hoàn + ghi chú cho đơn hoàn/huỷ
ALTER TABLE `viettel_customers`
    ADD COLUMN `return_check` VARCHAR(191) NULL,
    ADD COLUMN `return_note` TEXT NULL;
