/**
 * Sagas Moda - Core Business Logic Engine
 * Regras puras de negócio para:
 * 1. Motor de Combos Dinâmicos: "3 por 100", "Leve 3 Pague 2", "Combo Fixo A+B", "Combo Variável"
 * 2. Rateio fiscal proporcional (NF-e) e cálculo de margem de lucro
 * 3. Gestão de Ofertas Relâmpago (Flash Sales)
 * 4. Gerador de Etiquetas Térmicas ZPL (10x15cm / 203 DPI)
 * 5. Sincronização e Reserva Omnichannel de Estoque
 */

export interface ComboItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unitPrice: number;
  costPrice?: number;
  size?: string;
  quantity: number;
}

export type ComboRuleType = 
  | 'FIXED_PRICE'        // Ex: 3 por R$100
  | 'BUY_X_PAY_Y'        // Ex: Leve 3 Pague 2
  | 'FIXED_BUNDLE'       // Ex: Produto A + B por R$ X
  | 'VARIABLE_CATEGORY'; // Ex: Escolha 4 itens da categoria por R$ Y

export interface ComboRule {
  id: string;
  name: string;
  tag: string;
  type?: ComboRuleType;
  requiredQuantity: number;
  paidQuantity?: number; // Para Leve 3 Pague 2 (paidQuantity = 2)
  bundlePrice: number;
  eligibleCategoryIds: string[]; // ['infantil', 'feminino', etc.] ou ['*'] para qualquer
  fixedProductIds?: string[];
  channelScope: 'APP_ONLY' | 'ALL_CHANNELS';
  active: boolean;
  priority: number;
}

export interface ComboEvaluationResult {
  isEligible: boolean;
  appliedCombosCount: number;
  originalTotal: number;
  discountedTotal: number;
  totalSavings: number;
  estimatedProfitMargin?: number;
  // Rateio proporcional por SKU (fundamental para NF-e e devoluções parciais)
  allocatedItemPrices: Array<{
    sku: string;
    originalPrice: number;
    finalEffectivePrice: number;
    discountAllocated: number;
  }>;
}

/**
 * Avalia itens de um carrinho contra uma regra de combo flexível.
 * Suporta "Preço Fechado", "Leve X Pague Y", "Combo Fixo" e "Combo Variável",
 * calculando o rateio proporcional de desconto para cumprimento fiscal (NF-e)
 * e margem de contribuição.
 */
