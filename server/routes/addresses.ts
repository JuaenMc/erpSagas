import { Router, Response } from 'express';
import { prisma } from '../db';
import { AuthRequest, requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/addresses
 * Lista endereços do usuário
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(200).json({ success: true, data: [], count: 0 });
    }

    const addresses = await prisma.address.findMany({
      where: {
        OR: [{ userId }, { customerId: userId }],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return res.status(200).json({
      success: true,
      count: addresses.length,
      data: addresses,
    });
  } catch (error: any) {
    console.error('Erro em GET /api/addresses:', error);
    return res.status(500).json({
      success: false,
      error: 'GetAddressesError',
      message: error.message || 'Falha ao buscar endereços.',
    });
  }
});

/**
 * POST /api/addresses
 * Cadastra um novo endereço
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const {
      label = 'Casa',
      recipientName,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      cep,
      isDefault = false,
    } = req.body;

    if (!street || !number || !neighborhood || !city || !state || !cep) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Campos obrigatórios de endereço ausentes.',
      });
    }

    // Se marcado como padrão, desmarca outros anteriores
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId,
        label,
        recipientName: recipientName || req.user?.name || 'Destinatário',
        street,
        number: String(number),
        complement: complement || null,
        neighborhood,
        city,
        state: state.toUpperCase(),
        cep: cep.replace(/\D/g, ''),
        isDefault: Boolean(isDefault),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Endereço cadastrado com sucesso!',
      data: newAddress,
    });
  } catch (error: any) {
    console.error('Erro em POST /api/addresses:', error);
    return res.status(500).json({
      success: false,
      error: 'CreateAddressError',
      message: error.message || 'Falha ao cadastrar endereço.',
    });
  }
});

/**
 * PUT /api/addresses/:id
 * Edita endereço existente
 */
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.user?.id;
    const {
      label,
      recipientName,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      cep,
      isDefault,
    } = req.body;

    if (isDefault && userId) {
      await prisma.address.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(recipientName !== undefined && { recipientName }),
        ...(street !== undefined && { street }),
        ...(number !== undefined && { number: String(number) }),
        ...(complement !== undefined && { complement }),
        ...(neighborhood !== undefined && { neighborhood }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state: state.toUpperCase() }),
        ...(cep !== undefined && { cep: cep.replace(/\D/g, '') }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Endereço atualizado com sucesso!',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'UpdateAddressError',
      message: error.message || 'Falha ao atualizar endereço.',
    });
  }
});

/**
 * DELETE /api/addresses/:id
 * Remove endereço
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.address.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Endereço removido com sucesso.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'DeleteAddressError',
      message: error.message || 'Falha ao remover endereço.',
    });
  }
});

export default router;
