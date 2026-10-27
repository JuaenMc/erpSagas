import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import {
  adminAuthMiddleware,
  verifyAdminAuth,
  generateAdminToken,
  ADMIN_COOKIE_NAME,
  ADMIN_PASSWORD,
  ERP_INTERNAL_API_KEY,
} from './admin-auth';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Inicialização do Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// A5: Configuração de CORS com origens explicitamente autorizadas
const allowedOrigins = [
  'http://localhost:3000',     // Loja / App Web
  'http://localhost:3001',     // Backend / Painel Admin Local
  'http://localhost:3002',     // Admin ERP Vite
  'https://sagas.moda',        // Loja SAGAS Produção
  'https://www.sagas.moda',
  'capacitor://localhost',     // App Mobile Android / iOS
  'https://localhost',         // App Mobile WebView Seguro
];

// Suporte para origens customizadas via variável de ambiente
if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(',').forEach(origin => {
    const trimmed = origin.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (como curl, mobile apps nativos, Postman ou server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.sagas.moda') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Origem CORS não autorizada: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-ERP-API-KEY'],
}));

app.use(express.json());

// A3: Rate limiter básico em memória para proteção de endpoints públicos
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 120;     // 120 requisições por minuto por IP

app.use((req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const clientLimit = rateLimitMap.get(ip);

  if (!clientLimit || now > clientLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    clientLimit.count++;
    if (clientLimit.count > RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'TooManyRequests',
        message: 'Limite de requisições excedido. Tente novamente em 1 minuto.',
      });
    }
  }
  next();
});

// A3: Middleware de validação de autenticação para endpoints de mutação da API
// Valida tanto via header X-ERP-API-KEY quanto via cookie httpOnly sagas_admin_token
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  
  if (isWriteMethod) {
    if (!verifyAdminAuth(req)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Acesso negado: autenticação necessária via X-ERP-API-KEY ou cookie de sessão de admin.',
      });
    }
  }
  next();
}

// Aplicar requireApiKey em rotas de mutação da API
app.use('/api', (req, res, next) => {
  // Rotas públicas que não exigem API Key (leituras públicas, autenticação do admin e healthcheck)
  if (
    req.method === 'GET' ||
    req.path === '/admin/login' ||
    req.path === '/admin/logout' ||
    req.path === '/health'
  ) {
    return next();
  }
  return requireApiKey(req, res, next);
});

/**
 * 1. Rota Raiz & Painel Administrativo Web
 * GET / -> Retorna o painel administrativo integrado (server/admin.html)
 * GET /admin -> Painel administrativo
 * GET /admin-login -> Formulário de login administrativo
 */
const adminHtmlPath = path.join(__dirname, 'admin.html');

app.get(['/', '/admin', '/admin-login'], (_req: Request, res: Response) => {
  return res.sendFile(adminHtmlPath);
});

/**
 * ROTAS /api/admin/*
 */

// POST /api/admin/login: Autentica com senha e define cookie httpOnly
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Senha de administrador incorreta.',
    });
  }

  const token = generateAdminToken();

  // Define cookie seguro httpOnly com 7 dias de validade
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  return res.status(200).json({
    success: true,
    message: 'Autenticado com sucesso no SAGAS ERP.',
    token,
    apiKey: ERP_INTERNAL_API_KEY,
  });
});

// POST /api/admin/logout: Limpa cookie httpOnly
app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return res.status(200).json({
    success: true,
    message: 'Sessão administrativa encerrada com sucesso.',
  });
});

// GET /api/admin/verify: Verifica status de autenticação da sessão atual
app.get('/api/admin/verify', (req: Request, res: Response) => {
  const isAuthenticated = verifyAdminAuth(req);
  return res.status(isAuthenticated ? 200 : 401).json({
    success: isAuthenticated,
    authenticated: isAuthenticated,
  });
});

// GET /api/admin/stats: Estatísticas consolidadas para o dashboard (produtos, pedidos, receita)
app.get('/api/admin/stats', adminAuthMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalProducts, activeProducts, orders, stocks] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.order.findMany({ select: { grossTotal: true } }),
      prisma.warehouseStock.findMany({
        select: {
          stockPhysical: true,
          variation: { select: { product: { select: { basePrice: true } } } },
        },
      }),
    ]);

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, ord) => sum + Number(ord.grossTotal || 0), 0);
    const lowStockCount = stocks.filter(s => s.stockPhysical <= 10).length;
    const totalInventoryValue = stocks.reduce((sum, s) => {
      const price = Number(s.variation?.product?.basePrice || 0);
      return sum + (price * s.stockPhysical);
    }, 0);

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        totalOrders,
        totalRevenue,
        lowStockCount,
        totalInventoryValue,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 2. GET /api/health
 * Retorna status da API e validação de query real no banco Neon PostgreSQL
 */
app.get('/api/health', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    // Teste real de consulta no banco
    const result: any[] = await prisma.$queryRawUnsafe('SELECT 1 as alive;');
    const latencyMs = Date.now() - startTime;

    if (!result || result.length === 0) {
      throw new Error('Falha na resposta do banco');
    }

    return res.status(200).json({
      status: 'ok',
      db: 'connected',
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      service: 'SAGAS ERP Backend API',
      version: '1.0.0',
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('❌ Erro no Health Check do Banco:', error);
    return res.status(200).json({
      status: 'ok',
      db: 'disconnected',
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
      service: 'SAGAS ERP Backend API',
      version: '1.0.0',
    });
  }
});

/**
 * GET /api/categories
 * Retorna lista de categorias cadastradas para filtros e seleção
 */
app.get('/api/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

import productsRouter from './routes/products';
import stockRouter from './routes/stock';
import ordersRouter from './routes/orders';

// Endpoint básico para inspeção dos canais cadastrados
app.get('/api/channels', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await prisma.channelFeeConfig.findMany({
      where: { isActive: true },
      orderBy: { channel: 'asc' },
    });
    return res.status(200).json({ data: channels });
  } catch (err) {
    next(err);
  }
});

// Registro dos módulos de rotas
app.use('/api/products', productsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/orders', ordersRouter);

// Middleware Global de Tratamento de Erros em JSON
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Ocorreu um erro interno no servidor ERP.',
  });
});

// Inicialização do Servidor Express
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SAGAS ERP Backend API rodando em http://localhost:${PORT}`);
  console.log(`🔒 Origens CORS permitidas: ${allowedOrigins.join(', ')}`);
});

// Encerramento Gracioso
process.on('SIGTERM', async () => {
  console.log('Fechando servidor HTTP e desconectando Prisma...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
