-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FINANCEIRO', 'COMPRAS', 'ESTOQUISTA', 'EXPEDICAO', 'ATENDIMENTO_SAC', 'MARKETING', 'VENDEDOR_PDV');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE', 'FIXED_KIT', 'VARIABLE_KIT', 'MANUFACTURED');

-- CreateEnum
CREATE TYPE "MarketplaceChannel" AS ENUM ('APP_SAGAS', 'SHOPEE', 'MERCADO_LIVRE', 'TIKTOK_SHOP', 'PDV_EVENTOS');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('MARKETPLACE', 'LOGISTICS', 'PAYMENT', 'FISCAL_SEFAZ', 'OPEN_FINANCE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR_EXPIRED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_SYNC', 'PUBLISHED', 'PAUSED_BY_MARGIN', 'PAUSED_BY_STOCK', 'ERROR');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE_IN', 'SALE_OUT', 'RESERVE_LOCK', 'RESERVE_RELEASE', 'RETURN_IN_QA', 'CYCLE_COUNT_ADJUST', 'TRANSFER_BETWEEN_WH', 'CONSIGNMENT_IN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PICKING', 'CHECKED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReverseInspectionGrade" AS ENUM ('GRADE_A_NEW', 'GRADE_B_OUTLET', 'GRADE_C_DEFECT');

