import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProfitCalculatorService,
  BRAZILIAN_MARKETPLACE_FEES,
} from '../../src/services/ProfitCalculatorService';
import {
  simulateChannelProfit,
  suggestPriceForMargin,
  DEFAULT_CHANNEL_FEE_CONFIGS,
  ChannelFeeConfigModel,
} from '../../src/logic/profit-calculator';
import { MarketplaceChannel, Product } from '../../src/types';

describe('ProfitCalculatorService & Logic Unit Tests', () => {
  let service: ProfitCalculatorService;

  const mockProduct: Product = {
    id: 'prod-test-01',
    tenantId: 'tenant-01',
    categoryId: 'cat-01',
    title: 'Vestido Floral Elegance',
    masterSku: 'VEST-FLORAL-01',
    basePrice: 100.0,
    costPrice: 40.0,
    type: 'VARIABLE',
    status: 'ACTIVE',
    weightGrams: 250,
    description: 'Vestido floral midi em viscose premium',
    coverImageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446',
    brand: 'sagas.moda',
    mediaGallery: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variations: [
      {
        id: 'var-test-01',
        productId: 'prod-test-01',
        sku: 'VEST-FLORAL-01-M-AZUL',
        size: 'M',
        color: 'Azul',
        price: 110.0,
        costPrice: 42.0,
        barcodeEan13: '7891234567890',
        stockPhysical: 15,
        stockReservedOrder: 0,
        stockReservedPromo: 0,
        stockAvailable: 15,
      },
    ],
  };

  beforeEach(() => {
    service = new ProfitCalculatorService([mockProduct], DEFAULT_CHANNEL_FEE_CONFIGS);
  });

  describe('Cálculo de margem para cada canal (App, Shopee, Mercado Livre, TikTok)', () => {
    it('deve calcular corretamente a margem para APP_SAGAS (D2C)', () => {
      const res = service.simulate(mockProduct.id, 'APP_SAGAS');

      expect(res.channel).toBe('APP_SAGAS');
      expect(res.sellingPrice).toBe(100.0);
      expect(res.cmv).toBe(40.0);
      expect(res.commissionAmount).toBe(0.0);
      expect(res.paymentFeeAmount).toBe(1.99);
      expect(res.taxAmount).toBe(5.0);
      expect(res.packagingCost).toBe(1.5);
      expect(res.netProfit).toBeCloseTo(51.51, 1);
      expect(res.marginPct).toBeCloseTo(51.5, 1);
      expect(res.semaphore).toBe('GREEN');
      expect(res.isBelowBreakEven).toBe(false);
    });

    it('deve calcular corretamente a margem para SHOPEE (Frete Grátis Extra)', () => {
      const res = service.simulate(mockProduct.id, 'SHOPEE');

      expect(res.channel).toBe('SHOPEE');
      expect(res.commissionAmount).toBe(20.0);
      expect(res.fixedFeeApplied).toBe(4.0);
      expect(res.taxAmount).toBe(5.0);
      expect(res.packagingCost).toBe(1.5);
      expect(res.netProfit).toBeCloseTo(29.5, 1);
      expect(res.marginPct).toBeCloseTo(29.5, 1);
      expect(res.semaphore).toBe('YELLOW');
      expect(res.isBelowBreakEven).toBe(false);
    });

    it('deve calcular corretamente para MERCADO_LIVRE com isenção de taxa fixa quando preço >= R$ 79,00', () => {
      const resAboveThreshold = service.simulate(mockProduct.id, 'MERCADO_LIVRE', {
        customSellingPrice: 100.0,
      });

      expect(resAboveThreshold.fixedFeeApplied).toBe(0.0);
      expect(resAboveThreshold.commissionPct).toBe(17.0);
      expect(resAboveThreshold.commissionAmount).toBe(17.0);
      expect(resAboveThreshold.taxAmount).toBe(5.0);

      const resBelowThreshold = service.simulate(mockProduct.id, 'MERCADO_LIVRE', {
        customSellingPrice: 50.0,
      });

      expect(resBelowThreshold.fixedFeeApplied).toBe(6.0);
      expect(resBelowThreshold.commissionAmount).toBe(8.5);
    });

    it('deve calcular corretamente para TIKTOK_SHOP', () => {
      const res = service.simulate(mockProduct.id, 'TIKTOK_SHOP');

      expect(res.channel).toBe('TIKTOK_SHOP');
      expect(res.commissionAmount).toBe(8.0);
      expect(res.fixedFeeApplied).toBe(2.0);
      expect(res.netProfit).toBeCloseTo(43.5, 1);
      expect(res.marginPct).toBeCloseTo(43.5, 1);
      expect(res.semaphore).toBe('GREEN');
    });
  });

  describe('Canais e constantes brasileiras adicionais (SHEIN, AMAZON, MAGALU)', () => {
    it('deve resolver taxas para SHEIN a partir das constantes brasileiras', () => {
      const config = service.resolveChannelFeeConfig('SHEIN');
      expect(config.channelLabel).toContain('Shein');
      expect(config.commissionPct).toBe(BRAZILIAN_MARKETPLACE_FEES.SHEIN.commissionPct);

      const sim = service.simulate(mockProduct.id, 'SHEIN');
      expect(sim.commissionPct).toBe(BRAZILIAN_MARKETPLACE_FEES.SHEIN.commissionPct);
    });

    it('deve resolver taxas para AMAZON_BR e MAGALU', () => {
      const amazonCfg = service.resolveChannelFeeConfig('AMAZON_BR');
      expect(amazonCfg.channelLabel).toContain('Amazon');

      const magaluCfg = service.resolveChannelFeeConfig('MAGALU');
      expect(magaluCfg.channelLabel).toContain('Magalu');
    });

    it('deve permitir sincronizar produtos e configurações de taxas em tempo real', () => {
      const initialConfigs = service.getFeeConfigs();
      expect(initialConfigs.length).toBeGreaterThan(0);

      const updatedConfigs = [...initialConfigs];
      service.syncFeeConfigs(updatedConfigs);
      expect(service.getFeeConfigs()).toEqual(updatedConfigs);

      service.syncProducts([mockProduct]);
    });

    it('deve simular com variação específica e custos customizados', () => {
      const simVar = service.simulate(mockProduct.id, 'APP_SAGAS', {
        variationIdOrSku: 'VEST-FLORAL-01-M-AZUL',
      });
      expect(simVar.cmv).toBe(42.0); // Custo da variação
      expect(simVar.sellingPrice).toBe(110.0); // Preço da variação

      const simCustom = service.simulate(mockProduct.id, 'APP_SAGAS', {
        customCostPrice: 30.0,
        customSellingPrice: 90.0,
        customTargetMarginPct: 40.0,
      });
      expect(simCustom.cmv).toBe(30.0);
      expect(simCustom.sellingPrice).toBe(90.0);
      expect(simCustom.targetMarginPct).toBe(40.0);
    });
  });

  describe('Preço Sugerido para Margem Alvo (Margin-Aware Pricing)', () => {
    it('deve sugerir preço que atinja a margem alvo especificada', () => {
      const targetMargin = 30.0;
      const suggested = service.suggestPriceForMargin(mockProduct.id, 'SHOPEE', targetMargin);

      expect(suggested.suggestedPrice).toBeGreaterThan(mockProduct.costPrice);
      expect(suggested.estimatedMarginPct).toBeCloseTo(targetMargin, 0.5);
      expect(suggested.estimatedNetProfit).toBeGreaterThan(0);
    });

    it('deve sugerir preço respeitando a isenção de taxa fixa no Mercado Livre quando viável', () => {
      const suggested = service.suggestPriceForMargin(mockProduct.id, 'MERCADO_LIVRE', 30.0);

      expect(suggested.suggestedPrice).toBeGreaterThan(79.0);
      expect(suggested.fixedFeeIncluded).toBe(0);
      expect(suggested.estimatedMarginPct).toBeCloseTo(30.0, 0.5);
    });

    it('deve sugerir preço com custos customizados e variação específica', () => {
      const suggested = service.suggestPriceForMargin(mockProduct.id, 'APP_SAGAS', 35.0, {
        customCostPrice: 50.0,
        variationIdOrSku: 'var-test-01',
      });
      expect(suggested.cmv).toBe(50.0);
      expect(suggested.suggestedPrice).toBeGreaterThan(50.0);
    });
  });

  describe('Ponto de Equilíbrio (Break-Even)', () => {
    it('deve calcular o break-even onde o lucro líquido é ~0', () => {
      const suggested = service.suggestPriceForMargin(mockProduct.id, 'APP_SAGAS', 0.0);
      const breakEvenPrice = suggested.breakEvenPrice;

      const sim = service.simulate(mockProduct.id, 'APP_SAGAS', {
        customSellingPrice: breakEvenPrice,
      });

      expect(Math.abs(sim.netProfit)).toBeLessThanOrEqual(0.5);
      expect(sim.isBelowBreakEven).toBe(false);
    });

    it('deve sinalizar vermelho e isBelowBreakEven quando vendido abaixo do custo/break-even', () => {
      const simLoss = service.simulate(mockProduct.id, 'APP_SAGAS', {
        customSellingPrice: 20.0,
      });

      expect(simLoss.netProfit).toBeLessThan(0);
      expect(simLoss.isBelowBreakEven).toBe(true);
      expect(simLoss.semaphore).toBe('RED');
    });
  });

  describe('Simulação em massa com simulateAllChannels', () => {
    it('deve retornar simulações para todos os canais ativos', () => {
      const allSimulations = service.simulateAllChannels(mockProduct.id);
      expect(allSimulations.length).toBe(DEFAULT_CHANNEL_FEE_CONFIGS.filter(c => c.isActive).length);

      const channelsFound = allSimulations.map(s => s.channel);
      expect(channelsFound).toContain('APP_SAGAS');
      expect(channelsFound).toContain('SHOPEE');
      expect(channelsFound).toContain('MERCADO_LIVRE');
      expect(channelsFound).toContain('TIKTOK_SHOP');
    });

    it('deve permitir sobrescrever preços por canal em simulateAllChannels', () => {
      const allSimulations = service.simulateAllChannels(mockProduct.id, {
        channelPricesOverride: {
          SHOPEE: 120.0,
          APP_SAGAS: 95.0,
        },
      });

      const shopeeSim = allSimulations.find(s => s.channel === 'SHOPEE');
      expect(shopeeSim?.sellingPrice).toBe(120.0);

      const appSim = allSimulations.find(s => s.channel === 'APP_SAGAS');
      expect(appSim?.sellingPrice).toBe(95.0);
    });
  });
});
