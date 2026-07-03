-- Tên campaign/adset/ad của Meta có thể dài hơn 191 ký tự → đổi name sang TEXT.
ALTER TABLE `ad_accounts` MODIFY `name` TEXT NULL;
ALTER TABLE `ad_campaigns` MODIFY `name` TEXT NULL;
ALTER TABLE `ad_sets` MODIFY `name` TEXT NULL;
ALTER TABLE `ads` MODIFY `name` TEXT NULL;
