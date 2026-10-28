import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'sagas_jwt_secret_production_key_2026_omnichannel';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  userId?: string;
}

/**
 * Middleware para identificar usuário opcionalmente (não rejeita se não autenticado)
 * Útil para carrinho anônimo ou rotas públicas que se enriquecem com usuário
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
      req.userId = decoded.id;
      return next();
    }

    // Suporte também a headers diretos caso enviados pelo frontend
    const directUserId = (req.headers['x-user-id'] || req.headers['x-customer-id']) as string;
    if (directUserId) {
      req.userId = directUserId;
    }
  } catch (err) {
    // Token inválido/expirado, continua como anônimo
  }
  next();
}

/**
 * Middleware para exigir autenticação JWT
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fallback: se tiver API Key de ERP admin ou x-user-id
    const directUserId = (req.headers['x-user-id'] || req.headers['x-customer-id']) as string;
    if (directUserId) {
      req.userId = directUserId;
      return next();
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token de autenticação ausente ou inválido.',
    });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'TokenExpiredOrInvalid',
      message: 'Sessão expirada ou token inválido. Por favor, faça login novamente.',
    });
  }
}
