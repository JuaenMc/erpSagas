import { MarketplaceChannel } from '../types';

export interface ChannelFeeConfigModel {
  id: string;
  channel: MarketplaceChannel;
  channelLabel: string;
  commissionPct: number;       // Ex: 20.00 (Shopee c/ Frete Grátis)
  fixedFeePerItem: number;     // Ex: 6.00 (ML p/ vendas < R$79)
  fixedFeeThreshold: number | null; // Ex: 79.00 (ML)
  paymentFeePct: number;       // Ex: 2.50 (Gateway no App Próprio)
  shippingCostEstimate: number;// Frete médio pago pelo lojista
  packagingCost: number;       // Ex: 1.50 (Saco segurança + etiqueta 10x15)
  taxPct: number;              // Ex: 5.00 (Simples Nacional Anexo I)
  targetMarginPct: number;     // Ex: 35.00 (Margem Líquida Alvo)
  isActive: boolean;
  updatedAt: string;
  notes?: string;
}

export interface ChannelProfitBreakdown {
  channel: MarketplaceChannel;
  channelLabel: string;
  sellingPrice: number;
  cmv: number;
  commissionPct: number;
  commissionAmount: number;
  paymentFeePct: number;
  paymentFeeAmount: number;
  fixedFeeApplied: number;
  taxPct: number;
  taxAmount: number;
  shippingCostEstimate: number;
  packagingCost: number;
  totalDeductions: number;
  netProfit: number;
  marginPct: number;
  targetMarginPct: number;
  breakEvenPrice: number;
  suggestedPrice: number;
  derivedMarkupPct: number;
  semaphore: 'GREEN' | 'YELLOW' | 'RED';
  isBelowBreakEven: boolean;
}

export const DEFAULT_CHANNEL_FEE_CONFIGS: ChannelFeeConfigModel[] = [
  {
    id: 'fee-app-sagas',
    channel: 'APP_SAGAS',
    channelLabel: 'App Próprio sagas.moda',
    commissionPct: 0.0,
    fixedFeePerItem: 0.0,
    fixedFeeThreshold: null,
    paymentFeePct: 1.99, // Média ponderada PIX (0.99%) + Cartão (3.49%)
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    taxPct: 5.0,
    targetMarginPct: 35.0,
    isActive: true,
    updatedAt: '2026-10-25T10:00:00Z',
    notes: 'Canal próprio sem comissão; gateway Pagar.me/Asaas.',
  },
  {
    id: 'fee-shopee',
    channel: 'SHOPEE',
    channelLabel: 'Shopee Brasil (Prog. Frete Grátis)',
    commissionPct: 20.0, // 14% padrão + 6% programa frete grátis
    fixedFeePerItem: 4.0, // Taxa fixa R$ 4,00 por item vendido
    fixedFeeThreshold: null,
    paymentFeePct: 0.0, // Embutido na comissão Shopee
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    taxPct: 5.0,
    targetMarginPct: 30.0,
    isActive: true,
    updatedAt: '2026-10-25T10:00:00Z',
    notes: 'Política Shopee 2026: 14% comissão + 6% Frete Grátis Extra + R$ 4,00 fixo/item.',
  },
  {
    id: 'fee-mercado-livre',
    channel: 'MERCADO_LIVRE',
    channelLabel: 'Mercado Livre (Anúncio Premium)',
    commissionPct: 17.0,
    fixedFeePerItem: 6.0,
    fixedFeeThreshold: 79.0, // Taxa fixa R$ 6,00 apenas para itens abaixo de R$ 79,00
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0, // Acima de R$79 pode haver co-participação se aplicável
    packagingCost: 1.5,
    taxPct: 5.0,
    targetMarginPct: 30.0,
    isActive: true,
    updatedAt: '2026-10-25T10:00:00Z',
    notes: 'Taxa fixa de R$ 6,00 isenta para preço de venda >= R$ 79,00.',
  },
  {
    id: 'fee-tiktok-shop',
    channel: 'TIKTOK_SHOP',
    channelLabel: 'TikTok Shop Partner',
    commissionPct: 8.0, // 6% comissão + 2% transação
    fixedFeePerItem: 2.0,
    fixedFeeThreshold: null,
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    taxPct: 5.0,
    targetMarginPct: 35.0,
    isActive: true,
    updatedAt: '2026-10-25T10:00:00Z',
    notes: 'Incentivo Live Commerce Moda 2026.',
  },
];

/**
 * Calcula o preço sugerido para atingir uma margem líquida alvo (`targetMarginPct`),
 * respeitando a regra de isenção de taxa fixa acima de `fixedFeeThreshold` (ex: R$ 79 no ML).
 *
 * Fórmula:
 * Preço Sugerido = (CMV + Taxas Fixas + Frete + Embalagem) / (1 - %Comissão - %Gateway - %Imposto - %MargemAlvo)
 */
