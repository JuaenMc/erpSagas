import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db';

// 1. Importação dos Routers da API no topo do arquivo
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import stockRouter from './routes/stock';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ERP_INTERNAL_API_KEY = process.env.ERP_INTERNAL_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';

// Reexportação do prisma client singleton para compatibilidade
export { prisma };

// A5: Configuração de CORS com origens explicitamente autorizadas
const allowedOrigins = [
  'http://localhost:3000',     // Loja / App Web
  'http://localhost:3001',     // Backend Local
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
      origin.endsWith('.run.app') ||
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

// A3: Middleware de validação de API Key para endpoints de escrita (POST, PUT, PATCH, DELETE)
// Exceto rotas públicas explicitamente isentas
export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const isWriteMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  
  if (isWriteMethod) {
    const apiKey = req.headers['x-erp-api-key'] || req.headers['X-ERP-API-KEY'];
    if (!apiKey || apiKey !== ERP_INTERNAL_API_KEY) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Acesso negado: header X-ERP-API-KEY ausente ou inválido.',
      });
    }
  }
  next();
}

// Aplicar requireApiKey em rotas de mutação da API
app.use('/api', (req, res, next) => {
  // Rotas que não exigem API Key (leituras públicas ou webhook)
  if (req.method === 'GET') {
    return next();
  }
  return requireApiKey(req, res, next);
});

// ============================================================================
// 1. ROTAS ESPECÍFICAS DA API (Registradas ANTES de qualquer rota genérica)
// ============================================================================
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stock', stockRouter);

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

// ============================================================================
// 2. HEALTH CHECK (Registrado DEPOIS das rotas específicas)
// ============================================================================
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
    return res.status(503).json({
      status: 'error',
      db: 'disconnected',
      latencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
      error: error.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

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