export function evaluateComboRule(
  items: ComboItem[],
  rule: ComboRule
): ComboEvaluationResult {
  const originalTotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  if (!rule.active) {
    return {
      isEligible: false,
      appliedCombosCount: 0,
      originalTotal,
      discountedTotal: originalTotal,
      totalSavings: 0,
      allocatedItemPrices: items.map(i => ({
        sku: i.sku,
        originalPrice: i.unitPrice,
        finalEffectivePrice: i.unitPrice,
        discountAllocated: 0,
      })),
    };
  }

  // Filtrar itens elegíveis
  const eligibleItems: { sku: string; price: number; cost: number; originalItem: ComboItem }[] = [];
  const nonEligibleItems: { sku: string; price: number; cost: number; originalItem: ComboItem }[] = [];

  for (const item of items) {
    let isEligible = false;

    if (rule.type === 'FIXED_BUNDLE' && rule.fixedProductIds && rule.fixedProductIds.length > 0) {
      isEligible = rule.fixedProductIds.includes(item.id);
    } else {
      isEligible =
        rule.eligibleCategoryIds.includes('*') ||
        rule.eligibleCategoryIds.includes(item.categoryId.toLowerCase());
    }

    for (let q = 0; q < item.quantity; q++) {
      if (isEligible) {
        eligibleItems.push({
          sku: item.sku,
          price: item.unitPrice,
          cost: item.costPrice || item.unitPrice * 0.4,
          originalItem: item,
        });
      } else {
        nonEligibleItems.push({
          sku: item.sku,
          price: item.unitPrice,
          cost: item.costPrice || item.unitPrice * 0.4,
          originalItem: item,
        });
      }
    }
  }

  const eligibleCount = eligibleItems.length;
  const combosFormed = Math.floor(eligibleCount / rule.requiredQuantity);

  if (combosFormed === 0) {
    return {
      isEligible: false,
      appliedCombosCount: 0,
      originalTotal,
      discountedTotal: originalTotal,
      totalSavings: 0,
      allocatedItemPrices: items.map(i => ({
        sku: i.sku,
        originalPrice: i.unitPrice,
        finalEffectivePrice: i.unitPrice,
        discountAllocated: 0,
      })),
    };
  }

  // Ordenar decrescente para agrupar as peças de maior valor primeiro
  eligibleItems.sort((a, b) => b.price - a.price);

  const itemsInCombo = eligibleItems.slice(0, combosFormed * rule.requiredQuantity);
  const remainingEligibleItems = eligibleItems.slice(combosFormed * rule.requiredQuantity);

  const comboItemsOriginalSum = itemsInCombo.reduce((acc, i) => acc + i.price, 0);

  // Determinar o preço alvo do combo dependendo da regra (Leve 3 Pague 2 vs Preço Fechado)
  let targetComboSum = 0;
  if (rule.type === 'BUY_X_PAY_Y' && rule.paidQuantity) {
    // Ex: Leve 3 Pague 2 -> os 2 itens mais caros são pagos, o mais barato sai grátis por combo
    let sumPaid = 0;
    for (let c = 0; c < combosFormed; c++) {
      const chunk = itemsInCombo.slice(c * rule.requiredQuantity, (c + 1) * rule.requiredQuantity);
      // Os itens já estão ordenados decrescente
      const paidItemsInChunk = chunk.slice(0, rule.paidQuantity);
      sumPaid += paidItemsInChunk.reduce((acc, ci) => acc + ci.price, 0);
    }
    targetComboSum = sumPaid;
  } else {
    // Preço fixo fechado (ex: R$ 100,00)
    targetComboSum = combosFormed * rule.bundlePrice;
  }

  const comboSavings = Math.max(0, comboItemsOriginalSum - targetComboSum);

  // Rateio proporcional do desconto por SKU para cumprimento de NF-e
  const allocatedItems: Array<{
    sku: string;
    originalPrice: number;
    finalEffectivePrice: number;
    discountAllocated: number;
  }> = [];

  let runningDiscount = 0;
  itemsInCombo.forEach((item, index) => {
    let itemDiscount = 0;
    if (index === itemsInCombo.length - 1) {
      itemDiscount = Math.round((comboSavings - runningDiscount) * 100) / 100;
    } else {
      const proportion = item.price / comboItemsOriginalSum;
      itemDiscount = Math.round(comboSavings * proportion * 100) / 100;
      runningDiscount += itemDiscount;
    }
    const finalPrice = Math.max(0, Math.round((item.price - itemDiscount) * 100) / 100);
    allocatedItems.push({
      sku: item.sku,
      originalPrice: item.price,
      finalEffectivePrice: finalPrice,
      discountAllocated: itemDiscount,
    });
  });

  remainingEligibleItems.forEach(item => {
    allocatedItems.push({
      sku: item.sku,
      originalPrice: item.price,
      finalEffectivePrice: item.price,
      discountAllocated: 0,
    });
  });

  nonEligibleItems.forEach(item => {
    allocatedItems.push({
      sku: item.sku,
      originalPrice: item.price,
      finalEffectivePrice: item.price,
      discountAllocated: 0,
    });
  });

  const finalDiscountedTotal = allocatedItems.reduce((acc, i) => acc + i.finalEffectivePrice, 0);

  // Cálculo de Margem Estimada
  const totalCost = itemsInCombo.reduce((acc, i) => acc + i.cost, 0);
  const profit = targetComboSum - totalCost;
  const estimatedProfitMargin = targetComboSum > 0 ? Math.round((profit / targetComboSum) * 100) : 0;

  return {
    isEligible: true,
    appliedCombosCount: combosFormed,
    originalTotal: Math.round(originalTotal * 100) / 100,
    discountedTotal: Math.round(finalDiscountedTotal * 100) / 100,
    totalSavings: Math.round(comboSavings * 100) / 100,
    estimatedProfitMargin,
    allocatedItemPrices: allocatedItems,
  };
}

export interface FlashSale {
  id: string;
  name: string;
  startIso: string;
  endIso: string;
  discountPercentage: number;
  maxReservedStock: number;
  soldCount: number;
  active: boolean;
}

export function evaluateFlashSale(
  productPrice: number,
  flashSale?: FlashSale,
  currentTimeMs: number = Date.now()
): {
  isLive: boolean;
  remainingSeconds: number;
  promotionalPrice: number;
  hasStockAvailable: boolean;
  progressPercent: number;
} {
  if (!flashSale || !flashSale.active) {
    return {
      isLive: false,
      remainingSeconds: 0,
      promotionalPrice: productPrice,
      hasStockAvailable: false,
      progressPercent: 0,
    };
  }

  const startTime = new Date(flashSale.startIso).getTime();
  const endTime = new Date(flashSale.endIso).getTime();

  const isLive = currentTimeMs >= startTime && currentTimeMs < endTime;
  const remainingSeconds = Math.max(0, Math.floor((endTime - currentTimeMs) / 1000));
  const hasStockAvailable = flashSale.soldCount < flashSale.maxReservedStock;

  const promoPrice = isLive && hasStockAvailable
    ? Math.round(productPrice * (1 - flashSale.discountPercentage / 100) * 100) / 100
    : productPrice;

  const progressPercent = Math.min(
    100,
    Math.round((flashSale.soldCount / Math.max(1, flashSale.maxReservedStock)) * 100)
  );

  return {
    isLive,
    remainingSeconds,
    promotionalPrice: promoPrice,
    hasStockAvailable,
    progressPercent,
  };
}

