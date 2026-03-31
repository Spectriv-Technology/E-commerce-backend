-- CreateTable
CREATE TABLE `product_pincodes` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `pincodeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_pincodes_pincodeId_idx`(`pincodeId`),
    UNIQUE INDEX `product_pincodes_productId_pincodeId_key`(`productId`, `pincodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_pincodes` ADD CONSTRAINT `product_pincodes_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_pincodes` ADD CONSTRAINT `product_pincodes_pincodeId_fkey` FOREIGN KEY (`pincodeId`) REFERENCES `serviceable_pincodes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
