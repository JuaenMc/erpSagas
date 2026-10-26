import { describe, it, expect } from 'vitest';
import {
  evaluateComboRule,
  evaluateFlashSale,
  generateZpl10x15,
  type ComboRule,
  type ComboItem,
  type FlashSale,
  type ThermalLabelData,
} from './combo-engine.js';

describe('Combo Engine Unit Tests', () => {
  it('evaluateComboRule: 3 por 100 correctly groups 3 items and distributes discount', () => {
    const rule: ComboRule = {
      id: 'combo-3-100',
      name: 'Combo 3 Peças por R$100',
      tag: 'Combo 3 por 100',
      type: 'FIXED_PRICE',
      requiredQuantity: 3,
      bundlePrice: 100,
      eligibleCategoryIds: ['infantil', 'feminino'],
      channelScope: 'ALL_CHANNELS',
      active: true,
      priority: 1,
    };

    const items: ComboItem[] = [
      { id: '1', sku: 'VEST-FLORAL-P', name: 'Vestido Floral', categoryId: 'infantil', unitPrice: 45, quantity: 1 },
      { id: '2', sku: 'JARD-UNISSEX-M', name: 'Jardineira Jeans', categoryId: 'infantil', unitPrice: 45, quantity: 1 },
      { id: '3', sku: 'CONJ-MOLETOM-G', name: 'Conjunto Moletom', categoryId: 'infantil', unitPrice: 40, quantity: 1 },
    ];

    const result = evaluateComboRule(items, rule);

    expect(result.isEligible).toBe(true);
    expect(result.appliedCombosCount).toBe(1);
    expect(result.originalTotal).toBe(130);
    expect(result.discountedTotal).toBe(100);
    expect(result.totalSavings).toBe(30);
    expect(result.allocatedItemPrices.length).toBe(3);

    const allocatedSum = result.allocatedItemPrices.reduce((acc, i) => acc + i.finalEffectivePrice, 0);
    expect(Math.round(allocatedSum * 100) / 100).toBe(100);
  });

  it('evaluateComboRule: Leve 3 Pague 2 (BUY_X_PAY_Y) discounts cheapest item', () => {
    const rule: ComboRule = {
      id: 'combo-leve-3-pague-2',
      name: 'Leve 3 Pague 2',
      tag: 'Leve 3 Pague 2',
      type: 'BUY_X_PAY_Y',
      requiredQuantity: 3,
      paidQuantity: 2,
      bundlePrice: 0,
      eligibleCategoryIds: ['*'],
      channelScope: 'ALL_CHANNELS',
      active: true,
      priority: 1,
    };

    const items: ComboItem[] = [
      { id: '1', sku: 'VEST-MIDI-M', name: 'Vestido Midi', categoryId: 'feminino', unitPrice: 80, quantity: 1 },
      { id: '2', sku: 'JARD-UNIS-06', name: 'Jardineira', categoryId: 'infantil', unitPrice: 50, quantity: 1 },
      { id: '3', sku: 'BLUSA-BASICA-P', name: 'Blusa Básica', categoryId: 'feminino', unitPrice: 30, quantity: 1 },
    ];

    const result = evaluateComboRule(items, rule);
    expect(result.isEligible).toBe(true);
    expect(result.originalTotal).toBe(160);
    expect(result.discountedTotal).toBe(130);
    expect(result.totalSavings).toBe(30);
  });

  it('evaluateFlashSale: applies discount when current time is within window', () => {
    const now = new Date('2026-10-24T18:00:00Z').getTime();
    const flashSale: FlashSale = {
      id: 'flash-1',
      name: 'Oferta Relâmpago Verão',
      startIso: '2026-10-24T12:00:00Z',
      endIso: '2026-10-24T23:59:59Z',
      discountPercentage: 45,
      maxReservedStock: 50,
      soldCount: 15,
      active: true,
    };

    const result = evaluateFlashSale(100, flashSale, now);
    expect(result.isLive).toBe(true);
    expect(result.promotionalPrice).toBe(55);
    expect(result.hasStockAvailable).toBe(true);
  });

  it('generateZpl10x15: produces valid ZPL commands for 10x15cm thermal label', () => {
    const labelData: ThermalLabelData = {
      orderId: 'PED-98231',
      channel: 'SHOPEE',
      trackingNumber: 'BR2398471923X',
      recipientName: 'Mariana Silva Santos',
      recipientDoc: '394.812.981-02',
      addressLine1: 'Rua das Flores, 420 - Apt 54',
      addressLine2: 'Bela Vista',
      city: 'Sao Paulo',
      state: 'SP',
      zipCode: '01310-000',
      serviceCode: 'SPX',
      packageWeightGrams: 450,
      itemsSummary: '1x VESTIDO-FLORAL-P, 2x JARD-UNISSEX-M',
      declarationValue: 100.0,
    };

    const zpl = generateZpl10x15(labelData);
    expect(zpl).toMatch(/\^XA/);
    expect(zpl).toMatch(/\^XZ/);
    expect(zpl).toMatch(/BR2398471923X/);
  });
});
