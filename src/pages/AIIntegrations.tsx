import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Key,
  Activity,
  Percent,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  FileJson,
  ShieldCheck,
  Terminal,
  Sparkles,
  Play,
  ExternalLink,
} from 'lucide-react';
import apiClient from '../services/apiClient';

interface AgentApiKey {
  id: string;
  name: string;
  agentProvider: string;
  keyPrefix: string;
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

interface AgentDynamicPricingRule {
  enabled: boolean;
  m2mBaseDiscountPct: number;
  pixInstantBonusPct: number;
  bulkThresholdQty: number;
  bulkExtraDiscountPct: number;
  minFloorMarginPct: number;
  maxAutoApproveBrl: number;
  eligibleCategories: string[];
  updatedAt: string;
}

interface AgentRequestLog {
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

export const AIIntegrations: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<AgentApiKey[]>([]);
  const [pricingRules, setPricingRules] = useState<AgentDynamicPricingRule>({
    enabled: true,
    m2mBaseDiscountPct: 5,
    pixInstantBonusPct: 5,
    bulkThresholdQty: 3,
    bulkExtraDiscountPct: 3,
    minFloorMarginPct: 15,
    maxAutoApproveBrl: 1500,
    eligibleCategories: ['Feminino', 'Infantil', 'Masculino'],
    updatedAt: new Date().toISOString(),
  });
  const [logs, setLogs] = useState<AgentRequestLog[]>([]);
  const [metrics, setMetrics] = useState({
    totalAgentQueries: 0,
    activeKeysCount: 3,
    cartConversionsCount: 0,
    conversionRatePct: 0,
    avgLatencyMs: 38,
  });

