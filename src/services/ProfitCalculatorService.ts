import { MarketplaceChannel, Product, ProductVariation } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockData';
import {
  ChannelFeeConfigModel,
  ChannelProfitBreakdown,
  DEFAULT_CHANNEL_FEE_CONFIGS,
  simulateChannelProfit,
  suggestPriceForMargin as calculateSuggestedPrice,
} from '../logic/profit-calculator';

/**
 * Constantes base para as taxas padrão dos principais Marketplaces Brasileiros (Moda & Vestuário).
 * Reflete as políticas comerciais vigentes (Shopee Frete Grátis Extra, Mercado Livre limiar R$ 79,
 * TikTok Shop Live Commerce, App Próprio com Gateway PIX/Cartão, Shein, Amazon e Magalu).
 */
export interface BrazilianMarketplaceFeeConstant {
  id: string;
  channelKey: MarketplaceChannel | 'MERCADO_LIVRE_CLASSICO' | 'SHEIN' | 'AMAZON_BR' | 'MAGALU';
  name: string;
  commissionPct: number;        // % Comissão sobre o preço de venda bruto
  fixedFeePerItem: number;      // Taxa fixa em R$ cobrada por unidade vendida
  fixedFeeThreshold: number | null; // Valor mínimo (R$) a partir do qual a taxa fixa é isenta (ex: R$ 79 no ML)
  paymentFeePct: number;        // % Taxa de gateway/antecipação (quando não embutida na comissão)
  shippingCostEstimate: number; // Custo médio de frete/co-participação pago pelo lojista (R$)
  packagingCost: number;        // Custo de embalagem + etiqueta térmica 10x15cm (R$)
  defaultTaxPct: number;        // Alíquota média Simples Nacional Anexo I Comércio (%)
  recommendedMarginPct: number; // Meta de margem líquida recomendada para Moda (%)
  notes: string;
}

export const BRAZILIAN_MARKETPLACE_FEES: Record<string, BrazilianMarketplaceFeeConstant> = {
  APP_SAGAS: {
    id: 'fee-app-sagas',
    channelKey: 'APP_SAGAS',
    name: 'App Próprio sagas.moda',
    commissionPct: 0.0,
    fixedFeePerItem: 0.0,
    fixedFeeThreshold: null,
    paymentFeePct: 1.99, // Média ponderada PIX (0.99%) + Cartão de Crédito (3.49%)
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 35.0,
    notes: 'Canal D2C próprio sem comissão de plataforma; apenas gateway de pagamento e embalagem.',
  },
  SHOPEE: {
    id: 'fee-shopee',
    channelKey: 'SHOPEE',
    name: 'Shopee Brasil (Programa Frete Grátis Extra)',
    commissionPct: 20.0, // 14% comissão padrão + 6% Programa Frete Grátis
    fixedFeePerItem: 4.0, // R$ 4,00 fixo por item vendido
    fixedFeeThreshold: null,
    paymentFeePct: 0.0, // Taxa de transação já contemplada na alíquota de 20%
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 30.0,
    notes: 'Comissão de 20% + R$ 4,00 de taxa fixa por peça vendida.',
  },
  MERCADO_LIVRE: {
    id: 'fee-mercado-livre',
    channelKey: 'MERCADO_LIVRE',
    name: 'Mercado Livre (Anúncio Premium)',
    commissionPct: 17.0, // 17% em Moda & Calçados no Premium (até 12x sem juros)
    fixedFeePerItem: 6.0, // R$ 6,00 por unidade para produtos abaixo de R$ 79,00
    fixedFeeThreshold: 79.0, // Isento de taxa fixa de R$ 6,00 quando preço >= R$ 79,00
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 30.0,
    notes: 'Taxa fixa de R$ 6,00 aplicada somente quando o preço de venda é inferior a R$ 79,00.',
  },
  MERCADO_LIVRE_CLASSICO: {
    id: 'fee-mercado-livre-classico',
    channelKey: 'MERCADO_LIVRE_CLASSICO',
    name: 'Mercado Livre (Anúncio Clássico)',
    commissionPct: 12.0, // 12% em Moda & Calçados no Clássico
    fixedFeePerItem: 6.0,
    fixedFeeThreshold: 79.0,
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 30.0,
    notes: 'Anúncio Clássico (12% comissão) + R$ 6,00 para itens abaixo de R$ 79,00.',
  },
  TIKTOK_SHOP: {
    id: 'fee-tiktok-shop',
    channelKey: 'TIKTOK_SHOP',
    name: 'TikTok Shop Partner Brasil',
    commissionPct: 8.0, // 6% comissão + 2% taxa de processamento
    fixedFeePerItem: 2.0, // R$ 2,00 fixo por item
    fixedFeeThreshold: null,
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 35.0,
    notes: 'Condição comercial para Live Commerce e vídeos curtos de Moda.',
  },
  SHEIN: {
    id: 'fee-shein',
    channelKey: 'SHEIN',
    name: 'Shein Marketplace Brasil',
    commissionPct: 16.0,
    fixedFeePerItem: 0.0,
    fixedFeeThreshold: null,
    paymentFeePct: 0.0,
    shippingCostEstimate: 4.5, // Co-participação média no frete
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 28.0,
    notes: 'Comissão de 16% para vestuário com co-participação média no envio.',
  },
  AMAZON_BR: {
    id: 'fee-amazon-br',
    channelKey: 'AMAZON_BR',
    name: 'Amazon Brasil (Roupas e Acessórios)',
    commissionPct: 15.0,
    fixedFeePerItem: 0.0,
    fixedFeeThreshold: null,
    paymentFeePct: 0.0,
    shippingCostEstimate: 5.9, // DBA / FBA estimado p/ pacote leve
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 28.0,
    notes: 'Comissão de 15% na categoria Moda com envio DBA.',
  },
  MAGALU: {
    id: 'fee-magalu',
    channelKey: 'MAGALU',
    name: 'Magalu Marketplace (Moda)',
    commissionPct: 18.0,
    fixedFeePerItem: 5.0,
    fixedFeeThreshold: 79.0,
    paymentFeePct: 0.0,
    shippingCostEstimate: 0.0,
    packagingCost: 1.5,
    defaultTaxPct: 5.0,
    recommendedMarginPct: 28.0,
    notes: 'Comissão de 18% + R$ 5,00 fixo em pedidos abaixo de R$ 79,00.',
  },
};