export interface ThermalLabelData {
  orderId: string;
  channel: 'SHOPEE' | 'MERCADO_LIVRE' | 'TIKTOK_SHOP' | 'APP_SAGAS';
  trackingNumber: string;
  recipientName: string;
  recipientDoc: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  serviceCode: string; // 'SEDEX' | 'PAC' | 'ME_ENVIOS' | 'SPX'
  packageWeightGrams: number;
  itemsSummary: string;
  declarationValue: number;
}

export function generateZpl10x15(data: ThermalLabelData): string {
  const zpl = [
    '^XA',
    '^PW812',
    '^LL1218',
    '^LH0,0',
    '^FO20,20^GB772,1178,3^FS',
    '^FO40,40^A0N,38,38^FDSAGAS.MODA - HUB OMNICHANNEL^FS',
    `^FO40,85^A0N,28,28^FDCANAL: ${data.channel} | ENVIO: ${data.serviceCode}^FS`,
    '^FO20,125^GB772,2,2^FS',
    `^FO80,145^BY3,3,100^BCN,100,Y,N,N^FD${data.trackingNumber}^FS`,
    '^FO20,285^GB772,2,2^FS',
    '^FO40,305^A0N,24,24^FDDADOS DO DESTINATARIO:^FS',
    `^FO40,335^A0N,32,32^FD${data.recipientName.toUpperCase()}^FS`,
    `^FO40,375^A0N,24,24^FDCPF/CNPJ: ${data.recipientDoc}^FS`,
    `^FO40,405^A0N,26,26^FD${data.addressLine1}^FS`,
    `^FO40,440^A0N,26,26^FD${data.addressLine2}^FS`,
    `^FO40,475^A0N,32,32^FDCID: ${data.city} - ${data.state}^FS`,
    `^FO40,515^A0N,36,36^FDCEP: ${data.zipCode}^FS`,
    `^FO600,320^BQN,2,6^FDQA,${data.trackingNumber}|${data.zipCode}|${data.orderId}^FS`,
    '^FO20,570^GB772,2,2^FS',
    '^FO40,585^A0N,22,22^FDREMETENTE: SAGAS MODA BRASIL LTDA (CNPJ: 45.892.110/0001-44)^FS',
    '^FO40,615^A0N,20,20^FDRua da Moda, 1000 - Galpao 4 - Sao Paulo - SP - CEP: 03015-000^FS',
    '^FO20,650^GB772,2,2^FS',
    '^FO40,670^A0N,24,24^FDDECLARACAO DE CONTEUDO / CONFERENCIA ERP^FS',
    `^FO40,705^A0N,22,22^FDPEDIDO ERP: #${data.orderId} | PESO: ${data.packageWeightGrams}g^FS`,
    `^FO40,735^A0N,22,22^FDVALOR DECLARADO: R$ ${data.declarationValue.toFixed(2)}^FS`,
    `^FO40,770^FB720,3,10,L^A0N,20,20^FDITENS: ${data.itemsSummary}^FS`,
    '^FO40,860^GB732,90,2^FS',
    '^FO60,880^A0N,26,26^FD[OK] TROCA PERMITIDA EM ATE 30 DIAS NO APP SAGAS.MODA^FS',
    '^FO60,915^A0N,20,20^FDMantenha a peca com a etiqueta original fixada.^FS',
    `^FO160,980^BY2,3,70^BCN,70,Y,N,N^FD${data.orderId}^FS`,
    '^XZ',
  ];

  return zpl.join('\n');
}

export function processStockDeduction(
  sku: string,
  currentStock: number,
  quantitySold: number,
  originChannel: string
) {
  const newReal = Math.max(0, currentStock - quantitySold);
  const channels = ['SHOPEE', 'MERCADO_LIVRE', 'TIKTOK_SHOP', 'APP_SAGAS'].filter(
    c => c !== originChannel
  );

  const webhooks = channels.map(channel => ({
    channel,
    action: 'UPDATE_INVENTORY',
    payload: { sku, availableStock: newReal },
    status: 'SUCCESS' as const,
    timestamp: new Date().toISOString(),
  }));

  return {
    sku,
    previousStock: currentStock,
    newRealStock: newReal,
    newAvailableStock: newReal,
    webhooksDispatched: webhooks,
  };
}
