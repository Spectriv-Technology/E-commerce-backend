-- AlterTable
ALTER TABLE `coupons` ADD COLUMN `banner` VARCHAR(255) NULL,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false;