export interface ProfitSimulationResult extends ChannelProfitBreakdown {
  productId: string;
  productTitle: string;
  variationSku?: string;
  channelId: string;
}

export interface SuggestPriceResult {
  productId: string;
  productTitle: string;
  variationSku?: string;
  channelId: string;
  channelLabel: string;
  cmv: number;
  targetMarginPct: number;
  suggestedPrice: number;
  breakEvenPrice: number;
  fixedFeeIncluded: number;
  estimatedNetProfit: number;
  estimatedMarginPct: number;
  derivedMarkupPct: number;
}

export interface SimulationOptions {
  /** Sobrescreve o preço de venda cadastrado no produto/canal */
  customSellingPrice?: number;
  /** Sobrescreve o CMV (custo de aquisição/produção) cadastrado no produto */
  customCostPrice?: number;
  /** Seleciona uma variação específica (ID da variação ou código SKU) */
  variationIdOrSku?: string;
  /** Sobrescreve a meta de margem líquida (%) do canal */
  customTargetMarginPct?: number;
}

/**
 * Serviço de Cálculo e Simulação de Lucro por Canal (Margin-Aware Pricing).
 * No backend real (NestJS), este serviço injeta o PrismaService para buscar `Product`,
 * `ProductVariation`, `ProductChannelPricing` e `ChannelFeeConfig`.
 * No MVP Frontend, mantém sincronia em memória com o catálogo de produtos e taxas configuradas.
 */
export class ProfitCalculatorService {
  private products: Product[];
  private feeConfigs: ChannelFeeConfigModel[];

  constructor(
    initialProducts: Product[] = INITIAL_PRODUCTS,
    initialFeeConfigs: ChannelFeeConfigModel[] = DEFAULT_CHANNEL_FEE_CONFIGS
  ) {
    this.products = [...initialProducts];
    this.feeConfigs = [...initialFeeConfigs];
  }

  /**
   * Atualiza a lista de produtos em memória (ex: quando o usuário edita um produto na sessão).
   */
  public syncProducts(products: Product[]): void {
    this.products = [...products];
  }

  /**
   * Atualiza as configurações de taxas de canal em memória (ex: tela /config/taxas-canais).
   */
  public syncFeeConfigs(feeConfigs: ChannelFeeConfigModel[]): void {
    this.feeConfigs = [...feeConfigs];
  }

  /**
   * Retorna todas as configurações de taxas dos canais ativos.
   */
  public getFeeConfigs(): ChannelFeeConfigModel[] {
    return this.feeConfigs;
  }

