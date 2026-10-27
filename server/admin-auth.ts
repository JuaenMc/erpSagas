import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sagas2026admin';
export const ERP_INTERNAL_API_KEY = process.env.ERP_INTERNAL_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';
export const ADMIN_COOKIE_NAME = 'sagas_admin_token';

/**
 * Gera um token seguro e determinístico para a sessão administrativa
 */
export function generateAdminToken(): string {
  return crypto
    .createHmac('sha256', ERP_INTERNAL_API_KEY)
    .update(`admin_session_${ADMIN_PASSWORD}`)
    .digest('hex');
}

/**
 * Utilitário nativo para parsear os cookies do cabeçalho da requisição
 */
export function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      list[name] = decodeURIComponent(val);
    }
  });

  return list;
}

/**
 * Verifica se a requisição possui credencial administrativa válida:
 * 1. Header X-ERP-API-KEY
 * 2. Cookie httpOnly sagas_admin_token
 * 3. Header Authorization (Bearer <token>)
 */
export function verifyAdminAuth(req: Request): boolean {
  // 1. Verificação por X-ERP-API-KEY
  const apiKey = req.headers['x-erp-api-key'] || req.headers['X-ERP-API-KEY'];
  if (apiKey && apiKey === ERP_INTERNAL_API_KEY) {
    return true;
  }

  // 2. Verificação por Cookie httpOnly
  const cookies = parseCookies(req);
  const cookieToken = cookies[ADMIN_COOKIE_NAME];
  const validToken = generateAdminToken();

  if (cookieToken && (cookieToken === validToken || cookieToken === ERP_INTERNAL_API_KEY)) {
    return true;
  }

  // 3. Verificação por Bearer Token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (bearer === validToken || bearer === ERP_INTERNAL_API_KEY) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware para proteger rotas administrativas (/api/admin/* e endpoints de escrita)
 */
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (verifyAdminAuth(req)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Acesso negado: autenticação de administrador necessária.',
  });
}
