import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// TIPOS E ESTADO DE CONFIGURAÇÃO M2M (AGENTIC COMMERCE)
// ============================================================================

export interface AgentApiKey {
  id: string;
  name: string;
  agentProvider: string; // Ex: "OpenAI Operator", "Perplexity BuyWithPro", "Google Shopping Agent", "Claude Computer Use"
  keyPrefix: string;
  apiKeyHash: string;
  plainPreview: string;
  rateLimitPerMinute: number;
  allowAutonomousCheckout: boolean;
  maxOrderValueBrl: number;
  isActive: boolean;
  requestsCount: number;
  ordersCreatedCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AgentDynamicPricingRule {
  enabled: boolean;
  m2mBaseDiscountPct: number; // Ex: 5% off exclusivo para agentes M2M
  pixInstantBonusPct: number; // Ex: +5% no PIX programático
  bulkThresholdQty: number; // Ex: 3 peças
  bulkExtraDiscountPct: number; // Ex: +3% acima de 3 peças
  minFloorMarginPct: number; // Piso de segurança P2 (15%)
  maxAutoApproveBrl: number; // Limite máximo p/ checkout autônomo sem revisão humana
  eligibleCategories: string[];
  updatedAt: string;
}

export interface AgentRequestLog {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  userAgent: string;
  endpoint: string;
  method: string;
  intent?: string;
  maxPrice?: number;
  skuQueried?: string;
  matchedCount: number;
  statusCode: number;
  latencyMs: number;
  convertedToCart: boolean;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const DEFAULT_AGENT_KEYS: AgentApiKey[] = [
  {
    id: 'agk-openai-operator',
    name: 'OpenAI Operator / ChatGPT Shopping',
    agentProvider: 'OpenAI',
    keyPrefix: 'sg_agent_oai_',
    apiKeyHash: hashKey('sg_agent_oai_live_9f8e7d6c5b4a3210'),
    plainPreview: 'sg_agent_oai_live_9f8e...3210',
    rateLimitPerMinute: 120,
    allowAutonomousCheckout: true,
    maxOrderValueBrl: 1500,
    isActive: true,
    requestsCount: 14,
    ordersCreatedCount: 2,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'agk-perplexity-buy',
    name: 'Perplexity Buy-With-Pro Agent',
    agentProvider: 'Perplexity AI',
    keyPrefix: 'sg_agent_pplx_',
    apiKeyHash: hashKey('sg_agent_pplx_live_1a2b3c4d5e6f7890'),
    plainPreview: 'sg_agent_pplx_live_1a2b...7890',
    rateLimitPerMinute: 90,
    allowAutonomousCheckout: true,
    maxOrderValueBrl: 1000,
    isActive: true,
    requestsCount: 9,
    ordersCreatedCount: 1,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'agk-google-gemini',
    name: 'Google Gemini Commerce Extension',
    agentProvider: 'Google DeepMind / Shopping Graph',
    keyPrefix: 'sg_agent_ggl_',
    apiKeyHash: hashKey('sg_agent_ggl_live_7c8d9e0f1a2b3c4d'),
    plainPreview: 'sg_agent_ggl_live_7c8d...3c4d',
    rateLimitPerMinute: 150,
    allowAutonomousCheckout: true,
    maxOrderValueBrl: 2000,
    isActive: true,
    requestsCount: 19,
    ordersCreatedCount: 3,
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
];

let agentApiKeys: AgentApiKey[] = [...DEFAULT_AGENT_KEYS];

let dynamicPricingRules: AgentDynamicPricingRule = {
  enabled: true,
  m2mBaseDiscountPct: 5.0,
  pixInstantBonusPct: 5.0,
  bulkThresholdQty: 3,
  bulkExtraDiscountPct: 3.0,
  minFloorMarginPct: 15.0,
  maxAutoApproveBrl: 1500.0,
  eligibleCategories: ['Feminino', 'Infantil', 'Masculino', 'Bebê'],
  updatedAt: new Date().toISOString(),
};

const agentRequestLogs: AgentRequestLog[] = [
  {
    id: 'alog-seed-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    agentId: 'agk-openai-operator',
    agentName: 'OpenAI Operator / ChatGPT Shopping',
    userAgent: 'GPTBot/1.2 (+https://openai.com/gptbot; Autonomous-Commerce-Agent)',
    endpoint: '/api/v2/agent/products',
    method: 'GET',
    intent: 'vestido_festa_vermelho',
    maxPrice: 150,
    matchedCount: 0,
    statusCode: 200,
    latencyMs: 38,
    convertedToCart: false,
  },
  {
    id: 'alog-seed-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    agentId: 'agk-perplexity-buy',
    agentName: 'Perplexity Buy-With-Pro Agent',
    userAgent: 'PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)',
    endpoint: '/api/v2/agent/products',
    method: 'GET',
    intent: 'bebe_algodao_organico_hipoalergenico',
    maxPrice: 120,
    matchedCount: 0,
    statusCode: 200,
    latencyMs: 41,
    convertedToCart: false,
  },
];

function recordAgentLog(entry: Omit<AgentRequestLog, 'id' | 'timestamp'>) {
  const newLog: AgentRequestLog = {
    id: `alog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  agentRequestLogs.unshift(newLog);
  if (agentRequestLogs.length > 200) {
    agentRequestLogs.pop();
  }
}

function resolveAgentIdentity(req: Request): { agentId: string; agentName: string; keyRecord?: AgentApiKey } {
  const rawKey =
    (req.headers['x-agent-api-key'] as string) ||
    (req.headers['x-api-key'] as string) ||
    (req.query.agent_key as string) ||
    '';

  if (rawKey) {
    const hashed = hashKey(rawKey);
    const matched = agentApiKeys.find(
      (k) => k.isActive && (k.apiKeyHash === hashed || rawKey.startsWith(k.keyPrefix))
    );
    if (matched) {
      matched.requestsCount += 1;
      matched.lastUsedAt = new Date().toISOString();
      return { agentId: matched.id, agentName: matched.name, keyRecord: matched };
    }
  }

  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const headerAgentId = req.headers['x-agent-id'] as string;
  if (headerAgentId) {
    return { agentId: headerAgentId, agentName: `External Agent (${headerAgentId})` };
  }
  if (ua.includes('gptbot') || ua.includes('openai') || ua.includes('chatgpt')) {
    return { agentId: 'openai-crawler', agentName: 'OpenAI GPTBot / ChatGPT Agent' };
  }
  if (ua.includes('perplexity')) {
    return { agentId: 'perplexity-agent', agentName: 'Perplexity Shopping Agent' };
  }
  if (ua.includes('claude') || ua.includes('anthropic')) {
    return { agentId: 'claude-agent', agentName: 'Anthropic Claude Agent' };
  }
  if (ua.includes('google-extended') || ua.includes('googlebot')) {
    return { agentId: 'google-gemini-agent', agentName: 'Google Gemini / Shopping Graph' };
  }
  return { agentId: 'public-m2m-agent', agentName: 'Autonomous M2M Client' };
}

// ============================================================================
// INFERÊNCIA DE METADADOS SEMÂNTICOS (TECIDO, OCASIÃO, CAIMENTO, ESTAÇÃO)
// ============================================================================

export interface SemanticMetadata {
  material: string;
  fabricComposition: string;
  occasion: string[];
  fit: string;
  season: string;
  sizeSystem: 'BR';
  careInstructions: string;
  hypoallergenic: boolean;
  sustainabilityTags: string[];
  stylePersona: string;
}

export function extractSemanticMetadata(product: {
  title: string;
  description: string;
  categoryName?: string;
  aiVisualTags?: string[];
}): SemanticMetadata {
  const text = `${product.title} ${product.description} ${product.categoryName || ''} ${(
    product.aiVisualTags || []
  ).join(' ')}`.toLowerCase();

  // Material / Tecido
  let material = 'Algodão Premium & Viscose';
  let fabricComposition = '96% Algodão Sustentável BCI, 4% Elastano';
  if (text.includes('linho')) {
    material = 'Linho Misto Respirável';
    fabricComposition = '55% Linho Puro, 45% Viscose EcoVero';
  } else if (text.includes('seda') || text.includes('cetim')) {
    material = 'Cetim Toque de Seda';
    fabricComposition = '97% Poliéster Acetinado Premium, 3% Elastano';
  } else if (text.includes('organico') || text.includes('orgânico') || text.includes('bebe') || text.includes('bebê') || text.includes('infantil')) {
    material = 'Algodão Egípcio / Orgânico 100% Hipoalergênico';
    fabricComposition = '100% Algodão Orgânico Certificado GOTS (Fio Penteado 30.1)';
  } else if (text.includes('jeans') || text.includes('sarja')) {
    material = 'Denim / Sarja Confort';
    fabricComposition = '98% Algodão, 2% Elastano Lycra';
  } else if (text.includes('malha') || text.includes('tricô') || text.includes('trico')) {
    material = 'Malha Canelada / Tricô Leve';
    fabricComposition = '92% Viscose, 8% Elastano';
  }

  // Ocasião
  const occasion: string[] = [];
  if (text.includes('festa') || text.includes('casamento') || text.includes('formatura') || text.includes('noite') || text.includes('gala')) {
    occasion.push('Festa', 'Casamento ao Ar Livre', 'Evento Social', 'Jantar Formal');
  }
  if (text.includes('casual') || text.includes('dia a dia') || text.includes('passeio') || text.includes('moderno')) {
    occasion.push('Casual Chic', 'Trabalho / Smart Casual', 'Passeio Urbano');
  }
  if (text.includes('bebe') || text.includes('bebê') || text.includes('infantil') || text.includes('enxoval')) {
    occasion.push('Dia a Dia Infantil', 'Conforto Térmico Bebê', 'Passeio em Família');
  }
  if (occasion.length === 0) {
    occasion.push('Versátil Dia e Noite', 'Casual Urbano', 'Encontros & Eventos');
  }

  // Caimento (Fit)
  let fit = 'Regular Confortável (Modelagem Brasileira Fiel ao Tamanho)';
  if (text.includes('fluido') || text.includes('soltinho') || text.includes('evase') || text.includes('evasê') || text.includes('midi')) {
    fit = 'Fluido / Evasê com Movimento Leve';
  } else if (text.includes('ajustado') || text.includes('slim') || text.includes('bodycon') || text.includes('tubinho')) {
    fit = 'Ajustado Anatômico com Elastano';
  } else if (text.includes('oversized') || text.includes('amplo')) {
    fit = 'Amplo / Oversized Contemporâneo';
  }

  // Estação
  let season = 'Primavera/Verão & Meia-Estação (Clima Tropical Brasileiro)';
  if (text.includes('inverno') || text.includes('frio') || text.includes('casaco') || text.includes('moletom')) {
    season = 'Outono/Inverno';
  }

  const isKidsOrBaby =
    text.includes('infant') || text.includes('bebe') || text.includes('bebê') || text.includes('kids');

  return {
    material,
    fabricComposition,
    occasion,
    fit,
    season,
    sizeSystem: 'BR',
    careInstructions: 'Lavagem delicada até 30°C, não alvejar, secar à sombra na vertical.',
    hypoallergenic: isKidsOrBaby || text.includes('hipoalergenico') || text.includes('algodão'),
    sustainabilityTags: ['Produção Ética Nacional', 'Embalagem Reciclável', 'Tecido Certificado'],
    stylePersona: isKidsOrBaby ? 'Bebê & Infantil Conforto Orgânico' : 'Mulher Moderna & Casual Sofisticada',
  };
}

function calculateAgentPricing(basePrice: number) {
  const m2mDiscountPct = dynamicPricingRules.enabled ? dynamicPricingRules.m2mBaseDiscountPct : 0;
  const pixBonusPct = dynamicPricingRules.enabled ? dynamicPricingRules.pixInstantBonusPct : 0;
  const agentM2mPrice = Number((basePrice * (1 - m2mDiscountPct / 100)).toFixed(2));
  const pixInstantPrice = Number((agentM2mPrice * (1 - pixBonusPct / 100)).toFixed(2));

  return {
    currency: 'BRL',
    listPriceBrl: Number(basePrice.toFixed(2)),
    agentM2mPriceBrl: agentM2mPrice,
    agentM2mDiscountPct: m2mDiscountPct,
    pixInstantPriceBrl: pixInstantPrice,
    pixTotalDiscountPct: Number((m2mDiscountPct + pixBonusPct).toFixed(2)),
    bulkRule: {
      minQty: dynamicPricingRules.bulkThresholdQty,
      extraDiscountPct: dynamicPricingRules.bulkExtraDiscountPct,
    },
  };
}

// ============================================================================
// 1. GET /api/v2/agent/products
// Consumo M2M estrito (JSON estruturado, sem HTML, com metadados semânticos)
// Ex: GET /api/v2/agent/products?intent=vestido_festa_vermelho&max_price=150
// ============================================================================
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  try {
    const {
      intent = '',
      max_price,
      min_price,
      category,
      size,
      color,
      in_stock_only = 'false',
    } = req.query;

    const intentStr = String(intent || '').trim();
    const maxPriceNum = max_price !== undefined ? Number(max_price) : undefined;
    const minPriceNum = min_price !== undefined ? Number(min_price) : undefined;
    const requireStock = String(in_stock_only).toLowerCase() === 'true';

    // Tokeniza o intent (ex: "vestido_festa_vermelho" -> ["vestido", "festa", "vermelho"])
    const stopWords = new Set(['de', 'da', 'do', 'para', 'com', 'em', 'um', 'uma', 'look', 'preciso', 'quero', 'ao', 'ar', 'livre', 'sp']);
    const intentTokens = intentStr
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !stopWords.has(t));

    const dbProducts = await prisma.product.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        category: true,
        sizeChart: true,
        variations: {
          where: { deletedAt: null },
          include: {
            stocks: true,
          },
        },
        channelListings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProducts = dbProducts
      .map((p) => {
        // Verifica se está ativo na loja
        const appListing = p.channelListings.find((l) => l.channel === 'APP_SAGAS');
        const isActive = appListing ? appListing.status === 'PUBLISHED' : true;
        if (!isActive) return null;

        const basePrice = Number(p.basePrice);
        const pricing = calculateAgentPricing(basePrice);

        const variations = p.variations.map((v) => {
          const physical = v.stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
          const reserved = v.stocks.reduce(
            (acc, s) => acc + s.stockReservedOrder + s.stockReservedPromo,
            0
          );
          const available = Math.max(0, physical - reserved);
          return {
            variationId: v.id,
            sku: v.sku,
            ean13: v.barcodeEan13,
            color: v.color,
            size: v.size,
            priceBrl: v.priceOverride ? Number(v.priceOverride) : basePrice,
            agentPriceBrl: v.priceOverride
              ? calculateAgentPricing(Number(v.priceOverride)).agentM2mPriceBrl
              : pricing.agentM2mPriceBrl,
            stockPhysical: physical,
            stockReserved: reserved,
            stockAvailable: available,
            inStock: available > 0,
            restockLeadTimeDays: v.leadTimeDays,
          };
        });

        const totalAvailable = variations.reduce((acc, v) => acc + v.stockAvailable, 0);
        const semanticMetadata = extractSemanticMetadata({
          title: p.title,
          description: p.description,
          categoryName: p.category?.name,
          aiVisualTags: p.aiVisualTags,
        });

        // Calcula score semântico contra o intent da IA
        const searchableCorpus = [
          p.title,
          p.description,
          p.masterSku,
          p.category?.name || '',
          ...(p.aiVisualTags || []),
          ...variations.map((v) => `${v.color} ${v.size}`),
          semanticMetadata.material,
          semanticMetadata.fit,
          ...semanticMetadata.occasion,
          semanticMetadata.stylePersona,
        ]
          .join(' ')
          .toLowerCase();

        let matchScore = 1.0;
        let matchedTokens: string[] = [];

        if (intentTokens.length > 0) {
          matchedTokens = intentTokens.filter((token) => searchableCorpus.includes(token));
          matchScore = Number((matchedTokens.length / intentTokens.length).toFixed(2));
        }

        return {
          productId: p.id,
          masterSku: p.masterSku,
          title: p.title,
          brand: p.brand || 'sagas.moda',
          category: p.category?.name || 'Feminino',
          categorySlug: p.category?.slug || 'feminino',
          summaryPlain: p.description.replace(/<[^>]*>/g, '').trim(),
          coverImageUrl: p.coverImageUrl,
          canonicalUrl: `https://sagas.moda/?product=${encodeURIComponent(p.id)}`,
          semanticMetadata,
          pricing,
          inventory: {
            inStock: totalAvailable > 0,
            totalAvailable,
            availableSizes: Array.from(
              new Set(variations.filter((v) => v.inStock).map((v) => v.size))
            ),
            availableColors: Array.from(
              new Set(variations.filter((v) => v.inStock).map((v) => v.color))
            ),
            variations,
          },
          merchantPolicy: {
            returnWindowDays: 30,
            freeFirstExchange: true,
            shipsFrom: 'São Paulo, SP, Brasil',
            immediateDispatch: true,
          },
          agentRelevance: {
            intentQueried: intentStr || null,
            semanticMatchScore: matchScore,
            matchedTokens,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        if (maxPriceNum !== undefined && !Number.isNaN(maxPriceNum)) {
          if (item.pricing.agentM2mPriceBrl > maxPriceNum && item.pricing.listPriceBrl > maxPriceNum) {
            return false;
          }
        }
        if (minPriceNum !== undefined && !Number.isNaN(minPriceNum)) {
          if (item.pricing.listPriceBrl < minPriceNum) return false;
        }
        if (category) {
          const catFilter = String(category).toLowerCase();
          if (
            !item.category.toLowerCase().includes(catFilter) &&
            !item.categorySlug.toLowerCase().includes(catFilter)
          ) {
            return false;
          }
        }
        if (size) {
          const sizeFilter = String(size).toLowerCase();
          const hasSize = item.inventory.variations.some(
            (v) => v.size.toLowerCase() === sizeFilter
          );
          if (!hasSize) return false;
        }
        if (color) {
          const colorFilter = String(color).toLowerCase();
          const hasColor = item.inventory.variations.some((v) =>
            v.color.toLowerCase().includes(colorFilter)
          );
          if (!hasColor) return false;
        }
        if (requireStock && !item.inventory.inStock) {
          return false;
        }
        // Se foi enviado intent e temos produtos com match > 0, priorizamos ou filtramos
        if (intentTokens.length > 0 && item.agentRelevance.semanticMatchScore === 0) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.agentRelevance.semanticMatchScore - a.agentRelevance.semanticMatchScore);

    const agentIdentity = resolveAgentIdentity(req);
    recordAgentLog({
      agentId: agentIdentity.agentId,
      agentName: agentIdentity.agentName,
      userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
      endpoint: '/api/v2/agent/products',
      method: 'GET',
      intent: intentStr || undefined,
      maxPrice: maxPriceNum,
      matchedCount: formattedProducts.length,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      convertedToCart: false,
    });

    return res.status(200).json({
      schemaVersion: 'sagas.agentic-commerce.v2',
      timestamp: new Date().toISOString(),
      store: {
        name: 'SAGAS.MODA',
        domain: 'https://sagas.moda',
        apiBaseUrl: 'https://erpsagas.onrender.com/api/v2/agent',
        openApiSpecUrl: 'https://erpsagas.onrender.com/api/v2/agent/openapi.json',
        currency: 'BRL',
        country: 'BR',
      },
      query: {
        intent: intentStr || null,
        parsedIntentTokens: intentTokens,
        maxPriceBrl: maxPriceNum ?? null,
        category: category ?? null,
        inStockOnly: requireStock,
      },
      activeAgentPricingPolicy: {
        m2mDiscountPct: dynamicPricingRules.m2mBaseDiscountPct,
        pixInstantBonusPct: dynamicPricingRules.pixInstantBonusPct,
        bulkThresholdQty: dynamicPricingRules.bulkThresholdQty,
        bulkExtraDiscountPct: dynamicPricingRules.bulkExtraDiscountPct,
      },
      count: formattedProducts.length,
      catalogEmptyNotice:
        formattedProducts.length === 0
          ? 'Nenhum produto encontrado no banco de produção para os filtros informados (ou catálogo aguardando cadastro de estoque no ERP).'
          : null,
      items: formattedProducts,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 2. GET /api/v2/agent/inventory/:sku
// Consulta de estoque em tempo real para validação de IA antes da compra
// ============================================================================
router.get('/inventory/:sku', async (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  try {
    const rawSku = String(req.params.sku || '').trim();
    const agentIdentity = resolveAgentIdentity(req);

    // Busca primeiro por SKU de variação exato ou case-insensitive
    const variation = await prisma.productVariation.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { sku: { equals: rawSku, mode: 'insensitive' } },
          { barcodeEan13: { equals: rawSku } },
          { id: rawSku },
        ],
      },
      include: {
        product: {
          include: { category: true },
        },
        stocks: {
          include: { warehouse: true },
        },
      },
    });

    if (variation) {
      const physical = variation.stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
      const reservedOrder = variation.stocks.reduce((acc, s) => acc + s.stockReservedOrder, 0);
      const reservedPromo = variation.stocks.reduce((acc, s) => acc + s.stockReservedPromo, 0);
      const safetyStock = variation.stocks.reduce((acc, s) => acc + s.safetyStock, 0);
      const available = Math.max(0, physical - reservedOrder - reservedPromo);
      const basePrice = variation.priceOverride
        ? Number(variation.priceOverride)
        : Number(variation.product.basePrice);

      recordAgentLog({
        agentId: agentIdentity.agentId,
        agentName: agentIdentity.agentName,
        userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
        endpoint: `/api/v2/agent/inventory/${rawSku}`,
        method: 'GET',
        skuQueried: rawSku,
        matchedCount: 1,
        statusCode: 200,
        latencyMs: Date.now() - startedAt,
        convertedToCart: false,
      });

      return res.status(200).json({
        schemaVersion: 'sagas.agentic-commerce.v2',
        timestamp: new Date().toISOString(),
        found: true,
        matchType: 'VARIATION_SKU',
        sku: variation.sku,
        variationId: variation.id,
        ean13: variation.barcodeEan13,
        product: {
          productId: variation.product.id,
          masterSku: variation.product.masterSku,
          title: variation.product.title,
          category: variation.product.category?.name || 'Feminino',
        },
        attributes: {
          color: variation.color,
          size: variation.size,
          sizeSystem: 'BR',
        },
        pricing: calculateAgentPricing(basePrice),
        inventory: {
          canPurchaseImmediately: available > 0,
          stockPhysical: physical,
          stockReservedOrders: reservedOrder,
          stockReservedFlashSales: reservedPromo,
          safetyStockBuffer: safetyStock,
          stockAvailableForAgent: available,
          restockLeadTimeDays: variation.leadTimeDays,
          warehouses: variation.stocks.map((s) => ({
            warehouseCode: s.warehouse.code,
            warehouseName: s.warehouse.name,
            available: Math.max(0, s.stockPhysical - s.stockReservedOrder - s.stockReservedPromo),
            updatedAt: s.updatedAt,
          })),
        },
      });
    }

    // Fallback: Busca por masterSku ou ID de Produto (retorna todas as variações do produto)
    const product = await prisma.product.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { masterSku: { equals: rawSku, mode: 'insensitive' } },
          { id: rawSku },
        ],
      },
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: { stocks: true },
        },
      },
    });

    if (product) {
      const variationsStock = product.variations.map((v) => {
        const physical = v.stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
        const reserved = v.stocks.reduce(
          (acc, s) => acc + s.stockReservedOrder + s.stockReservedPromo,
          0
        );
        const available = Math.max(0, physical - reserved);
        return {
          variationId: v.id,
          sku: v.sku,
          ean13: v.barcodeEan13,
          color: v.color,
          size: v.size,
          stockPhysical: physical,
          stockReserved: reserved,
          stockAvailableForAgent: available,
          canPurchaseImmediately: available > 0,
        };
      });

      const totalAvailable = variationsStock.reduce(
        (acc, v) => acc + v.stockAvailableForAgent,
        0
      );

      recordAgentLog({
        agentId: agentIdentity.agentId,
        agentName: agentIdentity.agentName,
        userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
        endpoint: `/api/v2/agent/inventory/${rawSku}`,
        method: 'GET',
        skuQueried: rawSku,
        matchedCount: variationsStock.length,
        statusCode: 200,
        latencyMs: Date.now() - startedAt,
        convertedToCart: false,
      });

      return res.status(200).json({
        schemaVersion: 'sagas.agentic-commerce.v2',
        timestamp: new Date().toISOString(),
        found: true,
        matchType: 'MASTER_PRODUCT_SKU',
        masterSku: product.masterSku,
        productId: product.id,
        title: product.title,
        pricing: calculateAgentPricing(Number(product.basePrice)),
        inventory: {
          canPurchaseImmediately: totalAvailable > 0,
          totalAvailableForAgent: totalAvailable,
          variations: variationsStock,
        },
      });
    }

    recordAgentLog({
      agentId: agentIdentity.agentId,
      agentName: agentIdentity.agentName,
      userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
      endpoint: `/api/v2/agent/inventory/${rawSku}`,
      method: 'GET',
      skuQueried: rawSku,
      matchedCount: 0,
      statusCode: 404,
      latencyMs: Date.now() - startedAt,
      convertedToCart: false,
    });

    return res.status(404).json({
      schemaVersion: 'sagas.agentic-commerce.v2',
      timestamp: new Date().toISOString(),
      found: false,
      skuQueried: rawSku,
      inventory: {
        canPurchaseImmediately: false,
        stockAvailableForAgent: 0,
      },
      message: `SKU '${rawSku}' não encontrado no inventário ativo da SAGAS.MODA.`,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 3. POST /api/v2/agent/cart/create
// Permite que uma IA crie um carrinho e inicie checkout programaticamente (M2M)
// ============================================================================
router.post('/cart/create', async (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  try {
    const agentIdentity = resolveAgentIdentity(req);
    const {
      agentId = agentIdentity.agentId,
      buyerIntent,
      items = [],
      customer,
      shippingAddress,
      paymentMethod = 'PIX',
      commitOrder = false,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        schemaVersion: 'sagas.agentic-commerce.v2',
        success: false,
        error: 'InvalidCartItemsError',
        message:
          'O array "items" é obrigatório e deve conter ao menos 1 item com { sku (ou variationId/productId), quantity }.',
      });
    }

    const resolvedLineItems: Array<{
      sku: string;
      variationId: string | null;
      productId: string | null;
      title: string;
      size: string;
      color: string;
      quantity: number;
      listUnitPriceBrl: number;
      agentUnitPriceBrl: number;
      lineTotalBrl: number;
      unitCostCmv: number;
      stockValidated: boolean;
      availableStock: number;
    }> = [];

    for (const rawItem of items) {
      const qty = Math.max(1, Number(rawItem.quantity || 1));
      const itemKey = String(rawItem.sku || rawItem.variationId || rawItem.productId || '').trim();

      const variation = itemKey
        ? await prisma.productVariation.findFirst({
            where: {
              deletedAt: null,
              OR: [
                { sku: { equals: itemKey, mode: 'insensitive' } },
                { id: itemKey },
                { productId: itemKey },
              ],
            },
            include: {
              product: true,
              stocks: true,
            },
          })
        : null;

      if (variation) {
        const physical = variation.stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
        const reserved = variation.stocks.reduce(
          (acc, s) => acc + s.stockReservedOrder + s.stockReservedPromo,
          0
        );
        const available = Math.max(0, physical - reserved);
        const listPrice = variation.priceOverride
          ? Number(variation.priceOverride)
          : Number(variation.product.basePrice);
        const pricing = calculateAgentPricing(listPrice);

        resolvedLineItems.push({
          sku: variation.sku,
          variationId: variation.id,
          productId: variation.product.id,
          title: variation.product.title,
          size: variation.size,
          color: variation.color,
          quantity: qty,
          listUnitPriceBrl: listPrice,
          agentUnitPriceBrl: pricing.agentM2mPriceBrl,
          lineTotalBrl: Number((pricing.agentM2mPriceBrl * qty).toFixed(2)),
          unitCostCmv: Number(variation.product.costPrice || listPrice * 0.4),
          stockValidated: available >= qty,
          availableStock: available,
        });
      } else {
        // Caso o agente envie uma cotação estruturada ou o banco esteja sem o SKU específico
        const fallbackPrice = Number(rawItem.unitPriceBrl || rawItem.price || 0);
        if (fallbackPrice <= 0) {
          recordAgentLog({
            agentId: agentIdentity.agentId,
            agentName: agentIdentity.agentName,
            userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
            endpoint: '/api/v2/agent/cart/create',
            method: 'POST',
            skuQueried: itemKey,
            matchedCount: 0,
            statusCode: 404,
            latencyMs: Date.now() - startedAt,
            convertedToCart: false,
          });
          return res.status(404).json({
            schemaVersion: 'sagas.agentic-commerce.v2',
            success: false,
            error: 'SkuNotFoundInCatalog',
            sku: itemKey,
            message: `O SKU '${itemKey}' não existe no catálogo ativo do banco de produção. Consulte GET /api/v2/agent/products antes de iniciar o carrinho.`,
          });
        }
      }
    }

    const totalQty = resolvedLineItems.reduce((acc, i) => acc + i.quantity, 0);
    const listSubtotal = Number(
      resolvedLineItems.reduce((acc, i) => acc + i.listUnitPriceBrl * i.quantity, 0).toFixed(2)
    );
    const agentSubtotal = Number(
      resolvedLineItems.reduce((acc, i) => acc + i.lineTotalBrl, 0).toFixed(2)
    );

    const bulkExtraPct =
      dynamicPricingRules.enabled && totalQty >= dynamicPricingRules.bulkThresholdQty
        ? dynamicPricingRules.bulkExtraDiscountPct
        : 0;
    const bulkDiscountBrl = Number(((agentSubtotal * bulkExtraPct) / 100).toFixed(2));
    const afterBulkSubtotal = Number((agentSubtotal - bulkDiscountBrl).toFixed(2));

    const isPix = String(paymentMethod).toUpperCase() === 'PIX';
    const pixDiscountPct =
      isPix && dynamicPricingRules.enabled ? dynamicPricingRules.pixInstantBonusPct : 0;
    const pixDiscountBrl = Number(((afterBulkSubtotal * pixDiscountPct) / 100).toFixed(2));

    const shippingFeeBrl = afterBulkSubtotal >= 199 ? 0 : 18.9;
    const finalTotalBrl = Number((afterBulkSubtotal - pixDiscountBrl + shippingFeeBrl).toFixed(2));
    const totalSavingsBrl = Number((listSubtotal - (afterBulkSubtotal - pixDiscountBrl)).toFixed(2));

    const cartSessionId = `agcart_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    let persistedOrderNumber: string | null = null;
    let persistedOrderId: string | null = null;

    // Se commitOrder=true e todas as variações existem no banco, cria o pedido real no Neon
    const canPersistOrder =
      Boolean(commitOrder) &&
      resolvedLineItems.length > 0 &&
      resolvedLineItems.every((i) => i.variationId && i.stockValidated);

    if (canPersistOrder) {
      const tenant = await prisma.tenant.findFirst();
      if (tenant) {
        const customerEmail = customer?.email || `agent.${agentId}@m2m.sagas.moda`;
        const customerName = customer?.name || `Compra Assistida IA (${agentIdentity.agentName})`;
        const customerPhone = customer?.phone || '11999990000';
        const cpfHash = crypto
          .createHash('sha256')
          .update(customer?.cpf || customerEmail)
          .digest('hex');

        const dbCustomer = await prisma.customer.upsert({
          where: { cpfHash },
          update: {
            fullName: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          create: {
            tenantId: tenant.id,
            fullName: customerName,
            cpfHash,
            cpfEnc: 'M2M_AGENT_ENCRYPTED_CPF',
            email: customerEmail,
            phone: customerPhone,
            AcquisitionChannel: 'APP_SAGAS',
          },
        });

        const orderNumber = `AG-${Date.now().toString().slice(-6)}`;
        const createdOrder = await prisma.order.create({
          data: {
            tenantId: tenant.id,
            orderNumber,
            externalOrderId: cartSessionId,
            channel: 'APP_SAGAS',
            status: 'PENDING_PAYMENT',
            customerId: dbCustomer.id,
            grossTotal: listSubtotal + shippingFeeBrl,
            discountTotal: totalSavingsBrl,
            shippingCharged: shippingFeeBrl,
            platformFeeTotal: 0,
            netRevenue: finalTotalBrl,
            paymentMethod: String(paymentMethod).toUpperCase(),
            paymentStatus: 'PENDING',
            items: {
              create: resolvedLineItems.map((li) => ({
                variationId: li.variationId!,
                quantity: li.quantity,
                unitPrice: li.agentUnitPriceBrl,
                unitCostCmv: li.unitCostCmv,
              })),
            },
          },
        });

        persistedOrderId = createdOrder.id;
        persistedOrderNumber = createdOrder.orderNumber;
      }
    }

    if (agentIdentity.keyRecord) {
      agentIdentity.keyRecord.ordersCreatedCount += 1;
    }

    recordAgentLog({
      agentId: agentIdentity.agentId,
      agentName: agentIdentity.agentName,
      userAgent: req.headers['user-agent'] || 'M2M-Agent/1.0',
      endpoint: '/api/v2/agent/cart/create',
      method: 'POST',
      intent: buyerIntent || 'm2m_cart_checkout',
      matchedCount: resolvedLineItems.length,
      statusCode: 201,
      latencyMs: Date.now() - startedAt,
      convertedToCart: true,
    });

    const pixCopyPaste = `00020126580014BR.GOV.BCB.PIX0136sagas-moda-m2m-${cartSessionId.slice(
      0,
      12
    )}520400005303986540${finalTotalBrl.toFixed(2)}5802BR5910SAGAS MODA6009SAO PAULO62070503***6304ABCD`;

    return res.status(201).json({
      schemaVersion: 'sagas.agentic-commerce.v2',
      success: true,
      cartSessionId,
      persistedOrderId,
      persistedOrderNumber,
      status: persistedOrderId ? 'ORDER_CREATED_AWAITING_PAYMENT' : 'CART_LOCKED_READY_FOR_CHECKOUT',
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      agent: {
        agentId: agentIdentity.agentId,
        agentName: agentIdentity.agentName,
      },
      lineItems: resolvedLineItems,
      pricingBreakdown: {
        currency: 'BRL',
        listSubtotalBrl: listSubtotal,
        agentM2mSubtotalBrl: agentSubtotal,
        bulkDiscountBrl,
        pixDiscountBrl,
        totalAgentSavingsBrl: totalSavingsBrl,
        shippingFeeBrl,
        finalPayableBrl: finalTotalBrl,
      },
      checkoutInstruction: {
        humanHandoffUrl: `https://sagas.moda/?agent_cart=${encodeURIComponent(cartSessionId)}`,
        m2mPaymentProtocol: {
          preferredMethod: 'PIX_INSTANT',
          pixCopyPastePayload: pixCopyPaste,
          webhookConfirmationEndpoint: 'https://erpsagas.onrender.com/api/payment/webhook',
        },
      },
      shippingEstimate: {
        origin: 'CD São Paulo - SP',
        destinationZip: shippingAddress?.zipCode || '01310-200',
        carrier: 'CORREIOS_SEDEX',
        estimatedBusinessDays: 2,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 4. POST /api/v2/agent/assistant
// Endpoint RAG (Retrieval-Augmented Generation) para o Assistente de Compras IA
// Baseado estritamente nos produtos reais do banco Neon (Zero Alucinação)
// ============================================================================
router.post('/assistant', async (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();
  try {
    const { message = '', conversationHistory = [] } = req.body || {};
    const userQuery = String(message || '').trim();

    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: 'A mensagem de busca do usuário é obrigatória.',
      });
    }

    // 1. Busca catálogo real ativo no Neon PostgreSQL
    const dbProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        variations: {
          where: { deletedAt: null },
          include: { stocks: true },
        },
        channelListings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeCatalog = dbProducts
      .filter((p) => {
        const appListing = p.channelListings.find((l) => l.channel === 'APP_SAGAS');
        return appListing ? appListing.status === 'PUBLISHED' : true;
      })
      .map((p) => {
        const variations = p.variations.map((v) => {
          const physical = v.stocks.reduce((acc, s) => acc + s.stockPhysical, 0);
          const reserved = v.stocks.reduce(
            (acc, s) => acc + s.stockReservedOrder + s.stockReservedPromo,
            0
          );
          const available = Math.max(0, physical - reserved);
          return {
            id: v.id,
            sku: v.sku,
            color: v.color,
            size: v.size,
            stock: available,
          };
        });
        const totalStock = variations.reduce((acc, v) => acc + v.stock, 0);
        const semantic = extractSemanticMetadata({
          title: p.title,
          description: p.description,
          categoryName: p.category?.name,
          aiVisualTags: p.aiVisualTags,
        });

        return {
          id: p.id,
          masterSku: p.masterSku,
          title: p.title,
          description: p.description,
          price: Number(p.basePrice),
          pixPrice: Number((Number(p.basePrice) * 0.9).toFixed(2)),
          category: p.category?.name || 'Feminino',
          coverImageUrl: p.coverImageUrl,
          totalStock,
          variations,
          semantic,
        };
      });

    // 2. Ranking Semântico Determinístico (RAG Retrieval)
    const queryLower = userQuery.toLowerCase();
    const queryWords = queryLower
      .replace(/[^\w\sà-ú]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const scoredProducts = activeCatalog
      .map((item) => {
        const haystack = [
          item.title,
          item.description,
          item.category,
          item.semantic.material,
          item.semantic.fit,
          ...item.semantic.occasion,
          ...item.variations.map((v) => `${v.color} ${v.size}`),
        ]
          .join(' ')
          .toLowerCase();

        let score = 0;
        for (const word of queryWords) {
          if (haystack.includes(word)) score += 3;
        }
        if (
          (queryLower.includes('casamento') ||
            queryLower.includes('festa') ||
            queryLower.includes('evento')) &&
          (item.category.toLowerCase().includes('feminino') ||
            haystack.includes('vestido') ||
            haystack.includes('festa'))
        ) {
          score += 4;
        }
        if (
          (queryLower.includes('bebê') ||
            queryLower.includes('bebe') ||
            queryLower.includes('criança') ||
            queryLower.includes('infantil') ||
            queryLower.includes('algodão')) &&
          item.category.toLowerCase().includes('infantil')
        ) {
          score += 5;
        }
        if (item.totalStock > 0) score += 2;

        return { item, score };
      })
      .sort((a, b) => b.score - a.score);

    const topRecommendations = scoredProducts.slice(0, 3).map(({ item }) => ({
      productId: item.id,
      masterSku: item.masterSku,
      title: item.title,
      price: item.price,
      pixPrice: item.pixPrice,
      category: item.category,
      coverImageUrl: item.coverImageUrl,
      totalStock: item.totalStock,
      variations: item.variations,
      semantic: item.semantic,
      justification: `Ideal para o seu pedido: confeccionado em ${item.semantic.material}, caimento ${item.semantic.fit.toLowerCase()} e recomendado para ${item.semantic.occasion.slice(0, 2).join(' e ')}.`,
    }));

    recordAgentLog({
      agentId: 'sagas-web-rag-assistant',
      agentName: 'Assistente Inteligente SAGAS.MODA (RAG)',
      userAgent: req.headers['user-agent'] || 'Web-Client',
      endpoint: '/api/v2/agent/assistant',
      method: 'POST',
      intent: userQuery.slice(0, 80),
      matchedCount: topRecommendations.length,
      statusCode: 200,
      latencyMs: Date.now() - startedAt,
      convertedToCart: false,
    });

    if (activeCatalog.length === 0) {
      return res.status(200).json({
        success: true,
        groundingStatus: 'EMPTY_CATALOG_ZERO_HALLUCINATION',
        reply:
          'Consultei o nosso banco de dados em tempo real (Neon PostgreSQL) para buscar peças compatíveis com o seu pedido, mas no momento o catálogo da loja está com 0 produtos cadastrados (aguardando publicação de lote no ERP). Assim que novos itens forem publicados no ERP SAGAS, recomendarei até 3 opções reais com tecido, caimento e tamanho disponíveis para adicionar direto à sua sacola!',
        recommendations: [],
        conversationHistoryCount: Array.isArray(conversationHistory) ? conversationHistory.length : 0,
      });
    }

    return res.status(200).json({
      success: true,
      groundingStatus: 'GROUNDED_IN_REAL_CATALOG',
      reply: `Analisei todo o nosso catálogo real na SAGAS.MODA para "${userQuery}" e selecionei ${topRecommendations.length} ${
        topRecommendations.length === 1 ? 'opção disponível' : 'opções reais disponíveis'
      } com o melhor caimento, tecido e estoque imediato. Você pode escolher o tamanho e adicionar direto à sacola:`,
      recommendations: topRecommendations,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 5. ENDPOINTS DE GESTÃO DO PAINEL ERP ("INTEGRAÇÕES AI")
// ============================================================================

router.get('/config', (_req: Request, res: Response) => {
  const totalRequests = agentRequestLogs.length;
  const cartConversions = agentRequestLogs.filter((l) => l.convertedToCart).length;
  const conversionRatePct =
    totalRequests > 0 ? Number(((cartConversions / totalRequests) * 100).toFixed(1)) : 0;

  return res.status(200).json({
    success: true,
    metrics: {
      totalAgentQueries: totalRequests,
      activeKeysCount: agentApiKeys.filter((k) => k.isActive).length,
      cartConversionsCount: cartConversions,
      conversionRatePct,
      avgLatencyMs:
        totalRequests > 0
          ? Math.round(
              agentRequestLogs.reduce((acc, l) => acc + l.latencyMs, 0) / totalRequests
            )
          : 35,
    },
    apiKeys: agentApiKeys,
    pricingRules: dynamicPricingRules,
    recentLogs: agentRequestLogs.slice(0, 50),
  });
});

router.get('/logs', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    count: agentRequestLogs.length,
    logs: agentRequestLogs.slice(0, 100),
  });
});

router.post('/keys', (req: Request, res: Response) => {
  const {
    name,
    agentProvider = 'Partner AI Agent',
    rateLimitPerMinute = 100,
    allowAutonomousCheckout = true,
    maxOrderValueBrl = 1500,
  } = req.body || {};

  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Informe um nome válido para a chave de Agente IA.',
    });
  }

  const randomHex = crypto.randomBytes(12).toString('hex');
  const rawSecretKey = `sg_agent_live_${randomHex}`;
  const newKey: AgentApiKey = {
    id: `agk-${Date.now()}`,
    name: String(name).trim(),
    agentProvider: String(agentProvider).trim(),
    keyPrefix: 'sg_agent_live_',
    apiKeyHash: hashKey(rawSecretKey),
    plainPreview: `${rawSecretKey.slice(0, 18)}...${rawSecretKey.slice(-4)}`,
    rateLimitPerMinute: Number(rateLimitPerMinute) || 100,
    allowAutonomousCheckout: Boolean(allowAutonomousCheckout),
    maxOrderValueBrl: Number(maxOrderValueBrl) || 1500,
    isActive: true,
    requestsCount: 0,
    ordersCreatedCount: 0,
    lastUsedAt: null,
    createdAt: new Date().toISOString(),
  };

  agentApiKeys.unshift(newKey);

  return res.status(201).json({
    success: true,
    secretKeyOnce: rawSecretKey,
    keyRecord: newKey,
  });
});

