export type MarketplaceChannel = 'APP_SAGAS' | 'SHOPEE' | 'MERCADO_LIVRE' | 'TIKTOK_SHOP';

export type ComboType = 
  | 'FIXED_PRICE'       // Ex: 3 peças por R$ 100
  | 'BUY_X_PAY_Y'       // Ex: Leve 3 Pague 2
  | 'FIXED_BUNDLE'      // Ex: Produto A + Produto B = Preço X
  | 'VARIABLE_CATEGORY';// Ex: Escolha 4 itens da categoria Infantil por R$ Y

export type IntegrationCategory = 'MARKETPLACE' | 'LOGISTICS' | 'PAYMENT';
export type IntegrationStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR_EXPIRED';

export interface IntegrationItem {
  id: string;
  key: string;
  name: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  badgeTag: string;
  description: string;
  lastSync?: string;
  tokenExpiresAt?: string;
  defaultMarkupPercent: number;
  totalSyncedOrders: number;
  syncErrorsCount: number;
  authUrl?: string;
  accountEmail?: string;
}

export interface SalesMetricDay {
  date: string;
  dayLabel: string;
  grossRevenue: number;
  netRevenue: number;
  appSales: number;
  shopeeSales: number;
  mlSales: number;
  tiktokSales: number;
  ordersCount: number;
  platformFees: number;
}

export interface MarketplaceCommissionSummary {
  channel: MarketplaceChannel;
  name: string;
  color: string;
  grossSales: number;
  feeRatePercent: number;
  platformFeeTotal: number;
  netProfit: number;
  ordersCount: number;
}

export interface FiscalData {
  ncm: string;          // Ex: "6104.42.00"
  cest?: string;        // Ex: "28.038.00"
  origem: number;       // 0: Nacional
  icmsCst: string;      // Ex: "102"
}

export interface ProductVariation {
  id: string;
  size: string;         // P, M, G, GG, 2, 4, 6, etc.
  color: string;
  sku: string;
  barcodeEan13: string;
  stockReal: number;
  stockReserved: number;
  price: number;
  costPrice?: number;
}

export interface ChannelListing {
  id: string;
  channel: MarketplaceChannel;
  externalId?: string;
  channelCategory?: string;
  markupPercent: number;      // Ex: +10% para cobrir taxa Shopee
  channelPrice: number;       // Preço base + markup
  status: 'PUBLISHED' | 'PENDING' | 'ERROR' | 'DRAFT';
  lastSync?: string;
  errorMessage?: string;
}

export interface Product {
  id: string;
  title: string;
  masterSku: string;
  description: string;
  brand: string;
  basePrice: number;
  costPrice: number;
  categoryId: 'infantil' | 'feminino' | 'masculino';
  categoryLabel: string;
  imageUrl: string;
  secondaryImages: string[];
  weightGrams: number;
  dimensionsCm: { height: number; width: number; depth: number };
  fiscal: FiscalData;
  tags: string[];
  collectionId?: string;
  variations: ProductVariation[];
  channelListings: Record<MarketplaceChannel, ChannelListing>;
  createdAt: string;
}

export interface ComboRuleModel {
  id: string;
  name: string;
  tag: string;
  type: ComboType;
  requiredQuantity: number;
  paidQuantity?: number;
  bundlePrice: number;
  discountPercent?: number;
  eligibleCategoryIds: string[];
  fixedProductIds?: string[];
  channelScope: 'APP_ONLY' | 'ALL_CHANNELS';
  active: boolean;
  priority: number;
  description: string;
  totalOrdersGenerated: number;
  marginEstimatedPercent?: number;
}

export interface FlashSaleModel {
  id: string;
  name: string;
  productIds: string[];
  startIso: string;
  endIso: string;
  discountPercentage: number;
  maxReservedStock: number;
  soldCount: number;
  active: boolean;
  bannerTitle?: string;
}

export interface CollectionModel {
  id: string;
  name: string;
  season: string;
  year: number;
  bannerUrl: string;
  description: string;
  active: boolean;
  productCount: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  originalUnitPrice: number;
  finalUnitPrice: number;
  discountAllocated: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  chaveAcesso: string;       // 44 dígitos da NF-e / NFC-e
  numeroNfe: number;
  serie: number;
  protocoloAutorizacao: string;
  dataEmissao: string;
  statusSefaz: 'AUTORIZADA' | 'CONTINGENCIA' | 'PROCESSANDO' | 'REJEITADA';
  digestValue?: string;
  urlConsultaSefaz: string;
}

export type DeliveryStatus =
  | 'PENDENTE'
  | 'POSTADO'
  | 'EM_TRANSITO'
  | 'SAIU_ENTREGA'
  | 'ENTREGUE'
  | 'DEVOLVIDO'
  | 'EXTRAVIADO';

export interface TrackingEvent {
  id: string;
  orderId: string;
  packageId?: string;
  timestamp: string;
  location: string;
  description: string;
  status: DeliveryStatus;
}

export interface PackageInfo {
  packageId: string;
  packageLabel: string;
  trackingCode: string;
  carrier: string;
  service: string;
  weightKg: number;
  itemsCount: number;
  currentStatus: DeliveryStatus;
  events: TrackingEvent[];
}

export interface Order {
  id: string;
  orderNumber: string;
  channel: MarketplaceChannel;
  channelOrderId: string;
  customerName: string;
  customerDoc: string;
  customerPhone?: string;
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  carrierService: 'SPX_EXPRESS' | 'MERCADO_ENVIOS' | 'CORREIOS_SEDEX' | 'MELHOR_ENVIO';
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  comboApplied?: string;
  saleType: 'NORMAL' | 'COMBO' | 'FLASH_SALE';
  status: 'PENDING_PAYMENT' | 'PROCESSING' | 'LABEL_GENERATED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  trackingNumber: string;
  trackingCode?: string; // Código oficial rastreio
  deliveryStatus: DeliveryStatus;
  labelPrinted: boolean;
  printedAt?: string;
  zplPayload?: string;
  invoice?: Invoice;
  packages?: PackageInfo[];
  trackingEvents?: TrackingEvent[];
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  channel: MarketplaceChannel;
  action: 'PRODUCT_PUBLISH' | 'STOCK_SYNC' | 'ORDER_PULL' | 'LABEL_GENERATE';
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  sku?: string;
  message: string;
  details?: Record<string, any>;
}