  /**
   * Localiza a configuração de taxas de um canal pelo `channelId` (ex: 'SHOPEE', 'fee-shopee', 'MERCADO_LIVRE').
   * Caso seja um canal extra das constantes brasileiras (ex: 'SHEIN', 'AMAZON_BR', 'MAGALU'), converte para o modelo.
   */
  public resolveChannelFeeConfig(channelId: string): ChannelFeeConfigModel {
    const normalized = channelId.trim().toUpperCase();

    const existing = this.feeConfigs.find(
      (cfg) =>
        cfg.id.toLowerCase() === channelId.trim().toLowerCase() ||
        cfg.channel.toUpperCase() === normalized
    );
    if (existing) {
      return existing;
    }

    const constantEntry =
      BRAZILIAN_MARKETPLACE_FEES[normalized] ||
      Object.values(BRAZILIAN_MARKETPLACE_FEES).find(
        (item) => item.id.toLowerCase() === channelId.trim().toLowerCase()
      );

    if (constantEntry) {
      return {
        id: constantEntry.id,
        channel: (constantEntry.channelKey === 'APP_SAGAS' ||
        constantEntry.channelKey === 'SHOPEE' ||
        constantEntry.channelKey === 'MERCADO_LIVRE' ||
        constantEntry.channelKey === 'TIKTOK_SHOP'
          ? constantEntry.channelKey
          : 'SHOPEE') as MarketplaceChannel,
        channelLabel: constantEntry.name,
        commissionPct: constantEntry.commissionPct,
        fixedFeePerItem: constantEntry.fixedFeePerItem,
        fixedFeeThreshold: constantEntry.fixedFeeThreshold,
        paymentFeePct: constantEntry.paymentFeePct,
        shippingCostEstimate: constantEntry.shippingCostEstimate,
        packagingCost: constantEntry.packagingCost,
        taxPct: constantEntry.defaultTaxPct,
        targetMarginPct: constantEntry.recommendedMarginPct,
        isActive: true,
        updatedAt: new Date().toISOString(),
        notes: constantEntry.notes,
      };
    }

    // Fallback seguro para Shopee caso um ID desconhecido seja informado
    return this.feeConfigs[0] || DEFAULT_CHANNEL_FEE_CONFIGS[0];
  }

  /**
   * Localiza um produto (e opcionalmente sua variação) pelo `productId`, `masterSku` ou `variation.sku`.
   */
  public resolveProductAndVariation(
    productId: string,
    variationIdOrSku?: string
  ): { product: Product; variation?: ProductVariation } {
    const query = productId.trim().toLowerCase();

    let product = this.products.find(
      (p) =>
        p.id.toLowerCase() === query ||
        p.masterSku.toLowerCase() === query ||
        p.variations.some(
          (v) => v.id.toLowerCase() === query || v.sku.toLowerCase() === query
        )
    );

    if (!product) {
      // Fallback para o primeiro produto do catálogo caso seja chamado com ID de teste genérico
      product = this.products[0];
    }

    let variation: ProductVariation | undefined;
    if (variationIdOrSku && variationIdOrSku !== 'BASE') {
      const varQuery = variationIdOrSku.trim().toLowerCase();
      variation = product.variations.find(
        (v) => v.id.toLowerCase() === varQuery || v.sku.toLowerCase() === varQuery
      );
    } else {
      // Se o próprio productId passado era um SKU/ID de variação, seleciona-a automaticamente
      variation = product.variations.find(
        (v) => v.id.toLowerCase() === query || v.sku.toLowerCase() === query
      );
    }

    return { product, variation };
  }

  /**
   * Calcula o breakdown completo de custos, taxas, ponto de equilíbrio (break-even),
   * lucro líquido em R$ e margem líquida (%) para um produto em um canal específico.
   *
   * @param productId ID do produto (ou SKU)
   * @param channelId Identificador do canal ('APP_SAGAS', 'SHOPEE', 'MERCADO_LIVRE', 'TIKTOK_SHOP', etc.)
   * @param options Opções para sobrescrever preço, custo (CMV) ou variação específica
   */
  public simulate(
    productId: string,
    channelId: string,
    options?: SimulationOptions
  ): ProfitSimulationResult {
    const { product, variation } = this.resolveProductAndVariation(
      productId,
      options?.variationIdOrSku
    );
    const feeConfig = this.resolveChannelFeeConfig(channelId);

    // Determina o CMV (prioridade: override > custo da variação > custo base do produto)
    const cmv =
      options?.customCostPrice !== undefined
        ? options.customCostPrice
        : variation?.costPrice !== undefined
        ? variation.costPrice
        : product.costPrice;

    // Determina o preço de venda praticado no canal
    const channelListing = product.channelListings?.[feeConfig.channel];
    const sellingPrice =
      options?.customSellingPrice !== undefined
        ? options.customSellingPrice
        : variation?.price !== undefined && options?.variationIdOrSku && options.variationIdOrSku !== 'BASE'
        ? variation.price
        : channelListing?.channelPrice !== undefined && channelListing.channelPrice > 0
        ? channelListing.channelPrice
        : product.basePrice;

    const breakdown = simulateChannelProfit(
      cmv,
      sellingPrice,
      feeConfig,
      options?.customTargetMarginPct
    );

    return {
      ...breakdown,
      productId: product.id,
      productTitle: product.title,
      variationSku: variation?.sku || product.masterSku,
      channelId: feeConfig.channel,
    };
  }

