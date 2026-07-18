-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `googleId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(15) NOT NULL,
    `email` VARCHAR(255) NOT NULL DEFAULT '',
    `address` VARCHAR(300) NOT NULL DEFAULT '',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_phone_idx`(`phone`),
    INDEX `Customer_isActive_idx`(`isActive`),
    INDEX `Customer_name_phone_address_idx`(`name`, `phone`, `address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `vehicleNumber` VARCHAR(15) NOT NULL,
    `vehicleType` ENUM('Two-Wheeler', 'Four-Wheeler', 'Commercial', 'Other') NOT NULL,
    `manufacturer` VARCHAR(50) NOT NULL,
    `model` VARCHAR(50) NOT NULL,
    `year` INTEGER NOT NULL,
    `engineNumber` VARCHAR(30) NOT NULL,
    `chassisNumber` VARCHAR(30) NOT NULL,
    `color` VARCHAR(30) NOT NULL DEFAULT '',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Vehicle_vehicleNumber_key`(`vehicleNumber`),
    UNIQUE INDEX `Vehicle_engineNumber_key`(`engineNumber`),
    UNIQUE INDEX `Vehicle_chassisNumber_key`(`chassisNumber`),
    INDEX `Vehicle_customerId_idx`(`customerId`),
    INDEX `Vehicle_isActive_idx`(`isActive`),
    INDEX `Vehicle_model_idx`(`model`),
    INDEX `Vehicle_vehicleNumber_engineNumber_chassisNumber_model_idx`(`vehicleNumber`, `engineNumber`, `chassisNumber`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Policy` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `vehicleId` VARCHAR(191) NOT NULL,
    `policyNumber` VARCHAR(50) NOT NULL,
    `insuranceCompany` VARCHAR(100) NOT NULL,
    `policyType` VARCHAR(50) NOT NULL,
    `premiumAmount` DOUBLE NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `extraField1` VARCHAR(100) NOT NULL DEFAULT '',
    `extraField2` VARCHAR(100) NOT NULL DEFAULT '',
    `extraField3` VARCHAR(100) NOT NULL DEFAULT '',
    `comments` VARCHAR(1000) NOT NULL DEFAULT '',
    `attachmentUrl` VARCHAR(500) NOT NULL DEFAULT '',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Policy_policyNumber_key`(`policyNumber`),
    INDEX `Policy_customerId_idx`(`customerId`),
    INDEX `Policy_vehicleId_idx`(`vehicleId`),
    INDEX `Policy_isActive_idx`(`isActive`),
    INDEX `Policy_isActive_expiryDate_idx`(`isActive`, `expiryDate`),
    INDEX `Policy_isActive_createdAt_idx`(`isActive`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(255) NOT NULL DEFAULT 'System',
    `action` VARCHAR(100) NOT NULL,
    `details` VARCHAR(1000) NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_userId_idx`(`userId`),
    INDEX `ActivityLog_action_idx`(`action`),
    INDEX `ActivityLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Policy` ADD CONSTRAINT `Policy_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Policy` ADD CONSTRAINT `Policy_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Policy` ADD CONSTRAINT `Policy_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Policy` ADD CONSTRAINT `Policy_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
