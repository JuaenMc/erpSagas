import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db';
import { JWT_SECRET, AuthRequest, requireAuth } from '../middleware/auth';
import { RoleType, MarketplaceChannel } from '@prisma/client';

const router = Router();

function generateCustomerHash(identifier: string): string {
  return crypto.createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
}

/**
 * POST /api/auth/register
 * Cadastro de usuário cliente na loja e sincronização com Customer no Neon
 */
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, phone, firebaseUid } = req.body;

    if (!email || (!password && !firebaseUid)) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'E-mail e senha são obrigatórios.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Obter Tenant Principal
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'sagas-moda' } }) || await prisma.tenant.findFirst();
    if (!tenant) {
      return res.status(500).json({ success: false, error: 'TenantError', message: 'Tenant não configurado.' });
    }

    // Verificar se já existe User com esse email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'EmailAlreadyExists',
        message: 'Já existe uma conta cadastrada com este e-mail.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = password ? await bcrypt.hash(password, salt) : 'FIREBASE_AUTH_PROVIDER';
    const fullName = name ? name.trim() : 'Cliente SAGAS';
    const userPhone = phone ? phone.trim() : null;

    // Transação para criar User e espelhar em Customer
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: normalizedEmail,
          fullName,
          phone: userPhone,
          passwordHash,
          role: RoleType.CUSTOMER,
        },
      });

      const cpfHash = generateCustomerHash(firebaseUid || normalizedEmail);
      await tx.customer.upsert({
        where: { cpfHash },
        update: {
          fullName,
          email: normalizedEmail,
          phone: userPhone || '11999999999',
          passwordHash,
        },
        create: {
          tenantId: tenant.id,
          fullName,
          cpfHash,
          cpfEnc: Buffer.from(firebaseUid || normalizedEmail).toString('base64'),
          email: normalizedEmail,
          phone: userPhone || '11999999999',
          passwordHash,
          AcquisitionChannel: MarketplaceChannel.APP_SAGAS,
        },
      });

      return newUser;
    });

    // Gerar JWT real
    const token = jwt.sign(
      {
        id: result.id,
        email: result.email,
        name: result.fullName,
        role: result.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Conta criada com sucesso!',
      token,
      user: {
        id: result.id,
        email: result.email,
        name: result.fullName,
        phone: result.phone,
        role: result.role,
        createdAt: result.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erro em POST /api/auth/register:', error);
    return res.status(500).json({
      success: false,
      error: 'RegisterError',
      message: error.message || 'Falha ao registrar usuário.',
    });
  }
});

/**
 * POST /api/auth/login
 * Login com e-mail e senha ou validação de Firebase UID
 */
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firebaseUid, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'E-mail é obrigatório.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Procurar na tabela User
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Se login via Firebase Auth (Google ou Email) e usuário ainda não existe no Postgres, cria automaticamente
    if (!user && firebaseUid) {
      const tenant = await prisma.tenant.findFirst({ where: { slug: 'sagas-moda' } }) || await prisma.tenant.findFirst();
      if (tenant) {
        user = await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email: normalizedEmail,
            fullName: name || 'Cliente SAGAS',
            passwordHash: 'FIREBASE_AUTH_PROVIDER',
            role: RoleType.CUSTOMER,
          },
        });

        const cpfHash = generateCustomerHash(firebaseUid);
        await prisma.customer.upsert({
          where: { cpfHash },
          update: { fullName: name || 'Cliente SAGAS', email: normalizedEmail },
          create: {
            tenantId: tenant.id,
            fullName: name || 'Cliente SAGAS',
            cpfHash,
            cpfEnc: Buffer.from(firebaseUid).toString('base64'),
            email: normalizedEmail,
            phone: '11999999999',
            AcquisitionChannel: MarketplaceChannel.APP_SAGAS,
          },
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'InvalidCredentials',
        message: 'E-mail ou senha incorretos.',
      });
    }

    // Se o login for por senha convencional, validar hash
    if (!firebaseUid) {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Senha é obrigatória.',
        });
      }

      // Se a conta foi criada via Firebase provider
      if (user.passwordHash === 'FIREBASE_AUTH_PROVIDER') {
        return res.status(400).json({
          success: false,
          error: 'UseGoogleLogin',
          message: 'Esta conta foi criada com o Google. Por favor, utilize o botão "Entrar com Google".',
        });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'InvalidCredentials',
          message: 'E-mail ou senha incorretos.',
        });
      }
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Gerar JWT real
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        phone: user.phone,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error: any) {
    console.error('Erro em POST /api/auth/login:', error);
    return res.status(500).json({
      success: false,
      error: 'LoginError',
      message: error.message || 'Falha ao autenticar usuário.',
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (_req: AuthRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
  });
});

/**
 * GET /api/auth/me
 * Retorna dados detalhados do usuário autenticado
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        _count: {
          select: {
            orders: true,
            favorites: true,
            cart: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'UserNotFound',
        message: 'Usuário não encontrado.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        addresses: user.addresses,
        activeOrdersCount: user._count.orders,
        favoritesCount: user._count.favorites,
        cartItemsCount: user._count.cart,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'AuthMeError',
      message: error.message || 'Falha ao carregar perfil do usuário.',
    });
  }
});

export default router;