export function suggestPriceForMargin(
  cmv: number,
  feeConfig: ChannelFeeConfigModel,
  customTargetMarginPct?: number
): { suggestedPrice: number; breakEvenPrice: number; fixedFeeIncluded: number } {
  const targetMargin =
    (customTargetMarginPct !== undefined ? customTargetMarginPct : feeConfig.targetMarginPct) / 100;
  const variableRate =
    (feeConfig.commissionPct + feeConfig.paymentFeePct + feeConfig.taxPct) / 100;

  const denominatorMargin = Math.max(0.05, 1 - variableRate - targetMargin);
  const denominatorBreakEven = Math.max(0.05, 1 - variableRate);

  const baseFixedCostsNoItemFee =
    cmv + feeConfig.shippingCostEstimate + feeConfig.packagingCost;

  // 1. Tentativa com a taxa fixa incluída
  const fixedWithItemFee = baseFixedCostsNoItemFee + feeConfig.fixedFeePerItem;
  let candidatePrice = fixedWithItemFee / denominatorMargin;
  let fixedFeeIncluded = feeConfig.fixedFeePerItem;

  // Se o canal isenta a taxa fixa acima do threshold (ex: ML >= R$ 79,00)
  if (
    feeConfig.fixedFeeThreshold !== null &&
    candidatePrice >= feeConfig.fixedFeeThreshold
  ) {
    const candidateWithoutFixedFee = baseFixedCostsNoItemFee / denominatorMargin;
    if (candidateWithoutFixedFee >= feeConfig.fixedFeeThreshold) {
      candidatePrice = candidateWithoutFixedFee;
      fixedFeeIncluded = 0;
    }
  }

  // Cálculo do Break-Even (Margem = 0%)
  let breakEvenPrice = fixedWithItemFee / denominatorBreakEven;
  if (
    feeConfig.fixedFeeThreshold !== null &&
    breakEvenPrice >= feeConfig.fixedFeeThreshold
  ) {
    const breakEvenNoFixed = baseFixedCostsNoItemFee / denominatorBreakEven;
    if (breakEvenNoFixed >= feeConfig.fixedFeeThreshold) {
      breakEvenPrice = breakEvenNoFixed;
    }
  }

  return {
    suggestedPrice: Math.round(candidatePrice * 100) / 100,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    fixedFeeIncluded,
  };
}

/**
 * Simula o lucro líquido e margem percentual exatos para um produto em um canal específico.
 */
export function simulateChannelProfit(
  cmv: number,
  sellingPrice: number,
  feeConfig: ChannelFeeConfigModel,
  customTargetMarginPct?: number
): ChannelProfitBreakdown {
  const price = Math.max(0.01, sellingPrice);
  const commissionAmount = Math.round(price * (feeConfig.commissionPct / 100) * 100) / 100;
  const paymentFeeAmount = Math.round(price * (feeConfig.paymentFeePct / 100) * 100) / 100;
  const taxAmount = Math.round(price * (feeConfig.taxPct / 100) * 100) / 100;

  // Verifica se aplica a taxa fixa por item (ex: só se price < 79.00 no ML)
  const appliesFixedFee =
    feeConfig.fixedFeeThreshold === null || price < feeConfig.fixedFeeThreshold;
  const fixedFeeApplied = appliesFixedFee ? feeConfig.fixedFeePerItem : 0;

  const totalDeductions =
    commissionAmount +
    paymentFeeAmount +
    fixedFeeApplied +
    taxAmount +
    feeConfig.shippingCostEstimate +
    feeConfig.packagingCost +
    cmv;

  const netProfit = Math.round((price - totalDeductions) * 100) / 100;
  const marginPct = Math.round((netProfit / price) * 1000) / 10;

  const { suggestedPrice, breakEvenPrice } = suggestPriceForMargin(
    cmv,
    feeConfig,
    customTargetMarginPct
  );

  // Semáforo de Margem: Verde (> 30%), Amarelo (15% a 30%), Vermelho (< 15%)
  let semaphore: 'GREEN' | 'YELLOW' | 'RED' = 'RED';
  if (marginPct >= 30) {
    semaphore = 'GREEN';
  } else if (marginPct >= 15) {
    semaphore = 'YELLOW';
  }

  const derivedMarkupPct =
    cmv > 0 ? Math.round(((suggestedPrice - cmv) / cmv) * 1000) / 10 : 0;

  return {
    channel: feeConfig.channel,
    channelLabel: feeConfig.channelLabel,
    sellingPrice: price,
    cmv,
    commissionPct: feeConfig.commissionPct,
    commissionAmount,
    paymentFeePct: feeConfig.paymentFeePct,
    paymentFeeAmount,
    fixedFeeApplied,
    taxPct: feeConfig.taxPct,
    taxAmount,
    shippingCostEstimate: feeConfig.shippingCostEstimate,
    packagingCost: feeConfig.packagingCost,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netProfit,
    marginPct,
    targetMarginPct: customTargetMarginPct ?? feeConfig.targetMarginPct,
    breakEvenPrice,
    suggestedPrice,
    derivedMarkupPct,
    semaphore,
    isBelowBreakEven: netProfit < 0,
  };
}