  /**
   * Calcula o preço ideal de venda (`suggestedPrice`) para atingir a margem líquida desejada (`marginPct`)
   * em um determinado canal, levando em conta todas as deduções variáveis, custos fixos e regras de
   * isenção de taxa fixa por faixa de preço (ex: R$ 79,00 no Mercado Livre).
   *
   * Fórmula base:
   * Preço Ideal = (CMV + Taxa Fixa + Frete + Embalagem) / (1 - %Comissão - %Gateway - %Imposto - %MargemDesejada)
   *
   * @param productId ID do produto (ou SKU)
   * @param channelId Identificador do canal ('APP_SAGAS', 'SHOPEE', 'MERCADO_LIVRE', 'TIKTOK_SHOP', etc.)
   * @param marginPct Margem líquida desejada em % (ex: 30 para 30%). Se omitida, usa a meta padrão do canal.
   * @param options Opções adicionais (ex: customCostPrice ou variationIdOrSku)
   */
  public suggestPriceForMargin(
    productId: string,
    channelId: string,
    marginPct?: number,
    options?: Pick<SimulationOptions, 'customCostPrice' | 'variationIdOrSku'>
  ): SuggestPriceResult {
    const { product, variation } = this.resolveProductAndVariation(
      productId,
      options?.variationIdOrSku
    );
    const feeConfig = this.resolveChannelFeeConfig(channelId);

    const cmv =
      options?.customCostPrice !== undefined
        ? options.customCostPrice
        : variation?.costPrice !== undefined
        ? variation.costPrice
        : product.costPrice;

    const targetMarginPct =
      marginPct !== undefined ? marginPct : feeConfig.targetMarginPct;

    const { suggestedPrice, breakEvenPrice, fixedFeeIncluded } = calculateSuggestedPrice(
      cmv,
      feeConfig,
      targetMarginPct
    );

    // Simula com o preço sugerido para retornar também o lucro líquido estimado em R$
    const simulatedAtSuggested = simulateChannelProfit(
      cmv,
      suggestedPrice,
      feeConfig,
      targetMarginPct
    );

    const derivedMarkupPct =
      cmv > 0 ? Math.round(((suggestedPrice - cmv) / cmv) * 1000) / 10 : 0;

    return {
      productId: product.id,
      productTitle: product.title,
      variationSku: variation?.sku || product.masterSku,
      channelId: feeConfig.channel,
      channelLabel: feeConfig.channelLabel,
      cmv,
      targetMarginPct,
      suggestedPrice,
      breakEvenPrice,
      fixedFeeIncluded,
      estimatedNetProfit: simulatedAtSuggested.netProfit,
      estimatedMarginPct: simulatedAtSuggested.marginPct,
      derivedMarkupPct,
    };
  }

  /**
   * Simula todos os canais ativos simultaneamente para um produto (ou para valores arbitrários de CMV/Preço).
   */
  public simulateAllChannels(
    productId: string,
    options?: SimulationOptions & {
      channelPricesOverride?: Partial<Record<MarketplaceChannel, number>>;
    }
  ): ProfitSimulationResult[] {
    return this.feeConfigs
      .filter((cfg) => cfg.isActive)
      .map((cfg) => {
        const overridePrice =
          options?.channelPricesOverride?.[cfg.channel] ?? options?.customSellingPrice;
        return this.simulate(productId, cfg.channel, {
          ...options,
          customSellingPrice: overridePrice,
        });
      });
  }
}

/** Instância singleton padrão para consumo nos componentes React do MVP */
export const profitCalculatorService = new ProfitCalculatorService();