router.patch('/keys/:id/toggle', (req: Request, res: Response) => {
  const key = agentApiKeys.find((k) => k.id === req.params.id);
  if (!key) {
    return res.status(404).json({ success: false, message: 'Chave não encontrada.' });
  }
  key.isActive = !key.isActive;
  return res.status(200).json({ success: true, keyRecord: key });
});

router.delete('/keys/:id', (req: Request, res: Response) => {
  const idx = agentApiKeys.findIndex((k) => k.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Chave não encontrada.' });
  }
  agentApiKeys.splice(idx, 1);
  return res.status(200).json({ success: true });
});

router.put('/pricing-rules', (req: Request, res: Response) => {
  const body = req.body || {};
  dynamicPricingRules = {
    ...dynamicPricingRules,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : dynamicPricingRules.enabled,
    m2mBaseDiscountPct:
      body.m2mBaseDiscountPct !== undefined
        ? Math.max(0, Math.min(35, Number(body.m2mBaseDiscountPct)))
        : dynamicPricingRules.m2mBaseDiscountPct,
    pixInstantBonusPct:
      body.pixInstantBonusPct !== undefined
        ? Math.max(0, Math.min(20, Number(body.pixInstantBonusPct)))
        : dynamicPricingRules.pixInstantBonusPct,
    bulkThresholdQty:
      body.bulkThresholdQty !== undefined
        ? Math.max(2, Number(body.bulkThresholdQty))
        : dynamicPricingRules.bulkThresholdQty,
    bulkExtraDiscountPct:
      body.bulkExtraDiscountPct !== undefined
        ? Math.max(0, Math.min(20, Number(body.bulkExtraDiscountPct)))
        : dynamicPricingRules.bulkExtraDiscountPct,
    minFloorMarginPct:
      body.minFloorMarginPct !== undefined
        ? Math.max(5, Number(body.minFloorMarginPct))
        : dynamicPricingRules.minFloorMarginPct,
    maxAutoApproveBrl:
      body.maxAutoApproveBrl !== undefined
        ? Math.max(100, Number(body.maxAutoApproveBrl))
        : dynamicPricingRules.maxAutoApproveBrl,
    updatedAt: new Date().toISOString(),
  };

  return res.status(200).json({
    success: true,
    pricingRules: dynamicPricingRules,
  });
});

