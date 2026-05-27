ALTER TABLE `order_items`
  MODIFY COLUMN `product_id` VARCHAR(191) NULL,
  ADD COLUMN `product_name` VARCHAR(191) NULL,
  ADD COLUMN `product_image_url` LONGTEXT NULL,
  ADD COLUMN `product_display_id` VARCHAR(191) NULL,
  ADD COLUMN `product_barcode` VARCHAR(191) NULL;

ALTER TABLE `order_items`
  DROP FOREIGN KEY `order_items_product_id_fkey`;

ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
