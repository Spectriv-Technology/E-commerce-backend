-- CreateTable
CREATE TABLE `serviceable_pincodes` (
    `id` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `serviceable_pincodes_pincode_key`(`pincode`),
    INDEX `serviceable_pincodes_pincode_idx`(`pincode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
