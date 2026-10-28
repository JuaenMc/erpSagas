import { Router, Request, Response } from 'express';

const router = Router();

interface ShippingOption {
  id: string;
  name: string;
  carrier: string;
  price: number;
  estimatedDays: number;
  estimatedDeliveryText: string;
  isFree: boolean;
}

/**
 * Determina região brasileira a partir dos primeiros 2 dígitos do CEP
 */
function getRegionFromCep(cleanCep: string): { region: string; basePrice: number; baseDays: number; state: string } {
  const prefix2 = parseInt(cleanCep.substring(0, 2), 10);

  if (prefix2 >= 1 && prefix2 <= 19) {
    // SP (Capital e Interior)
    return { region: 'São Paulo', state: 'SP', basePrice: 12.90, baseDays: 2 };
  } else if (prefix2 >= 20 && prefix2 <= 28) {
    // RJ
    return { region: 'Rio de Janeiro', state: 'RJ', basePrice: 16.50, baseDays: 3 };
  } else if (prefix2 === 29) {
    // ES
    return { region: 'Espírito Santo', state: 'ES', basePrice: 18.00, baseDays: 4 };
  } else if (prefix2 >= 30 && prefix2 <= 39) {
    // MG
    return { region: 'Minas Gerais', state: 'MG', basePrice: 17.00, baseDays: 3 };
  } else if (prefix2 >= 40 && prefix2 <= 48) {
    // BA
    return { region: 'Bahia', state: 'BA', basePrice: 22.90, baseDays: 5 };
  } else if (prefix2 >= 49 && prefix2 <= 65) {
    // Nordeste (SE, AL, PE, PB, RN, CE, PI, MA)
    return { region: 'Nordeste', state: 'NE', basePrice: 26.50, baseDays: 6 };
  } else if (prefix2 >= 66 && prefix2 <= 69) {
    // Norte (PA, AP, AM, RR, AC, RO)
    return { region: 'Norte', state: 'NO', basePrice: 34.00, baseDays: 8 };
  } else if (prefix2 >= 70 && prefix2 <= 76) {
    // Centro-Oeste (DF, GO, TO, MT, MS)
    return { region: 'Centro-Oeste', state: 'CO', basePrice: 21.00, baseDays: 4 };
  } else if (prefix2 >= 80 && prefix2 <= 87) {
    // PR
    return { region: 'Paraná', state: 'PR', basePrice: 16.90, baseDays: 3 };
  } else if (prefix2 >= 88 && prefix2 <= 89) {
    // SC
    return { region: 'Santa Catarina', state: 'SC', basePrice: 17.50, baseDays: 3 };
  } else if (prefix2 >= 90 && prefix2 <= 99) {
    // RS
    return { region: 'Rio Grande do Sul', state: 'RS', basePrice: 18.90, baseDays: 4 };
  }

  return { region: 'Nacional', state: 'BR', basePrice: 19.90, baseDays: 5 };
}

/**
 * POST /api/shipping/calculate
 * Calcula opções de frete real (PAC, SEDEX, Transportadora) com prazos e preços
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { cep, subtotal = 0, weightGrams = 350 } = req.body;

    if (!cep) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'CEP de destino é obrigatório.',
      });
    }

    const cleanCep = String(cep).replace(/\D/g, '');
    if (cleanCep.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'InvalidCep',
        message: 'CEP deve conter 8 dígitos.',
      });
    }

    const regionInfo = getRegionFromCep(cleanCep);
    const numericSubtotal = Number(subtotal) || 0;
    const numericWeightGrams = Number(weightGrams) || 350;

    // Fator de peso adicional (+ R$ 1,50 a cada 500g extras acima de 500g)
    const weightSurcharge = Math.max(0, Math.ceil((numericWeightGrams - 500) / 500) * 1.5);

    // Regra de Frete Grátis: compras a partir de R$ 199,00
    const isFreeShippingEligible = numericSubtotal >= 199;

    const pacPrice = isFreeShippingEligible ? 0 : Math.round((regionInfo.basePrice + weightSurcharge) * 100) / 100;
    const sedexPrice = Math.round((regionInfo.basePrice * 1.65 + weightSurcharge * 1.2) * 100) / 100;
    const jadlogPrice = isFreeShippingEligible
      ? 0
      : Math.round((regionInfo.basePrice * 0.95 + weightSurcharge) * 100) / 100;

    const options: ShippingOption[] = [
      {
        id: 'pac',
        name: 'Correios PAC',
        carrier: 'Correios',
        price: pacPrice,
        estimatedDays: regionInfo.baseDays + 2,
        estimatedDeliveryText: `Em até ${regionInfo.baseDays + 2} dias úteis`,
        isFree: isFreeShippingEligible,
      },
      {
        id: 'sedex',
        name: 'Correios SEDEX (Expresso)',
        carrier: 'Correios',
        price: sedexPrice,
        estimatedDays: Math.max(1, regionInfo.baseDays - 1),
        estimatedDeliveryText: `Em até ${Math.max(1, regionInfo.baseDays - 1)} dia(s) útil(eis)`,
        isFree: false,
      },
      {
        id: 'express_sagas',
        name: 'Logística Expressa SAGAS',
        carrier: 'Jadlog / Total Express',
        price: jadlogPrice,
        estimatedDays: regionInfo.baseDays,
        estimatedDeliveryText: `Em até ${regionInfo.baseDays} dias úteis`,
        isFree: isFreeShippingEligible,
      },
    ];

    return res.status(200).json({
      success: true,
      cep: cleanCep,
      destination: {
        region: regionInfo.region,
        state: regionInfo.state,
      },
      freeShippingThreshold: 199.0,
      freeShippingApplied: isFreeShippingEligible,
      options,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/shipping/calculate:', error);
    return res.status(500).json({
      success: false,
      error: 'ShippingCalculateError',
      message: error.message || 'Falha ao calcular frete.',
    });
  }
});

export default router;
