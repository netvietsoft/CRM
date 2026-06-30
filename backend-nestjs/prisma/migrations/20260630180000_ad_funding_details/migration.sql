-- AlterTable: lưu funding_source_details (Cách thanh toán) cho ad account
ALTER TABLE `ad_accounts` ADD COLUMN `funding_details` JSON NULL;
