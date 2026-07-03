-- Trạng thái thanh toán COD (đối soát) đồng bộ từ portal viettelpost.vn (COD_STATUS):
-- KHONG_CO_COD | CHUA_NHAN_COD | CHO_NHAN_COD | DA_NHAN_COD
ALTER TABLE `viettel_customers`
  ADD COLUMN `cod_pay_status` VARCHAR(191) NULL,
  ADD COLUMN `cod_pay_status_name` VARCHAR(191) NULL,
  ADD COLUMN `cod_pay_synced_at` DATETIME(3) NULL;
