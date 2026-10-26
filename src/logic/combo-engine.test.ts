import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateComboRule,
  evaluateFlashSale,
  generateZpl10x15,
  processStockDeduction,
  type ComboRule,
  type ComboItem,
  type FlashSale,
  type ThermalLabelData,
} from './combo-engine.js';

test('evaluateComboRule: 3 por 100 correctly groups 3 items and distributes discount', () => {
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

  assert.equal(result.isEligible, true);
  assert.equal(result.appliedCombosCount, 1);
  assert.equal(result.originalTotal, 130);
  assert.equal(result.discountedTotal, 100);
  assert.equal(result.totalSavings, 30);
  assert.equal(result.allocatedItemPrices.length, 3);

  const allocatedSum = result.allocatedItemPrices.reduce((acc, i) => acc + i.finalEffectivePrice, 0);
  assert.equal(Math.round(allocatedSum * 100) / 100, 100);
});

test('evaluateComboRule: Leve 3 Pague 2 (BUY_X_PAY_Y) discounts cheapest item', () => {
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
  assert.equal(result.isEligible, true);
  // Total original = 80 + 50 + 30 = 160. Item mais barato (30) deve ser o total de desconto = R$ 130 final.
  assert.equal(result.originalTotal, 160);
  assert.equal(result.discountedTotal, 130);
  assert.equal(result.totalSavings, 30);
});

test('evaluateFlashSale: applies discount when current time is within window', () => {
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
  assert.equal(result.isLive, true);
  assert.equal(result.promotionalPrice, 55);
  assert.equal(result.hasStockAvailable, true);
});

test('generateZpl10x15: produces valid ZPL commands for 10x15cm thermal label', () => {
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
  assert.match(zpl, /\^XA/);
  assert.match(zpl, /\^XZ/);
  assert.match(zpl, /BR2398471923X/);
});
