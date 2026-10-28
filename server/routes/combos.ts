import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { ComboType } from '@prisma/client';

const router = Router();

/**
 * GET /api/combos
 * Lista todas as regras de combos comerciais cadastradas
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const combos = await prisma.comboRule.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return res.status(200).json({
      success: true,
      count: combos.length,
      data: combos.map((c) => ({
        id: c.id,
        name: c.name,
        tag: c.tag,
        type: c.type,
        requiredQuantity: c.requiredQuantity,
        paidQuantity: c.paidQuantity,
        bundlePrice: Number(c.bundlePrice),
        eligibleCategoryIds: c.eligibleCategoryIds,
        fixedVariationIds: c.fixedVariationIds,
        estimatedMarginPct: Number(c.estimatedMarginPct),
        active: c.isActive,
        priority: c.priority,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Erro em GET /api/combos:', error);
    return res.status(500).json({
      success: false,
      error: 'GetCombosError',
      message: error.message || 'Falha ao buscar combos.',
    });
  }
});

/**
 * POST /api/combos
 * Cadastra nova regra de combo dinâmico
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      tag,
      type = 'BUY_X_PAY_Y',
      requiredQuantity = 3,
      paidQuantity = 2,
      bundlePrice = 0,
      eligibleCategoryIds = ['*'],
      fixedVariationIds = [],
      estimatedMarginPct = 32.5,
      active = true,
      priority = 1,
    } = req.body;

    if (!name || !tag) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'name e tag são obrigatórios.',
      });
    }

    const tenant = (await prisma.tenant.findFirst({ where: { slug: 'sagas-moda' } })) || (await prisma.tenant.findFirst());
    if (!tenant) {
      return res.status(500).json({ success: false, error: 'TenantError', message: 'Tenant não encontrado.' });
    }

    const created = await prisma.comboRule.create({
      data: {
        tenantId: tenant.id,
        name,
        tag,
        type: type as ComboType,
        requiredQuantity: Number(requiredQuantity),
        paidQuantity: paidQuantity !== undefined ? Number(paidQuantity) : null,
        bundlePrice: Number(bundlePrice),
        eligibleCategoryIds,
        fixedVariationIds,
        estimatedMarginPct: Number(estimatedMarginPct),
        isActive: Boolean(active),
        priority: Number(priority),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Combo criado com sucesso!',
      data: created,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/combos:', error);
    return res.status(500).json({
      success: false,
      error: 'CreateComboError',
      message: error.message || 'Falha ao cadastrar combo.',
    });
  }
});

/**
 * PUT /api/combos/:id
 * Atualiza combo existente
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      tag,
      type,
      requiredQuantity,
      paidQuantity,
      bundlePrice,
      eligibleCategoryIds,
      fixedVariationIds,
      estimatedMarginPct,
      active,
      priority,
    } = req.body;

    const updated = await prisma.comboRule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(tag !== undefined && { tag }),
        ...(type !== undefined && { type: type as ComboType }),
        ...(requiredQuantity !== undefined && { requiredQuantity: Number(requiredQuantity) }),
        ...(paidQuantity !== undefined && { paidQuantity: Number(paidQuantity) }),
        ...(bundlePrice !== undefined && { bundlePrice: Number(bundlePrice) }),
        ...(eligibleCategoryIds !== undefined && { eligibleCategoryIds }),
        ...(fixedVariationIds !== undefined && { fixedVariationIds }),
        ...(estimatedMarginPct !== undefined && { estimatedMarginPct: Number(estimatedMarginPct) }),
        ...(active !== undefined && { isActive: Boolean(active) }),
        ...(priority !== undefined && { priority: Number(priority) }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Combo atualizado com sucesso!',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'UpdateComboError',
      message: error.message || 'Falha ao atualizar combo.',
    });
  }
});

/**
 * DELETE /api/combos/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.comboRule.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Combo removido com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'DeleteComboError',
      message: error.message || 'Falha ao deletar combo.',
    });
  }
});

export default router;