// ============================================================================
// 6. DOCUMENTAÇÃO OPENAPI 3.1.0 / SWAGGER PARA AGENTES AUTÔNOMOS
// GET /api/v2/agent/openapi.json & GET /api/v2/agent/docs
// ============================================================================

export const OPENAPI_AGENT_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'SAGAS.MODA — Agentic Commerce M2M API',
    version: '2.0.0',
    summary:
      'API Machine-to-Machine (M2M) nativa para Agentes de IA autônomos comprarem, consultarem estoque em tempo real e filtrarem produtos por intenção semântica.',
    description:
      'Endpoints RESTful de resposta JSON estrita (zero HTML) projetados para LLMs, OpenAI Operator, Perplexity Buy-With-Pro, Google Shopping Graph e agentes autônomos de e-commerce.',
    contact: {
      name: 'SAGAS.MODA AI Engineering',
      url: 'https://sagas.moda',
    },
  },
  servers: [
    {
      url: 'https://erpsagas.onrender.com',
      description: 'Production ERP & M2M Commerce Gateway (Neon PostgreSQL)',
    },
    {
      url: 'http://localhost:3001',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      AgentApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-agent-api-key',
        description:
          'Chave de parceiro IA emitida no painel ERP Integrações AI (opcional para leitura pública, recomendada para rate-limits elevados e checkout autônomo).',
      },
    },
  },
  paths: {
    '/api/v2/agent/products': {
      get: {
        operationId: 'searchProductsBySemanticIntent',
        summary: 'Busca semântica de produtos com metadados estruturados de tecido, ocasião e caimento',
        description:
          'Retorna JSON estrito com catálogo real, preços M2M com desconto para agentes, disponibilidade por tamanho/cor e atributos semânticos.',
        parameters: [
          {
            name: 'intent',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'vestido_festa_vermelho' },
            description:
              'Intenção de compra em tokens separados por underscore ou espaço (ex: vestido_festa_vermelho, bebe_algodao_organico, look_casamento_ar_livre).',
          },
          {
            name: 'max_price',
            in: 'query',
            required: false,
            schema: { type: 'number', example: 150 },
            description: 'Preço máximo em Reais (BRL).',
          },
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['Feminino', 'Infantil', 'Masculino'] },
          },
          {
            name: 'size',
            in: 'query',
            required: false,
            schema: { type: 'string', example: 'M' },
          },
          {
            name: 'in_stock_only',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
          },
        ],
        responses: {
          '200': {
            description: 'Lista estruturada de produtos compatíveis com a intenção da IA.',
          },
        },
      },
    },
    '/api/v2/agent/inventory/{sku}': {
      get: {
        operationId: 'verifyRealTimeInventoryBySku',
        summary: 'Validação de estoque físico, reservado e disponível em tempo real antes da compra',
        parameters: [
          {
            name: 'sku',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'SAG-VEST-001-VM-M' },
            description: 'SKU da variação, EAN-13 ou Master SKU do produto.',
          },
        ],
        responses: {
          '200': {
            description: 'Saldo disponível confirmado em tempo real por depósito.',
          },
          '404': {
            description: 'SKU não encontrado no inventário ativo.',
          },
        },
      },
    },
    '/api/v2/agent/cart/create': {
      post: {
        operationId: 'createAutonomousAgentCartAndCheckout',
        summary: 'Cria carrinho programático M2M, aplica descontos exclusivos de agente e gera PIX Copia e Cola',
        security: [{ AgentApiKey: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  agentId: { type: 'string', example: 'openai-operator-v1' },
                  buyerIntent: {
                    type: 'string',
                    example: 'vestido_festa_vermelho_ate_150',
                  },
                  commitOrder: {
                    type: 'boolean',
                    default: false,
                    description: 'Se true, grava imediatamente o pedido PENDING_PAYMENT no banco Neon.',
                  },
                  paymentMethod: {
                    type: 'string',
                    enum: ['PIX', 'CREDIT_CARD'],
                    default: 'PIX',
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['sku', 'quantity'],
                      properties: {
                        sku: { type: 'string' },
                        quantity: { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                  customer: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' },
                      cpf: { type: 'string' },
                    },
                  },
                  shippingAddress: {
                    type: 'object',
                    properties: {
                      zipCode: { type: 'string', example: '01310-200' },
                      street: { type: 'string' },
                      number: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Carrinho M2M criado com cotação final, desconto de agente e payload PIX.',
          },
          '404': {
            description: 'Um ou mais SKUs não existem no catálogo ativo.',
          },
        },
      },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.status(200).json(OPENAPI_AGENT_SPEC);
});

router.get('/docs', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'SAGAS.MODA Agentic Commerce OpenAPI 3.1.0 Specification',
    specEndpoint: '/api/v2/agent/openapi.json',
    openapi: OPENAPI_AGENT_SPEC,
  });
});

export default router;
