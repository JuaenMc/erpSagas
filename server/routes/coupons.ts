import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

/**
 * POST /api/coupons/validate
 * Valida se um cupom de desconto é real e calcula o desconto exato
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Código de cupom não informado.',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'CouponNotFound',
        message: `Cupom "${cleanCode}" inválido ou não encontrado.`,
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        success: false,
        error: 'CouponInactive',
        message: `O cupom "${cleanCode}" está inativo.`,
      });
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({
        success: false,
        error: 'CouponExpired',
        message: `O cupom "${cleanCode}" expirou.`,
      });
    }

    const numericSubtotal = Number(subtotal) || 0;
    if (numericSubtotal < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        error: 'MinPurchaseNotMet',
        message: `Este cupom exige compra mínima de R$ ${coupon.minPurchase.toFixed(2)}.`,
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        success: false,
        error: 'CouponLimitExceeded',
        message: `O limite de usos do cupom "${cleanCode}" foi atingido.`,
      });
    }

    // Calcular desconto
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (numericSubtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // FIXED
      discountAmount = Math.min(coupon.value, numericSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    return res.status(200).json({
      success: true,
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
        minPurchase: coupon.minPurchase,
      },
      message: `Cupom "${coupon.code}" aplicado com sucesso! Desconto de R$ ${discountAmount.toFixed(2)}.`,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/coupons/validate:', error);
    return res.status(500).json({
      success: false,
      error: 'ValidateCouponError',
      message: error.message || 'Falha ao validar cupom.',
    });
  }
});

/**
 * GET /api/coupons
 * Lista cupons disponíveis
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validUntil: { gte: new Date() },
      },
      orderBy: { value: 'desc' },
    });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        minPurchase: c.minPurchase,
        validUntil: c.validUntil,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'ListCouponsError',
      message: error.message || 'Falha ao listar cupons.',
    });
  }
});

/**
 * POST /api/coupons (Admin)
 * Criação de novo cupom no banco
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, type = 'PERCENTAGE', value, minPurchase = 0, maxDiscount, validDays = 90 } = req.body;

    if (!code || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'code e value são obrigatórios.',
      });
    }

    const cleanCode = code.trim().toUpperCase();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(validDays));

    const coupon = await prisma.coupon.upsert({
      where: { code: cleanCode },
      update: {
        type,
        value: Number(value),
        minPurchase: Number(minPurchase),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validUntil,
        isActive: true,
      },
      create: {
        code: cleanCode,
        type,
        value: Number(value),
        minPurchase: Number(minPurchase),
        maxDiscount: maxDiscount ? Number(maxDiscount) : null,
        validUntil,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Cupom cadastrado com sucesso!',
      data: coupon,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'CreateCouponError',
      message: error.message || 'Falha ao criar cupom.',
    });
  }
});

export default router;
