import {
  Product,
  ComboRuleModel,
  FlashSaleModel,
  CollectionModel,
  Order,
  IntegrationLog,
  IntegrationItem,
  SalesMetricDay,
  MarketplaceCommissionSummary,
} from '../types';

export const INITIAL_INTEGRATIONS: IntegrationItem[] = [];
export const INITIAL_COMMISSION_SUMMARY: MarketplaceCommissionSummary[] = [];
export const INITIAL_SALES_METRICS_30D: SalesMetricDay[] = [];
export const INITIAL_COLLECTIONS: CollectionModel[] = [];
export const INITIAL_COMBOS: ComboRuleModel[] = [];
export const INITIAL_FLASH_SALES: FlashSaleModel[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_LOGS: IntegrationLog[] = [];