  // Form Nova Chave
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('OpenAI Operator / Custom Agent');
  const [newKeyMaxOrder, setNewKeyMaxOrder] = useState(1500);
  const [createdSecretOnce, setCreatedSecretOnce] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Feedback Visual
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingRules, setSavingRules] = useState(false);
  const [simulatingM2m, setSimulatingM2m] = useState(false);
  const [lastM2mResponse, setLastM2mResponse] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<any>('/api/v2/agent/config');
      if (data?.apiKeys) setApiKeys(data.apiKeys);
      if (data?.pricingRules) setPricingRules(data.pricingRules);
      if (data?.recentLogs) setLogs(data.recentLogs);
      if (data?.metrics) setMetrics(data.metrics);
    } catch {
      // Fallback caso o servidor ainda esteja sincronizando o deploy
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await apiClient.post<any>('/api/v2/agent/keys', {
        name: newKeyName.trim(),
        agentProvider: newKeyProvider,
        maxOrderValueBrl: Number(newKeyMaxOrder) || 1500,
        allowAutonomousCheckout: true,
      });
      if (res?.keyRecord) {
        setApiKeys((prev) => [res.keyRecord, ...prev]);
        setCreatedSecretOnce(res.secretKeyOnce || null);
        setNewKeyName('');
        showToast('Nova Chave M2M de Agente IA gerada com sucesso!');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao criar chave M2M.');
    }
  };

  const handleToggleKey = async (id: string) => {
    try {
      const res = await apiClient.patch<any>(`/api/v2/agent/keys/${id}/toggle`, {});
      if (res?.keyRecord) {
        setApiKeys((prev) => prev.map((k) => (k.id === id ? res.keyRecord : k)));
        showToast('Status da chave atualizado!');
      }
    } catch {
      setApiKeys((prev) => prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k)));
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await apiClient.delete(`/api/v2/agent/keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      showToast('Chave de Agente revogada.');
    } catch {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const handleSavePricingRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRules(true);
      const res = await apiClient.put<any>('/api/v2/agent/pricing-rules', pricingRules);
      if (res?.pricingRules) {
        setPricingRules(res.pricingRules);
      }
      showToast('Regras de Preço Dinâmico para Agentes (M2M) salvas!');
    } catch {
      showToast('Regras atualizadas localmente.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleSimulateAgentQuery = async () => {
    try {
      setSimulatingM2m(true);
      const res = await apiClient.get<any>(
        '/api/v2/agent/products?intent=vestido_festa_vermelho&max_price=150'
      );
      setLastM2mResponse(res);
      await fetchConfig();
      showToast('Consulta M2M simulada! Log registrado em tempo real.');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao testar endpoint M2M.');
    } finally {
      setSimulatingM2m(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-3 text-sm font-semibold">
          <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER ESTRATÉGICO */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-stone-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <Bot className="w-3.5 h-3.5" />
              Agentic Commerce M2M & LLMO Ready
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Integrações AI & Comércio Máquina-para-Máquina (M2M)
            </h1>
            <p className="text-stone-300 text-sm leading-relaxed">
              Gerencie chaves de acesso para agentes compradores autônomos (OpenAI Operator,
              Perplexity Buy-With-Pro, Google Gemini Shopping), configure descontos dinâmicos M2M e
              monitore as intenções semânticas buscadas em tempo real na{' '}
              <strong className="text-white">sagas.moda</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSimulateAgentQuery}
              disabled={simulatingM2m}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              {simulatingM2m ? 'Consultando API M2M...' : 'Simular Agente IA (GET /products)'}
            </button>

            <a
              href={`${
                import.meta.env.VITE_API_URL || 'https://erpsagas.onrender.com'
              }/api/v2/agent/openapi.json`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-stone-100 text-xs font-bold border border-stone-600 transition-colors"
            >
              <FileJson className="w-4 h-4 text-amber-400" />
              OpenAPI 3.1 Spec
              <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
            </a>
          </div>
        </div>

        {/* KPIs M2M */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-stone-700/80">
          <div className="bg-stone-800/70 rounded-2xl p-4 border border-stone-700/60">
            <span className="text-xs text-stone-400 font-medium block">
              Consultas de Agentes IA
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {metrics.totalAgentQueries}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold">
              Latência média: {metrics.avgLatencyMs}ms (JSON estrito)
            </span>
          </div>

          <div className="bg-stone-800/70 rounded-2xl p-4 border border-stone-700/60">
            <span className="text-xs text-stone-400 font-medium block">
              Chaves M2M Ativas
            </span>
            <span className="text-2xl font-black text-white mt-1 block">
              {apiKeys.filter((k) => k.isActive).length}
            </span>
            <span className="text-[11px] text-stone-300">
              OpenAI, Perplexity & Google Graph
            </span>
          </div>

          <div className="bg-stone-800/70 rounded-2xl p-4 border border-stone-700/60">
            <span className="text-xs text-stone-400 font-medium block">
              Desconto Exclusivo M2M + PIX
            </span>
            <span className="text-2xl font-black text-rose-400 mt-1 block">
              {pricingRules.enabled
                ? `${pricingRules.m2mBaseDiscountPct + pricingRules.pixInstantBonusPct}% OFF`
                : 'Desativado'}
            </span>
            <span className="text-[11px] text-stone-300">
              Respeitando piso de margem ({pricingRules.minFloorMarginPct}%)
            </span>
          </div>

          <div className="bg-stone-800/70 rounded-2xl p-4 border border-stone-700/60">
            <span className="text-xs text-stone-400 font-medium block">
              Carrinhos M2M Iniciados
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {metrics.cartConversionsCount}
            </span>
            <span className="text-[11px] text-stone-300">
              Conversão M2M: {metrics.conversionRatePct}%
            </span>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL: CHAVES DE API + REGRAS DE PREÇO DINÂMICO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. GESTÃO DE CHAVES DE API PARA AGENTES PARCEIROS */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-stone-900">
                  Chaves de API para Agentes Parceiros
                </h2>
                <p className="text-xs text-stone-500">
                  Autenticação via header <code className="font-mono bg-stone-100 px-1.5 py-0.5 rounded">x-agent-api-key</code> para compras programáticas
                </p>
              </div>
            </div>
          </div>

          {createdSecretOnce && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-900 uppercase">
                  Chave Secreta Gerada (Copie agora — exibida apenas uma vez)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(createdSecretOnce, 'new-secret')}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  {copiedId === 'new-secret' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Chave
                    </>
                  )}
                </button>
              </div>
              <code className="block font-mono text-xs bg-white px-3 py-2 rounded-xl border border-emerald-200 text-emerald-950 break-all">
                {createdSecretOnce}
              </code>
            </div>
          )}

          {/* Formulário para emitir nova chave */}
          <form
            onSubmit={handleCreateKey}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80"
          >
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                Nome do Agente / Parceiro
              </label>
              <input
                type="text"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Ex: Claude Shopping Bot"
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold text-stone-600 mb-1">
                Ecossistema LLM
              </label>
              <select
                value={newKeyProvider}
                onChange={(e) => setNewKeyProvider(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="OpenAI Operator">OpenAI Operator</option>
                <option value="Perplexity BuyWithPro">Perplexity Buy-With-Pro</option>
                <option value="Google Gemini Shopping">Google Gemini Shopping</option>
                <option value="Anthropic Claude Agent">Anthropic Claude Agent</option>
                <option value="Custom Autonomous Agent">Agente M2M Customizado</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Gerar Key
              </button>
            </div>
          </form>

          {/* Lista de Chaves */}
          <div className="divide-y divide-stone-100">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900">{key.name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        key.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {key.isActive ? 'ATIVA' : 'PAUSADA'}
                    </span>
                    <span className="text-[11px] text-stone-400 font-medium">
                      • {key.agentProvider}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <code className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                      {key.plainPreview}
                    </code>
                    <span>{key.requestsCount} consultas</span>
                    <span>•</span>
                    <span>{key.ordersCreatedCount} checkouts M2M</span>
                    <span>•</span>
                    <span>Teto: R$ {key.maxOrderValueBrl}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(key.plainPreview, key.id)}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 cursor-pointer"
                    title="Copiar identificador"
                  >
                    {copiedId === key.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleKey(key.id)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-700 cursor-pointer"
                  >
                    {key.isActive ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey(key.id)}
                    className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Revogar chave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CONFIGURAÇÃO DE REGRAS DE PREÇO DINÂMICO PARA AGENTES */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900">
                Regras de Preço Dinâmico para Agentes
              </h2>
              <p className="text-xs text-stone-500">
                Incentivos programáticos para IAs compradoras escolherem a SAGAS.MODA
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePricingRules} className="space-y-4">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-stone-900 block">
                  Ativar Tarifário M2M para Agentes Autônomos
                </span>
                <span className="text-[11px] text-stone-500">
                  Aplica desconto estruturado em <code className="font-mono">/api/v2/agent/*</code>
                </span>
              </div>
              <input
                type="checkbox"
                checked={pricingRules.enabled}
                onChange={(e) =>
                  setPricingRules((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-4 h-4 accent-rose-600"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Desconto Base Agente M2M (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  value={pricingRules.m2mBaseDiscountPct}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      m2mBaseDiscountPct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Bônus PIX Instantâneo (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={pricingRules.pixInstantBonusPct}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      pixInstantBonusPct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Qtd. Mínima Atacado IA
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={pricingRules.bulkThresholdQty}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      bulkThresholdQty: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Desconto Extra Volume (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={pricingRules.bulkExtraDiscountPct}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      bulkExtraDiscountPct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Piso de Margem Líquida (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="40"
                  value={pricingRules.minFloorMarginPct}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      minFloorMarginPct: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Limite Auto-Checkout (R$)
                </label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  value={pricingRules.maxAutoApproveBrl}
                  onChange={(e) =>
                    setPricingRules((prev) => ({
                      ...prev,
                      maxAutoApproveBrl: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Trava de Segurança P2 Ativa:</strong> Nenhum agente externo pode fechar
                carrinho abaixo de {pricingRules.minFloorMarginPct}% de margem líquida.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingRules}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {savingRules ? 'Salvando Regras M2M...' : 'Salvar Regras de Preço para Agentes'}
            </button>
          </form>
        </div>
      </div>

      {/* PREVIEW DE RESPOSTA M2M QUANDO SIMULADO */}
      {lastM2mResponse && (
        <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 border border-stone-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span>
                Resposta Real de GET /api/v2/agent/products?intent=vestido_festa_vermelho&max_price=150
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastM2mResponse(null)}
              className="text-xs text-stone-400 hover:text-white cursor-pointer"
            >
              Fechar Preview
            </button>
          </div>
          <pre className="text-xs font-mono bg-stone-950 p-4 rounded-2xl overflow-x-auto max-h-64 text-emerald-300">
            {JSON.stringify(lastM2mResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* 3. LOG DE REQUISIÇÕES DE IA EM TEMPO REAL */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900">
                Log de Requisições de Agentes de IA (Tempo Real)
              </h2>
              <p className="text-xs text-stone-500">
                Rastreamento de quais IAs estão consultando produtos, intenções semânticas e
                validações de SKU
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchConfig}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-bold uppercase text-[11px]">
                <th className="py-3 px-3">Horário</th>
                <th className="py-3 px-3">Agente / LLM</th>
                <th className="py-3 px-3">Endpoint</th>
                <th className="py-3 px-3">Intent / Filtro Semântico</th>
                <th className="py-3 px-3">Matches</th>
                <th className="py-3 px-3">Latência</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-3 font-mono text-stone-500">
                    {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-stone-900 block">{log.agentName}</span>
                    <span className="text-[11px] text-stone-400 truncate max-w-xs block">
                      {log.userAgent}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-stone-700">
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 font-bold mr-1.5">
                      {log.method}
                    </span>
                    {log.endpoint}
                  </td>
                  <td className="py-3 px-3">
                    {log.intent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-mono font-semibold">
                        intent={log.intent}
                        {log.maxPrice ? ` (≤ R$${log.maxPrice})` : ''}
                      </span>
                    ) : log.skuQueried ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-mono font-semibold">
                        sku={log.skuQueried}
                      </span>
                    ) : (
                      <span className="text-stone-400">Catálogo Geral</span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-bold text-stone-800">{log.matchedCount} itens</td>
                  <td className="py-3 px-3 font-mono text-stone-600">{log.latencyMs}ms</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      HTTP {log.statusCode}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AIIntegrations;
