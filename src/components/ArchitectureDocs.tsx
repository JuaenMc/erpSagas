import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Database,
  Layers,
  ShieldCheck,
  Zap,
  Radio,
  FileCode,
  FolderTree,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [activeDocTab, setActiveDocTab] = useState<'schema' | 'monorepo' | 'flow' | 'endpoints' | 'nestjs'>('schema');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const PRISMA_SCHEMA = `// =============================================================================
// ENTERPRISE PRISMA SCHEMA — SAGAS.MODA ERP & HUB OMNICHANNEL (10K+ ORDERS/DAY)
// PostgreSQL 16 + pgcrypto | Multi-Tenancy Ready | Soft-Delete | Audit Trail
// =============================================================================

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgcrypto]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch", "driverAdapters"]
}

// -----------------------------------------------------------------------------
// ENUMS GLOBAIS (DOMÍNIOS ENTERPRISE)
// -----------------------------------------------------------------------------
enum RoleType {
  SUPER_ADMIN
  ADMIN
  FINANCEIRO
  ESTOQUISTA
  EXPEDICAO
  VENDEDOR
  SUPORTE_SAC
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  SOFT_DELETE
  LOGIN_2FA
  TOKEN_REFRESH
  STOCK_ADJUST
  FISCAL_SIGN
}

enum MarketplaceChannel {
  APP_SAGAS
  SHOPEE
  MERCADO_LIVRE
  TIKTOK_SHOP
  AMAZON
  MAGALU
}

enum IntegrationCategory {
  MARKETPLACE
  LOGISTICS
  PAYMENT
  OPEN_FINANCE
}

enum IntegrationStatus {
  CONNECTED
  DISCONNECTED
  ERROR_EXPIRED
  RATE_LIMITED
}

enum ProductType {
  SIMPLE
  VARIABLE_PARENT
  FIXED_KIT
  DYNAMIC_COMBO
  MANUFACTURED_BOM
}

enum ComboType {
  FIXED_PRICE        // Ex: 3 peças por R$ 100,00
  BUY_X_PAY_Y        // Ex: Leve 3 Pague 2
  FIXED_BUNDLE       // Ex: Kit Família Pai + Filho
  VARIABLE_CATEGORY  // Ex: Escolha 4 itens Infantil por R$ 120,00
  PROGRESSIVE_TIER   // Ex: 2 peças -10%, 3 peças -20%, 4+ peças -30%
}

enum ListingStatus {
  DRAFT
  QUEUED
  PUBLISHED
  FAILED
  PAUSED
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  INVOICED
  PICKING
  PACKED
  SHIPPED
  DELIVERED
  RETURN_REQUESTED
  RETURNED
  CANCELLED
}

enum DeliveryStatus {
  PENDENTE
  POSTADO
  EM_TRANSITO
  SAIU_ENTREGA
  ENTREGUE
  DEVOLVIDO
  EXTRAVIADO
}

enum InvoiceStatus {
  PENDING
  PROCESSING_SEFAZ
  AUTHORIZED
  CONTINGENCY
  REJECTED
  CANCELLED
}

enum ReturnReason {
  SIZE_MISMATCH
  DEFECT_QUALITY
  WRONG_ITEM_SENT
  REGRET_7_DAYS
  DAMAGED_IN_TRANSIT
}

enum ReturnInspectionStatus {
  AWAITING_POSTAGE
  IN_TRANSIT_REVERSE
  RECEIVED_QA_PENDING
  APPROVED_RESTOCK
  REJECTED_OUTLET_DEFECT
  VOUCHER_ISSUED
}

enum FinancialEntryType {
  ACCOUNTS_PAYABLE
  ACCOUNTS_RECEIVABLE
}

enum FinancialEntryStatus {
  PENDING
  PARTIALLY_PAID
  PAID
  OVERDUE
  RECONCILED
  CANCELLED
}

enum ProductionOrderStatus {
  PLANNED_MRP
  CUTTING
  SEWING
  FINISHING_QA
  COMPLETED
  CANCELLED
}

// -----------------------------------------------------------------------------
// 1. MULTI-TENANCY, SEGURANÇA (RBAC + 2FA) & AUDIT LOG IMUTÁVEL
// -----------------------------------------------------------------------------
model Tenant {
  id                        String   @id @default(uuid())
  name                      String   // Ex: "Sagas Moda Comércio de Confecções Ltda"
  slug                      String   @unique // "sagas-moda"
  cnpj                      String   @unique
  inscricaoEstadual         String?
  regimeTributario          Int      @default(1) // 1: Simples Nacional, 3: Regime Normal
  // [ENCRYPTED AES-256-GCM] Certificado Digital A1 (.pfx em base64 cifrado)
  certificadoA1Encrypted    String?  @db.Text
  // [ENCRYPTED AES-256-GCM] Senha do Certificado A1
  certificadoPassEncrypted  String?  @db.Text
  certificadoExpiresAt      DateTime?
  active                    Boolean  @default(true)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  deletedAt                 DateTime?

  users                     User[]
  products                  Product[]
  orders                    Order[]
  integrations              Integration[]
  warehouses                Warehouse[]

  @@map("tenants")
}

model User {
  id                   String    @id @default(uuid())
  tenantId             String
  tenant               Tenant    @relation(fields: [tenantId], references: [id])
  email                String    @unique
  passwordHash         String    // Argon2id hash
  fullName             String
  role                 RoleType  @default(VENDEDOR)
  permissions          Json      // Granular RBAC: ["orders:read", "orders:print", "finance:dre"]
  totpEnabled          Boolean   @default(false)
  // [ENCRYPTED AES-256-GCM] Segredo TOTP 2FA (Obrigatório para ADMIN e FINANCEIRO)
  totpSecretEncrypted  String?
  lastLoginAt          DateTime?
  lastLoginIp          String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?
  createdById          String?

  auditLogs            AuditLog[]

  @@index([tenantId, role])
  @@map("users")
}

model AuditLog {
  id          String      @id @default(uuid())
  tenantId    String
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  action      AuditAction
  entityName  String      // Ex: "Order", "ProductVariation", "Integration"
  entityId    String
  oldValues   Json?       // Snapshot anterior
  newValues   Json?       // Snapshot novo
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now()) // Append-only (sem updatedAt/deletedAt)

  @@index([tenantId, entityName, entityId])
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("audit_logs")
}

// -----------------------------------------------------------------------------
// 2. CENTRAL DE INTEGRAÇÕES HUB (OAUTH2 & WEBHOOKS)
// -----------------------------------------------------------------------------
model Integration {
  id                      String              @id @default(uuid())
  tenantId                String
  tenant                  Tenant              @relation(fields: [tenantId], references: [id])
  key                     String              // "SHOPEE", "MERCADO_LIVRE", "MELHOR_ENVIO"
  name                    String
  category                IntegrationCategory
  status                  IntegrationStatus   @default(DISCONNECTED)
  // [ENCRYPTED AES-256-GCM] Access Token OAuth2
  accessTokenEncrypted    String?             @db.Text
  // [ENCRYPTED AES-256-GCM] Refresh Token OAuth2
  refreshTokenEncrypted   String?             @db.Text
  // [ENCRYPTED AES-256-GCM] Webhook Signing Secret (HMAC validation)
  webhookSecretEncrypted  String?             @db.Text
  tokenExpiresAt          DateTime?
  externalStoreId         String?
  accountEmail            String?
  defaultMarkupPercent    Decimal             @default(0.00) @db.Decimal(5, 2)
  lastSyncAt              DateTime?
  syncErrorsCount         Int                 @default(0)
  createdAt               DateTime            @default(now())
  updatedAt               DateTime            @updatedAt
  deletedAt               DateTime?
  createdById             String?

  syncLogs                IntegrationSyncLog[]

  @@unique([tenantId, key])
  @@index([tenantId, status, tokenExpiresAt])
  @@map("integrations")
}

model IntegrationSyncLog {
  id             String      @id @default(uuid())
  integrationId  String
  integration    Integration @relation(fields: [integrationId], references: [id], onDelete: Cascade)
  operation      String      // "ORDER_PULL", "STOCK_PUSH", "CATALOG_PUBLISH", "TOKEN_REFRESH"
  status         String      // "SUCCESS", "WARNING", "ERROR"
  httpStatusCode Int?
  durationMs     Int?
  errorMessage   String?     @db.Text
  stackTrace     String?     @db.Text
  payloadSample  Json?
  createdAt      DateTime    @default(now())

  @@index([integrationId, status, createdAt(sort: Desc)])
  @@map("integration_sync_logs")
}

// -----------------------------------------------------------------------------
// 3. CATÁLOGO, ÁRVORE DE CATEGORIAS, GRADE MATRICIAL & ESTOQUE MULTI-DEPÓSITO
// -----------------------------------------------------------------------------
model Category {
  id          String     @id @default(uuid())
  tenantId    String
  name        String
  slug        String
  parentId    String?
  parent      Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryTree")
  products    Product[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?
  createdById String?

  @@unique([tenantId, slug])
  @@map("categories")
}

model Product {
  id                 String               @id @default(uuid())
  tenantId           String
  tenant             Tenant               @relation(fields: [tenantId], references: [id])
  masterSku          String
  title              String
  description        String?              @db.Text
  type               ProductType          @default(VARIABLE_PARENT)
  categoryId         String
  category           Category             @relation(fields: [categoryId], references: [id])
  brand              String               @default("sagas.moda")
  basePrice          Decimal              @db.Decimal(10, 2)
  costPrice          Decimal              @db.Decimal(10, 2)
  weightGrams        Int                  @default(250)
  heightCm           Decimal              @default(5.0) @db.Decimal(5, 2)
  widthCm            Decimal              @default(25.0) @db.Decimal(5, 2)
  depthCm            Decimal              @default(30.0) @db.Decimal(5, 2)
  // Fiscal
  ncm                String               // Ex: "6104.42.00"
  cest               String?              // Ex: "28.038.00"
  origemFiscal       Int                  @default(0) // 0: Nacional
  icmsCst            String               @default("102")
  pisCofinsCst       String               @default("07")
  // Inteligência & BI
  abcCurveClass      String?              // "A", "B", "C" (Calculado via Job BI)
  tags               String[]             // ["NOVO", "PROMO", "COMBO_3_100"]
  sizeChartJson      Json?                // Tabela de medidas (Busto, Cintura, Quadril)
  coverImageUrl      String
  mediaUrls          String[]
  active             Boolean              @default(true)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  deletedAt          DateTime?
  createdById        String?

  variations         ProductVariation[]
  channelListings    ChannelListing[]
  bomComponents      ProductBomItem[]     @relation("ManufacturedProduct")

  @@unique([tenantId, masterSku])
  @@index([tenantId, categoryId, active])
  @@index([tenantId, abcCurveClass])
  @@map("products")
}

model ProductVariation {
  id                  String             @id @default(uuid())
  productId           String
  product             Product            @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku                 String             // Ex: "VEST-FLORAL-BRANCO-M"
  ean13               String?            // GTIN/EAN-13 validado
  color               String
  size                String
  specificPrice       Decimal?           @db.Decimal(10, 2)
  costPrice           Decimal            @db.Decimal(10, 2)
  // Estoques consolidados de leitura rápida
  stockAvailable      Int                @default(0) // Disponível para venda normal
  stockReservedCombo  Int                @default(0) // Bloqueado em carrinhos/combos ativos
  stockReservedPromo  Int                @default(0) // Separado exclusivamente para Flash Sales
  stockExchangeQa     Int                @default(0) // Em quarentena de Logística Reversa
  reorderPoint        Int                @default(15) // Ponto de pedido sugerido pelo Forecasting
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  deletedAt           DateTime?
  createdById         String?

  warehouseBalances   WarehouseBalance[]
  stockMovements      StockMovement[]
  orderItems          OrderItem[]

  @@unique([sku])
  @@index([productId, stockAvailable])
  @@index([ean13])
  @@map("product_variations")
}

model Warehouse {
  id          String             @id @default(uuid())
  tenantId    String
  tenant      Tenant             @relation(fields: [tenantId], references: [id])
  code        String             // "CD-SP-01", "LOJA-MATRIZ", "TROCAS-QA"
  name        String
  isDefault   Boolean            @default(false)
  balances    WarehouseBalance[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  deletedAt   DateTime?

  @@unique([tenantId, code])
  @@map("warehouses")
}

model WarehouseBalance {
  id          String           @id @default(uuid())
  warehouseId String
  warehouse   Warehouse        @relation(fields: [warehouseId], references: [id])
  variationId String
  variation   ProductVariation @relation(fields: [variationId], references: [id])
  quantity    Int              @default(0)
  updatedAt   DateTime         @updatedAt

  @@unique([warehouseId, variationId])
  @@map("warehouse_balances")
}

model StockMovement {
  id              String           @id @default(uuid())
  tenantId        String
  variationId     String
  variation       ProductVariation @relation(fields: [variationId], references: [id])
  warehouseId     String
  type            String           // "SALE", "COMBO_RESERVE", "FLASH_RESERVE", "RETURN_QA", "ADJUSTMENT"
  quantityDelta   Int              // Positivo ou negativo
  previousBalance Int
  newBalance      Int
  referenceOrder  String?
  createdAt       DateTime         @default(now())
  createdById     String?

  @@index([variationId, createdAt(sort: Desc)])
  @@map("stock_movements")
}

// -----------------------------------------------------------------------------
// 4. MOTOR DE COMBOS, FLASH SALES & PUBLICADOR MULTICANAL
// -----------------------------------------------------------------------------
model ComboRule {
  id                   String               @id @default(uuid())
  tenantId             String
  name                 String               // "Combo Família: 3 Peças por R$ 100"
  tagBadge             String               // "3 por R$100"
  type                 ComboType            @default(FIXED_PRICE)
  requiredQuantity     Int                  @default(3)
  paidQuantity         Int?                 // Usado em Leve X Pague Y
  bundleFixedPrice     Decimal?             @db.Decimal(10, 2)
  eligibleCategoryIds  String[]
  channelScope         MarketplaceChannel[] // Quais canais aceitam este combo
  active               Boolean              @default(true)
  priority             Int                  @default(1)
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt
  deletedAt            DateTime?
  createdById          String?

  orders               Order[]

  @@index([tenantId, active])
  @@map("combo_rules")
}

model FlashSale {
  id                   String   @id @default(uuid())
  tenantId             String
  title                String
  startsAt             DateTime // Convertido para Unix Timestamp no endpoint /flash-sales/active
  endsAt               DateTime
  discountPercent      Decimal  @db.Decimal(5, 2)
  reservedStockQuota   Int      // Quota total reservada para a promoção
  soldCount            Int      @default(0)
  active               Boolean  @default(true)
  productIds           String[]
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  deletedAt            DateTime?
  createdById          String?

  @@index([tenantId, active, startsAt, endsAt])
  @@map("flash_sales")
}

model ChannelListing {
  id                  String             @id @default(uuid())
  productId           String
  product             Product            @relation(fields: [productId], references: [id], onDelete: Cascade)
  channel             MarketplaceChannel
  externalListingId   String?            // Ex: "MLB-40192831" ou "SHP-912831"
  externalCategoryId  String?
  markupPercent       Decimal            @db.Decimal(5, 2)
  publishedPrice      Decimal            @db.Decimal(10, 2)
  status              ListingStatus      @default(DRAFT)
  lastErrorReason     String?            @db.Text
  lastSyncAt          DateTime?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  @@unique([productId, channel])
  @@index([channel, status])
  @@map("channel_listings")
}

// -----------------------------------------------------------------------------
// 5. CRM CUSTOMER 360, PEDIDOS OMNICHANNEL, NF-E, ETIQUETAS 10X15 & RASTREIO
// -----------------------------------------------------------------------------
model Customer {
  id                  String              @id @default(uuid())
  tenantId            String
  cpfCnpj             String              // Chave única de unificação Customer 360
  fullName            String
  email               String?
  phoneWhatsapp       String?
  birthDate           DateTime?           @db.Date
  // Métricas CRM & Fidelidade Unificada
  loyaltyPoints       Int                 @default(0)
  storeCreditBalance  Decimal             @default(0.00) @db.Decimal(10, 2) // Vale-Troca ativo
  lifetimeValue       Decimal             @default(0.00) @db.Decimal(12, 2)
  ordersCount         Int                 @default(0)
  lastPurchaseAt      DateTime?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt
  deletedAt           DateTime?

  orders              Order[]
  returnRequests      ReturnRequest[]
  interactions        CustomerInteraction[]

  @@unique([tenantId, cpfCnpj])
  @@index([tenantId, email])
  @@index([tenantId, phoneWhatsapp])
  @@map("customers")
}

model CustomerInteraction {
  id          String   @id @default(uuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  channel     String   // "WHATSAPP", "EMAIL", "SAC_TICKET", "PUSH_APP"
  subject     String
  content     String   @db.Text
  createdAt   DateTime @default(now())
  createdById String?

  @@index([customerId, createdAt(sort: Desc)])
  @@map("customer_interactions")
}

model Order {
  id                  String             @id @default(uuid())
  tenantId            String
  tenant              Tenant             @relation(fields: [tenantId], references: [id])
  orderNumber         String             @unique // Ex: "PED-98241"
  channel             MarketplaceChannel
  externalOrderId     String?            // ID na Shopee / ML / TikTok
  customerId          String
  customer            Customer           @relation(fields: [customerId], references: [id])
  shippingAddressJson Json               // Endereço completo de entrega
  carrierName         String             // "SPX_EXPRESS", "MERCADO_ENVIOS", "CORREIOS_SEDEX"
  status              OrderStatus        @default(PAID)
  deliveryStatus      DeliveryStatus     @default(PENDENTE)
  trackingCode        String?
  // Valores Financeiros
  subtotal            Decimal            @db.Decimal(10, 2)
  discountTotal       Decimal            @default(0.00) @db.Decimal(10, 2)
  shippingFee         Decimal            @default(0.00) @db.Decimal(10, 2)
  marketplaceFee      Decimal            @default(0.00) @db.Decimal(10, 2)
  netRevenue          Decimal            @db.Decimal(10, 2)
  total               Decimal            @db.Decimal(10, 2)
  // Vínculo promocional
  comboRuleId         String?
  comboRule           ComboRule?         @relation(fields: [comboRuleId], references: [id])
  saleType            String             @default("NORMAL") // "NORMAL", "COMBO", "FLASH_SALE"
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  deletedAt           DateTime?
  createdById         String?

  items               OrderItem[]
  invoice             Invoice?
  shippingLabels      ShippingLabel[]
  trackingEvents      TrackingEvent[]
  returnRequests      ReturnRequest[]

  @@index([tenantId, status, createdAt(sort: Desc)])
  @@index([tenantId, channel, createdAt(sort: Desc)])
  @@index([trackingCode])
  @@map("orders")
}

model OrderItem {
  id                  String           @id @default(uuid())
  orderId             String
  order               Order            @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variationId         String
  variation           ProductVariation @relation(fields: [variationId], references: [id])
  sku                 String
  quantity            Int
  unitPriceOriginal   Decimal          @db.Decimal(10, 2)
  unitPriceEffective  Decimal          @db.Decimal(10, 2) // Preço com rateio fiscal proporcional do combo
  discountAllocated   Decimal          @db.Decimal(10, 2)
  totalEffective      Decimal          @db.Decimal(10, 2)

  @@index([orderId])
  @@index([variationId])
  @@map("order_items")
}

model Invoice {
  id                  String        @id @default(uuid())
  orderId             String        @unique
  order               Order         @relation(fields: [orderId], references: [id])
  accessKey44         String        @unique // Chave SEFAZ 44 dígitos
  nfeNumber           Int
  series              Int           @default(1)
  protocolNumber      String?
  status              InvoiceStatus @default(AUTHORIZED)
  xmlContent          String        @db.Text
  danfePdfUrl         String?
  issuedAt            DateTime      @default(now())

  @@index([accessKey44])
  @@map("invoices")
}

model ShippingLabel {
  id                  String    @id @default(uuid())
  orderId             String
  order               Order     @relation(fields: [orderId], references: [id])
  packageNumber       Int       @default(1) // Suporte multi-volume (1/2, 2/2)
  trackingCode        String    @unique
  zplPayload          String    @db.Text    // ZPL 10x15cm Híbrido (Etiqueta + DANFE Simplificado)
  pdfUrl              String?
  printed             Boolean   @default(false)
  printedAt           DateTime?
  printedById         String?
  createdAt           DateTime  @default(now())

  @@index([orderId, printed])
  @@map("shipping_labels")
}

model TrackingEvent {
  id          String         @id @default(uuid())
  orderId     String
  order       Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  packageCode String?
  timestamp   DateTime
  location    String
  description String
  status      DeliveryStatus
  createdAt   DateTime       @default(now())

  @@index([orderId, timestamp(sort: Desc)])
  @@map("tracking_events")
}

// -----------------------------------------------------------------------------
// 6. LOGÍSTICA REVERSA & PORTAL DE TROCAS SELF-SERVICE
// -----------------------------------------------------------------------------
model ReturnRequest {
  id                 String                 @id @default(uuid())
  tenantId           String
  orderId            String
  order              Order                  @relation(fields: [orderId], references: [id])
  customerId         String
  customer           Customer               @relation(fields: [customerId], references: [id])
  reversePostageCode String?                @unique // Código de postagem reversa Correios/Kangu
  reason             ReturnReason
  inspectionStatus   ReturnInspectionStatus @default(AWAITING_POSTAGE)
  qaNotes            String?                @db.Text
  voucherAmount      Decimal                @db.Decimal(10, 2)
  voucherCode        String?                @unique
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
  inspectedById      String?

  @@index([tenantId, inspectionStatus])
  @@map("return_requests")
}

// -----------------------------------------------------------------------------
// 7. FINANCEIRO AVANÇADO, CONCILIAÇÃO OPEN FINANCE & DRE REAL-TIME
// -----------------------------------------------------------------------------
model CostCenter {
  id       String           @id @default(uuid())
  tenantId String
  code     String           // Ex: "CC-MKT-01", "CC-LOG-02"
  name     String
  parentId String?
  entries  FinancialEntry[]

  @@unique([tenantId, code])
  @@map("cost_centers")
}

model FinancialEntry {
  id                 String               @id @default(uuid())
  tenantId           String
  type               FinancialEntryType
  status             FinancialEntryStatus @default(PENDING)
  description        String
  amountGross        Decimal              @db.Decimal(12, 2)
  amountNet          Decimal              @db.Decimal(12, 2)
  dueDate            DateTime             @db.Date
  paidAt             DateTime?
  costCenterId       String
  costCenter         CostCenter           @relation(fields: [costCenterId], references: [id])
  dreCategory        String               // "RECEITA_BRUTA", "IMPOSTOS", "TAXA_MKT", "CMV", "OPEX"
  bankTransactionId  String?              @unique // Match Open Finance / Pluggy
  orderId            String?
  attachmentUrl      String?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  deletedAt          DateTime?
  createdById        String?

  @@index([tenantId, type, status, dueDate])
  @@index([tenantId, dreCategory, dueDate])
  @@map("financial_entries")
}

// -----------------------------------------------------------------------------
// 8. BI ANALYTICS ROLLUP & DEMAND FORECASTING
// -----------------------------------------------------------------------------
model SalesMetricRollup {
  id               String             @id @default(uuid())
  tenantId         String
  date             DateTime           @db.Date
  hour             Int?               // 0-23 para Heatmap de Horários de Pico
  channel          MarketplaceChannel
  grossRevenue     Decimal            @db.Decimal(12, 2)
  netRevenue       Decimal            @db.Decimal(12, 2)
  marketplaceFees  Decimal            @db.Decimal(12, 2)
  ordersCount      Int                @default(0)
  itemsSold        Int                @default(0)
  combosSold       Int                @default(0)
  updatedAt        DateTime           @updatedAt

  @@unique([tenantId, date, hour, channel])
  @@index([tenantId, date(sort: Desc), channel])
  @@map("sales_metrics_rollup")
}

// -----------------------------------------------------------------------------
// 9. PRODUÇÃO & SUPPLY CHAIN (MRP / BOM / ORDENS DE PRODUÇÃO)
// -----------------------------------------------------------------------------
model RawMaterial {
  id            String           @id @default(uuid())
  tenantId      String
  sku           String           // Ex: "TEC-VISCOLYCRA-ROSA"
  name          String
  unit          String           // "METROS", "KG", "UN"
  stockQuantity Decimal          @db.Decimal(10, 3)
  costPerUnit   Decimal          @db.Decimal(10, 2)
  leadTimeDays  Int              @default(7)
  bomUsages     ProductBomItem[]

  @@unique([tenantId, sku])
  @@map("raw_materials")
}

model ProductBomItem {
  id            String      @id @default(uuid())
  productId     String
  product       Product     @relation("ManufacturedProduct", fields: [productId], references: [id])
  rawMaterialId String
  rawMaterial   RawMaterial @relation(fields: [rawMaterialId], references: [id])
  quantityUsed  Decimal     @db.Decimal(10, 3) // Ex: 1.45 metros por vestido

  @@unique([productId, rawMaterialId])
  @@map("product_bom_items")
}

model ProductionOrder {
  id              String                @id @default(uuid())
  tenantId        String
  opNumber        String                @unique // "OP-2026-0089"
  productId       String
  plannedQty      Int
  producedQty     Int                   @default(0)
  status          ProductionOrderStatus @default(PLANNED_MRP)
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  createdById     String?

  @@index([tenantId, status])
  @@map("production_orders")
}`;

  const MONOREPO_TREE = `sagas-erp-enterprise/
├── turbo.json                          # Pipeline de build, cache remoto e tasks paralelas
├── package.json                        # Workspaces: ["apps/*", "packages/*"]
├── docker-compose.yml                  # PostgreSQL 16 (pgcrypto), Redis 7 (BullMQ), MinIO (S3 local)
├── k8s/                                # Manifests Kubernetes (HPA, Deployments, Ingress, Secrets)
│
├── apps/
│   ├── api/                            # BACKEND: NestJS 10 Enterprise Modular (Port 4000)
│   │   ├── src/
│   │   │   ├── main.ts                 # Bootstrap + Swagger OpenAPI + Helmet + RateLimit
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── crypto/             # AES-256-GCM EncryptionService (Tokens OAuth & Cert A1)
│   │   │   │   ├── guards/             # JwtAuthGuard, RbacRolesGuard, TenantIsolationGuard
│   │   │   │   ├── interceptors/       # AuditLogInterceptor (Append-only tracking)
│   │   │   │   └── telemetry/          # OpenTelemetry + Prometheus Metrics + Sentry
│   │   │   └── modules/
│   │   │       ├── auth/               # Login, JWT Refresh, TOTP 2FA
│   │   │       ├── catalog/            # Produtos, Grade Matricial, Importador CSV/Excel (BullMQ)
│   │   │       ├── inventory/          # Multi-depósito, Reserva Atômica de Combos & Flash Sales
│   │   │       ├── combos/             # Motor de Combos Dinâmicos + Simulador de Margem + Rateio NF-e
│   │   │       ├── flash-sales/        # Agendamento Unix Timestamp + Cache Redis /flash-sales/active
│   │   │       ├── integrations/       # OAuth2 Manager + Adapters (Shopee, ML, TikTok, MelhorEnvio)
│   │   │       ├── publisher/          # Publicador One-to-Many com Markup por Canal + Retry Queue
│   │   │       ├── orders/             # Webhook Ingestion + Customer 360 Unification
│   │   │       ├── fiscal-sefaz/       # Assinatura XML (Cert A1) + Autorização SEFAZ NF-e/NFC-e
│   │   │       ├── logistics-labels/   # Gerador Híbrido 10x15cm (ZPL Zebra + PDF DANFE Simplificado)
│   │   │       ├── tracking-hub/       # TrackingSyncWorker (60m polling) + Gatilhos WhatsApp/Push
│   │   │       ├── reverse-logistics/  # Portal de Trocas, Código Reverso, QA e Vale-Troca
│   │   │       ├── finance/            # Contas Pagar/Receber, Conciliação Open Finance, DRE Real-time
│   │   │       ├── crm-loyalty/        # Carteira de Pontos Unificada, Campanhas & Carrinho Abandonado
│   │   │       ├── bi-analytics/       # Queries Rollup, Curva ABC, Forecasting (Média Móvel + Sazonalidade)
│   │   │       └── mrp-production/     # Explosão BOM, Ordens de Produção (Corte -> Costura -> QA)
│   │   └── test/                       # Testes Unitários e E2E (>80% coverage)
│   │
│   ├── web/                            # FRONTEND ADMIN: Next.js 14 App Router (Port 3000)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/       # Login + Desafio 2FA TOTP
│   │   │   │   ├── (erp)/
│   │   │   │   │   ├── dashboard-bi/   # Gráficos Recharts, Heatmap, Curva ABC & Forecasting
│   │   │   │   │   ├── integracoes/    # Hub Estilo Olist (Status OAuth2 & Logs)
│   │   │   │   │   ├── catalogo/       # Cadastro Multi-step + Matriz de Variações
│   │   │   │   │   ├── combos/         # Regras Flexíveis + Simulador Fiscal
│   │   │   │   │   ├── flash-sales/    # Agendamento de Ofertas Relâmpago
│   │   │   │   │   ├── publicador/     # Catálogo Central One-to-Many com Markup
│   │   │   │   │   ├── pedidos/        # Gestão Omnichannel + Customer 360
│   │   │   │   │   ├── expedicao/      # Impressão Térmica 10x15cm + DANFE Simplificado
│   │   │   │   │   ├── rastreamento/   # Tracking Hub + Timeline Vertical
│   │   │   │   │   ├── trocas/         # Logística Reversa + Inspeção QA
│   │   │   │   │   ├── financeiro/     # DRE Gerencial, Fluxo de Caixa e Conciliação
│   │   │   │   │   └── crm/            # Segmentação, Fidelidade e Automações
│   │   │   │   └── trocas-portal/      # Portal Público Self-Service para Clientes
│   │   │   ├── store/                  # Zustand Stores (Filtros Globais, WebSocket Realtime)
│   │   │   └── hooks/                  # React Query / SWR + Socket.io hooks
│   │
│   └── mobile/                         # APP CLIENTE: React Native / Expo (sagas.moda)
│       ├── src/
│       │   ├── screens/
│       │   │   ├── HomeScreen.tsx      # Banner Sazonal + Countdown Flash Sale (Redis Sync)
│       │   │   ├── ComboBuilder.tsx    # Gaveta Interativa "Monte seu Combo 3 por R$ 100"
│       │   │   ├── CheckoutScreen.tsx  # PIX / Cartão + Uso de Vale-Troca / Pontos Fidelidade
│       │   │   └── OrderTracking.tsx   # Timeline de Entrega + Solicitação de Troca Fácil
│       │   └── services/api.ts
│
└── packages/
    ├── database/                       # Prisma Client exportado, migrations e seeders
    │   └── prisma/schema.prisma
    ├── ui/                             # Design System compartilhado (shadcn/ui + Tailwind)
    │   └── src/components/             # Button, Dialog, DataTable, TrackingTimeline, Charts
    ├── types/                          # DTOs compartilhados, Schemas Zod, Contratos de Eventos
    │   └── src/index.ts
    └── config/                         # Configurações padronizadas (eslint, tsconfig, tailwind)`;

  const MERMAID_FLOW = `sequenceDiagram
    autonumber
    actor Cliente as Cliente (App / Shopee / ML / TikTok)
    participant Canal as Canal de Venda / Webhook
    participant API as NestJS ERP API
    participant DB as PostgreSQL (Prisma ACID)
    participant Redis as Redis (BullMQ + Cache)
    participant SEFAZ as SEFAZ (NF-e Cert A1)
    participant Transp as Transportadora / Correios
    participant WS as Socket.io (Realtime BI)

    Cliente->>Canal: Finaliza compra (Ex: Combo 3 por R$100)
    Canal->>API: POST /api/v1/webhooks/orders (Payload Assinado)
    activate API
    API->>DB: Inicia Transação ACID (Serializable/Row Lock)
    DB->>DB: Unifica Cliente por CPF (Customer 360) + Credita Pontos
    DB->>DB: Rateia desconto proporcional nos 3 SKUs (unitPriceEffective)
    DB->>DB: Decrementa stockAvailable / Incrementa stockReservedCombo
    DB->>DB: Registra AuditLog imutável + Gera FinancialEntry (Contas a Receber)
    DB-->>API: Pedido #PED-98241 Persistido
    
    API->>Redis: Enfileira Job "stock-sync-fanout" (Prioridade Máxima < 200ms)
    API->>Redis: Enfileira Job "issue-nfe-sefaz"
    API->>WS: Emite evento "order.created" (Atualiza Dashboard BI e KPIs)
    deactivate API

    par Propagação Multicanal Anti-Overselling
        Redis->>Canal: Adapter atualiza estoque em Shopee, ML e TikTok Shop
    and Faturamento Fiscal Automático
        Redis->>SEFAZ: Assina XML com Certificado A1 (AES-256 decrypted in-memory)
        SEFAZ-->>DB: Retorna Chave 44 dígitos + Protocolo Autorização
        DB->>Redis: Enfileira Job "generate-hybrid-label-10x15"
    end

    Redis->>Transp: Solicita Rastreio (SPX / Mercado Envios / Melhor Envio)
    Transp-->>DB: Grava Código de Rastreio + ZPL Híbrido (Etiqueta + DANFE Simplificado)
    
    loop Worker TrackingSync (A cada 60 min ou via Webhook)
        Redis->>Transp: Consulta status de pedidos "EM_TRANSITO"
        Transp-->>DB: Novo TrackingEvent ("SAIU_ENTREGA" / "ENTREGUE")
        DB->>Cliente: Dispara WhatsApp/Push automático com Link de Rastreio
    end`;

  const ENDPOINTS_LIST = [
    { mod: '1. BI & Analytics', method: 'GET', path: '/api/v1/bi/dashboard-metrics', auth: 'JWT + RBAC (ADMIN, FINANCEIRO)', desc: 'Retorna GMV Bruto vs Líquido, Donut por Canal, Curva ABC e Heatmap de horários (Cache Redis 60s).' },
    { mod: '1. BI & Analytics', method: 'GET', path: '/api/v1/bi/demand-forecast', auth: 'JWT + RBAC (ADMIN, ESTOQUISTA)', desc: 'Executa algoritmo de média móvel ponderada + sazonalidade e sugere reposição por SKU.' },
    { mod: '2. Integrações Hub', method: 'GET', path: '/api/v1/integrations/:channel/oauth/url', auth: 'JWT + RBAC (ADMIN)', desc: 'Gera URL de autorização OAuth2 com state anti-CSRF salvo no Redis e suporte PKCE.' },
    { mod: '2. Integrações Hub', method: 'POST', path: '/api/v1/integrations/:channel/oauth/callback', auth: 'Public (Validado via State CSRF)', desc: 'Troca authorization code por tokens, cifra em AES-256-GCM e ativa o canal.' },
    { mod: '3. Catálogo & Grade', method: 'POST', path: '/api/v1/catalog/products/matrix', auth: 'JWT + RBAC (ADMIN, ESTOQUISTA)', desc: 'Cria produto Pai e gera automaticamente todas as variações (Cores x Tamanhos) com SKUs e EAN-13.' },
    { mod: '3. Catálogo & Grade', method: 'POST', path: '/api/v1/catalog/import-csv', auth: 'JWT + RBAC (ADMIN, ESTOQUISTA)', desc: 'Enfileira job BullMQ para processamento assíncrono de planilha Excel/CSV (até 500 linhas/job).' },
    { mod: '4. Motor de Combos', method: 'POST', path: '/api/v1/combos/simulate-margin', auth: 'JWT + RBAC (ADMIN, FINANCEIRO)', desc: 'Simula lucro líquido pós-desconto e calcula o rateio fiscal proporcional por item para NF-e.' },
    { mod: '4. Motor de Combos', method: 'POST', path: '/api/v1/combos/evaluate-cart', auth: 'Public / App JWT', desc: 'Avalia sacola do cliente em tempo real e aplica regras de Preço Fechado ou Leve X Pague Y.' },
    { mod: '5. Flash Sales', method: 'GET', path: '/api/v1/flash-sales/active', auth: 'Public (Cached in Redis)', desc: 'Retorna ofertas relâmpago ativas com timestamp Unix exato de término e saldo de estoque promocional.' },
    { mod: '6. Publicador', method: 'POST', path: '/api/v1/publisher/publish-batch', auth: 'JWT + RBAC (ADMIN, VENDEDOR)', desc: 'Dispara publicação One-to-Many para Shopee, ML e TikTok aplicando Markup específico de cada canal.' },
    { mod: '7. Pedidos & Webhook', method: 'POST', path: '/api/v1/webhooks/orders/:channel', auth: 'HMAC Webhook Signature', desc: 'Recebe pedidos dos marketplaces, unifica cliente (Customer 360), reserva estoque e dispara fanout.' },
    { mod: '7. Pedidos & CRM', method: 'GET', path: '/api/v1/customers/:cpf/360-view', auth: 'JWT + RBAC (SUPORTE_SAC, ADMIN)', desc: 'Retorna histórico unificado de compras (App, Shopee, ML, TikTok), LTV, pontos e tickets.' },
    { mod: '8. Fiscal & SEFAZ', method: 'POST', path: '/api/v1/fiscal/orders/:id/issue-nfe', auth: 'JWT + RBAC (EXPEDICAO, FINANCEIRO)', desc: 'Assina XML com Certificado A1 do tenant e transmite lote para autorização na SEFAZ.' },
    { mod: '8. Expedição 10x15', method: 'POST', path: '/api/v1/logistics/labels/batch-print', auth: 'JWT + RBAC (EXPEDICAO)', desc: 'Gera stream ZPL ou PDF sequencial 10x15cm com Etiqueta de Envio + DANFE Simplificado embutido.' },
    { mod: '9. Tracking Hub', method: 'GET', path: '/api/v1/tracking/orders/:id/timeline', auth: 'JWT / Public Token', desc: 'Retorna eventos cronológicos de rastreamento de todos os volumes/pacotes do pedido.' },
    { mod: '9. Tracking Hub', method: 'POST', path: '/api/v1/tracking/sync-now', auth: 'JWT + RBAC (EXPEDICAO, SUPORTE_SAC)', desc: 'Força polling imediato nas APIs das transportadoras/marketplaces para pedidos em trânsito.' },
    { mod: '10. Logística Reversa', method: 'POST', path: '/api/v1/returns/request', auth: 'Public Self-Service (Order + CPF)', desc: 'Registra solicitação de troca/devolução e gera código de postagem reversa gratuito.' },
    { mod: '10. Logística Reversa', method: 'PATCH', path: '/api/v1/returns/:id/qa-inspect', auth: 'JWT + RBAC (ESTOQUISTA)', desc: 'Aprova inspeção QA (retorna peça ao estoque normal ou marca como Outlet) e libera Vale-Troca.' },
    { mod: '11. Financeiro & DRE', method: 'GET', path: '/api/v1/finance/dre-realtime', auth: 'JWT + RBAC (FINANCEIRO, ADMIN) + 2FA', desc: 'Calcula DRE Gerencial em tempo real (Receita Bruta - Impostos - Comissões - CMV - OPEX).' },
    { mod: '13. Produção & MRP', method: 'POST', path: '/api/v1/mrp/explode-bom', auth: 'JWT + RBAC (ADMIN, ESTOQUISTA)', desc: 'Cruza previsão de vendas com ficha técnica (BOM) e sugere compra de tecidos/aviamentos.' },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold text-amber-300 tracking-wider uppercase">
              Blueprint Arquitetural CTO — Iteração 1 (Fundação Enterprise)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Arquitetura Escalável (10 a 10.000 Pedidos/Dia)
          </h2>
          <p className="text-stone-300 text-sm mt-1 max-w-3xl">
            Fundação técnica completa para <strong>sagas.moda</strong>: Schema Prisma Enterprise (Multi-tenant, RBAC, Audit Log, BI, Finanças, Logística Reversa e MRP), estrutura Monorepo Turborepo, fluxo Mermaid.js e catálogo OpenAPI.
          </p>
        </div>
      </div>

      {/* Tabs da Documentação */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: 'schema', label: '1. Schema Prisma Enterprise', icon: Database },
          { id: 'monorepo', label: '2. Estrutura Monorepo (Turborepo)', icon: FolderTree },
          { id: 'flow', label: '3. Diagrama de Arquitetura (Mermaid)', icon: Radio },
          { id: 'endpoints', label: '4. Top 20 Endpoints Críticos (OpenAPI)', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeDocTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveDocTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCHEMA PRISMA */}
      {activeDocTab === 'schema' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-rose-400" />
              <span className="font-mono text-xs font-bold">packages/database/prisma/schema.prisma</span>
            </div>
            <button
              onClick={() => handleCopy('schema', PRISMA_SCHEMA)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 transition-colors cursor-pointer"
            >
              {copiedKey === 'schema' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Schema Prisma</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed max-h-[640px]">
            {PRISMA_SCHEMA}
          </pre>
        </div>
      )}

      {/* TAB 2: MONOREPO */}
      {activeDocTab === 'monorepo' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs font-bold">Estrutura de Pastas Monorepo (Turborepo / Nx)</span>
            </div>
            <button
              onClick={() => handleCopy('monorepo', MONOREPO_TREE)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 transition-colors cursor-pointer"
            >
              {copiedKey === 'monorepo' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Árvore</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed">
            {MONOREPO_TREE}
          </pre>
        </div>
      )}

      {/* TAB 3: MERMAID FLOW */}
      {activeDocTab === 'flow' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="font-mono text-xs font-bold">Diagrama de Sequência End-to-End (Mermaid.js)</span>
            </div>
            <button
              onClick={() => handleCopy('mermaid', MERMAID_FLOW)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 transition-colors cursor-pointer"
            >
              {copiedKey === 'mermaid' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mermaid</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-5 bg-stone-950 text-stone-200 font-mono text-xs overflow-x-auto leading-relaxed">
            {MERMAID_FLOW}
          </pre>
        </div>
      )}

      {/* TAB 4: 20 ENDPOINTS */}
      {activeDocTab === 'endpoints' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">
              20 Endpoints Críticos da API Enterprise (OpenAPI 3.1 Summary)
            </h3>
            <span className="text-xs font-mono text-stone-500">Base URL: /api/v1</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4 font-bold">#</th>
                  <th className="py-3 px-4 font-bold">Módulo</th>
                  <th className="py-3 px-4 font-bold">Método & Path</th>
                  <th className="py-3 px-4 font-bold">Autenticação & Guard</th>
                  <th className="py-3 px-4 font-bold">Descrição Funcional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ENDPOINTS_LIST.map((ep, idx) => (
                  <tr key={ep.path} className="hover:bg-stone-50/80">
                    <td className="py-3 px-4 font-mono text-stone-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-stone-800 whitespace-nowrap">{ep.mod}</td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mr-2 ${
                          ep.method === 'GET'
                            ? 'bg-blue-100 text-blue-800'
                            : ep.method === 'POST'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-stone-900 font-bold">{ep.path}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[11px]">
                        {ep.auth}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">{ep.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
