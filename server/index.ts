import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import couponsRouter from './routes/coupons';
import stockRouter from './routes/stock';
import shippingRouter from './routes/shipping';
import combosRouter from './routes/combos';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import addressesRouter from './routes/addresses';
import cartRouter from './routes/cart';
import favoritesRouter from './routes/favorites';
import paymentRouter from './routes/payment';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'sagas_jwt_secret_key_2025_omnichannel';

// Chave interna de API para operações administrativas do ERP
const ERP_API_KEY = process.env.ERP_INTERNAL_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';
const ALLOWED_API_KEYS = new Set([
  ERP_API_KEY,
  'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c',
  'sagas_erp_prod_e8d7c6b5a49382710f1e2d3c4b5a69788796a5b4c3d2e1f0123456789abcdef0',
]);

// ============================================================================
// 1. SEGURANÇA: HEADERS HTTP & CORS RESTRITO (C4)
// ============================================================================
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

const allowedOrigins = [
  'https://sagas.moda',
  'https://www.sagas.moda',
  'https://erp.sagas.moda',
  'https://erpsagas.onrender.com',
  'https://erp-sagas.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.sagas.moda') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origem não autorizada pelo CORS: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug', 'x-api-key'],
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// ============================================================================
// 2. RATE LIMITING POR IP EM MEMÓRIA (300 requisições / 15 minutos)
// ============================================================================
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'TooManyRequests',
      message: 'Limite de requisições excedido para este IP. Tente novamente em 15 minutos.',
    });
  }
  next();
});

// ============================================================================
// 3. MIDDLEWARE DE AUTENTICAÇÃO POR API KEY OU JWT ADMIN PARA ROTAS SENSÍVEIS
// ============================================================================
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const providedKey = req.headers['x-api-key'] || req.query.apiKey;
  if (typeof providedKey === 'string' && ALLOWED_API_KEYS.has(providedKey)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (ALLOWED_API_KEYS.has(token)) {
      return next();
    }
    try {
      jwt.verify(token, JWT_SECRET);
      return next();
    } catch {
      // Continua para resposta 401 abaixo
    }
  }

  return res.status(401).json({
    success: false,
    error: 'UnauthorizedError',
    message: 'Chave de API (x-api-key) ou Token JWT ausente ou inválido para esta operação administrativa.',
  });
}

// ============================================================================
// 4. LOG DE AUDITORIA DE REQUISIÇÕES
// ============================================================================
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================================
// 5. HEALTHCHECK
// ============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'sagas.moda ERP Omnichannel API',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// 6. PROTEÇÃO DE ESCRITA EM PRODUTOS E ESTOQUE (C4)
// ============================================================================
app.post('/api/products', requireApiKey);
app.put('/api/products/:id', requireApiKey);
app.patch('/api/products/:id/stock', requireApiKey);
app.delete('/api/products/:id', requireApiKey);
app.post('/api/stock/adjust', requireApiKey);
app.post('/api/orders/expire-pending', requireApiKey);

// ============================================================================
// 7. REGISTRO DE ROTAS DA API
// ============================================================================
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/combos', combosRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/cart', cartRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/payment', paymentRouter);

// ============================================================================
// 8. TRATAMENTO PADRONIZADO DE ERROS (400, 401, 404, 409, 500)
// ============================================================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NotFoundError',
    message: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || 'Erro interno no servidor ERP.',
  });
});

// Inicializa servidor apenas se não estiver em ambiente de teste unitário
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ERP API rodando em http://localhost:${PORT}`);
  });
}

export default app;