-- CreateEnum
CREATE TYPE "ComboType" AS ENUM ('FIXED_PRICE', 'BUY_X_PAY_Y', 'FIXED_BUNDLE', 'VARIABLE_CATEGORY', 'PROGRESSIVE_DISCOUNT');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('PAYABLE', 'RECEIVABLE');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'RECONCILED_OPEN_FINANCE', 'ANTICIPATED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('STOCK_BELOW_MIN', 'ORDER_PAID', 'ORDER_SHIPPED', 'FLASHSALE_ENDED', 'PRODUCT_IDLE_60D', 'MARGIN_BELOW_TARGET', 'LABEL_PRINTED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('PAUSE_CHANNEL_LISTING', 'APPLY_PROGRESSIVE_MARKDOWN', 'CREATE_PURCHASE_ORDER_DRAFT', 'SEND_WHATSAPP_NOTIFICATION', 'SEND_EMAIL_ALERT', 'CREATE_INTERNAL_TASK', 'EQUALIZE_PRICE_TO_TARGET_MARGIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'BREACHED_SLA');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'ENTERPRISE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "corporateName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "taxRegime" TEXT NOT NULL,
    "ie" TEXT,
    "uf" CHAR(2) NOT NULL,
    "certA1StorageKey" TEXT,
    "certA1PasswordEnc" TEXT,
    "certA1ExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CompanyEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "RoleType" NOT NULL DEFAULT 'ATENDIMENTO_SAC',
    "permissionsJson" JSONB,
    "totpSecretEnc" TEXT,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalMappings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeChart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "measurementsJson" JSONB NOT NULL,
    "returnRateAdjustment" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ProductType" NOT NULL DEFAULT 'VARIABLE',
    "masterSku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'sagas.moda',
    "categoryId" TEXT NOT NULL,
    "sizeChartId" TEXT,
    "collectionId" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "weightGrams" INTEGER NOT NULL DEFAULT 250,
    "heightCm" DECIMAL(6,2) NOT NULL,
    "widthCm" DECIMAL(6,2) NOT NULL,
    "depthCm" DECIMAL(6,2) NOT NULL,
    "ncm" VARCHAR(10) NOT NULL,
    "cest" VARCHAR(10),
    "cfopDefault" TEXT NOT NULL DEFAULT '5102',
    "icmsOrigin" INTEGER NOT NULL DEFAULT 0,
    "icmsCstCsosn" TEXT NOT NULL DEFAULT '102',
    "aiVisualTags" TEXT[],
    "aiChannelTitles" JSONB,
    "coverImageUrl" TEXT NOT NULL,
    "mediaGallery" JSONB NOT NULL,
    "isConsigned" BOOLEAN NOT NULL DEFAULT false,
    "supplierId" TEXT,
    "lastSoldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcodeEan13" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "costPriceOverride" DECIMAL(12,2),
    "priceOverride" DECIMAL(12,2),
    "leadTimeDays" INTEGER NOT NULL DEFAULT 12,
    "dailySalesVelocity" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "returnRatePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isPhysicalStore" BOOLEAN NOT NULL DEFAULT false,
    "isQualityQuarantine" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseStock" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "stockPhysical" INTEGER NOT NULL DEFAULT 0,
    "stockReservedOrder" INTEGER NOT NULL DEFAULT 0,
    "stockReservedPromo" INTEGER NOT NULL DEFAULT 0,
    "safetyStock" INTEGER NOT NULL DEFAULT 5,
    "minStockAlert" INTEGER NOT NULL DEFAULT 10,
    "maxStockCeiling" INTEGER NOT NULL DEFAULT 200,
    "batchNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "warehouseStockId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceDocument" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accountIdentifier" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "webhookSecretEnc" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelListing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "channel" "MarketplaceChannel" NOT NULL,
    "externalListingId" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "syncedPrice" DECIMAL(12,2) NOT NULL,
    "syncedStock" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelFeeConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "MarketplaceChannel" NOT NULL,
    "channelLabel" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "fixedFeePerItem" DECIMAL(8,2) NOT NULL,
    "fixedFeeThreshold" DECIMAL(8,2),
    "paymentFeePct" DECIMAL(5,2) NOT NULL,
    "shippingCostEstimate" DECIMAL(8,2) NOT NULL,
    "packagingCost" DECIMAL(8,2) NOT NULL,
    "taxPct" DECIMAL(5,2) NOT NULL,
    "targetMarginPct" DECIMAL(5,2) NOT NULL,
    "minFloorMarginPct" DECIMAL(5,2) NOT NULL DEFAULT 15.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ChannelFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductChannelPricing" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variationId" TEXT,
    "channel" "MarketplaceChannel" NOT NULL,
    "cmvSnapshot" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "suggestedPrice" DECIMAL(12,2) NOT NULL,
    "breakEvenPrice" DECIMAL(12,2) NOT NULL,
    "netProfit" DECIMAL(12,2) NOT NULL,
    "marginPct" DECIMAL(5,2) NOT NULL,
    "derivedMarkupPct" DECIMAL(6,2) NOT NULL,
    "semaphore" TEXT NOT NULL,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ProductChannelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "type" "ComboType" NOT NULL,
    "requiredQuantity" INTEGER NOT NULL,
    "paidQuantity" INTEGER,
    "bundlePrice" DECIMAL(12,2) NOT NULL,
    "eligibleCategoryIds" TEXT[],
    "fixedVariationIds" TEXT[],
    "estimatedMarginPct" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComboRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashSaleCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "itemsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpfHash" TEXT NOT NULL,
    "cpfEnc" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "AcquisitionChannel" "MarketplaceChannel" NOT NULL DEFAULT 'APP_SAGAS',
    "loyaltyPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "storeCreditBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ltvTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "firstPurchaseAt" TIMESTAMP(3),
    "lastPurchaseAt" TIMESTAMP(3),
    "lgpdMarketingOptIn" BOOLEAN NOT NULL DEFAULT true,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "channel" "MarketplaceChannel" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customerId" TEXT NOT NULL,
    "grossTotal" DECIMAL(12,2) NOT NULL,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingCharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "platformFeeTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netRevenue" DECIMAL(12,2) NOT NULL,
    "nfeKey44" CHAR(44),
    "nfeNumber" TEXT,
    "nfeSeries" TEXT,
    "nfeProtocol" TEXT,
    "nfeXmlStorageKey" TEXT,
    "label10x15ZplUrl" TEXT,
    "labelPrintedAt" TIMESTAMP(3),
    "isClickAndCollect" BOOLEAN NOT NULL DEFAULT false,
    "fulfillmentWhId" TEXT,
    "affiliateId" TEXT,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "unitCostCmv" DECIMAL(12,2) NOT NULL,
    "fiscalProportionDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scannedAtConference" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentPackage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrierName" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "packageIndex" INTEGER NOT NULL DEFAULT 1,
    "currentStatus" TEXT NOT NULL,
    "eventsJson" JSONB NOT NULL,
    "lastPolledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "reasonCategory" TEXT NOT NULL,
    "customerNotes" TEXT,
    "reversePostageCode" TEXT,
    "inspectionGrade" "ReverseInspectionGrade",
    "voucherGeneratedAmt" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'AWAITING_POSTAGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyEntityId" TEXT NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "costCenter" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountGross" DECIMAL(12,2) NOT NULL,
    "amountNet" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "channelOrigin" "MarketplaceChannel",
    "openFinanceTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "avgLeadTimeDays" INTEGER NOT NULL DEFAULT 12,
    "qualityRating" DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDeliveryAt" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "nfeAccessKey" CHAR(44),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartTableView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filterExpressionJson" JSONB NOT NULL,
    "visibleColumns" TEXT[],
    "isDynamicSegment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartTableView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "segmentConditionId" TEXT,
    "conditionCustomJson" JSONB,
    "actionType" "AutomationActionType" NOT NULL,
    "actionPayloadJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "executionsCount" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecutionLog" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultSummary" TEXT NOT NULL,
    "errorDetails" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FashionCollection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "launchDate" TIMESTAMP(3) NOT NULL,
    "lookbookMediaJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FashionCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliatePartner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "couponCode" TEXT NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "totalSalesGenerated" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliatePartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderInternalComment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentionedUserIds" TEXT[],
    "isTaskCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderInternalComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" "MarketplaceChannel" NOT NULL,
    "externalThreadId" TEXT,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "slaDeadlineAt" TIMESTAMP(3) NOT NULL,
    "messagesJson" JSONB NOT NULL,
    "assignedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyEntity_cnpj_key" ON "CompanyEntity"("cnpj");

-- CreateIndex
CREATE INDEX "CompanyEntity_tenantId_cnpj_idx" ON "CompanyEntity"("tenantId", "cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityName_entityId_createdAt_idx" ON "AuditLog"("tenantId", "entityName", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Category_tenantId_parentId_idx" ON "Category"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_lastSoldAt_idx" ON "Product"("tenantId", "categoryId", "lastSoldAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_masterSku_key" ON "Product"("tenantId", "masterSku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_barcodeEan13_key" ON "ProductVariation"("barcodeEan13");

-- CreateIndex
CREATE INDEX "ProductVariation_sku_idx" ON "ProductVariation"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariation_productId_sku_key" ON "ProductVariation"("productId", "sku");

-- CreateIndex
CREATE INDEX "WarehouseStock_variationId_stockPhysical_idx" ON "WarehouseStock"("variationId", "stockPhysical");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_warehouseId_variationId_key" ON "WarehouseStock"("warehouseId", "variationId");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseStockId_createdAt_idx" ON "StockMovement"("warehouseStockId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_tenantId_providerKey_key" ON "IntegrationConnection"("tenantId", "providerKey");

-- CreateIndex
CREATE INDEX "ChannelListing_channel_status_idx" ON "ChannelListing"("channel", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelListing_productId_channel_key" ON "ChannelListing"("productId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelFeeConfig_tenantId_channel_key" ON "ChannelFeeConfig"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "ProductChannelPricing_channel_semaphore_idx" ON "ProductChannelPricing"("channel", "semaphore");

-- CreateIndex
CREATE UNIQUE INDEX "ProductChannelPricing_productId_channel_variationId_key" ON "ProductChannelPricing"("productId", "channel", "variationId");

-- CreateIndex
CREATE INDEX "FlashSaleCampaign_tenantId_startsAt_endsAt_idx" ON "FlashSaleCampaign"("tenantId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cpfHash_key" ON "Customer"("cpfHash");

-- CreateIndex
CREATE INDEX "Customer_tenantId_email_idx" ON "Customer"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_tenantId_channel_status_createdAt_idx" ON "Order"("tenantId", "channel", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShipmentPackage_trackingCode_idx" ON "ShipmentPackage"("trackingCode");

-- CreateIndex
CREATE INDEX "ShipmentPackage_currentStatus_lastPolledAt_idx" ON "ShipmentPackage"("currentStatus", "lastPolledAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_variationId_reasonCategory_idx" ON "ReturnRequest"("variationId", "reasonCategory");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialEntry_openFinanceTxId_key" ON "FinancialEntry"("openFinanceTxId");

-- CreateIndex
CREATE INDEX "FinancialEntry_tenantId_type_status_dueDate_idx" ON "FinancialEntry"("tenantId", "type", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "SmartTableView_tenantId_entityType_idx" ON "SmartTableView"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "AutomationExecutionLog_ruleId_executedAt_idx" ON "AutomationExecutionLog"("ruleId", "executedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliatePartner_couponCode_key" ON "AffiliatePartner"("couponCode");

-- CreateIndex
CREATE INDEX "SupportTicket_tenantId_status_slaDeadlineAt_idx" ON "SupportTicket"("tenantId", "status", "slaDeadlineAt");

-- AddForeignKey
ALTER TABLE "CompanyEntity" ADD CONSTRAINT "CompanyEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sizeChartId_fkey" FOREIGN KEY ("sizeChartId") REFERENCES "SizeChart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "FashionCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseStockId_fkey" FOREIGN KEY ("warehouseStockId") REFERENCES "WarehouseStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelListing" ADD CONSTRAINT "ChannelListing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductChannelPricing" ADD CONSTRAINT "ProductChannelPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "ShipmentPackage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartTableView" ADD CONSTRAINT "SmartTableView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecutionLog" ADD CONSTRAINT "AutomationExecutionLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderInternalComment" ADD CONSTRAINT "OrderInternalComment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
