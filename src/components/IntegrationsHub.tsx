import React, { useState } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Lock,
  Layers,
  ArrowRight,
  Sliders,
  Sparkles,
  Truck,
  CreditCard,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { IntegrationItem, IntegrationCategory, IntegrationStatus } from '../types';
import { INITIAL_INTEGRATIONS } from '../data/mockData';

export const IntegrationsHub: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(INITIAL_INTEGRATIONS);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | IntegrationCategory>('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [authModalItem, setAuthModalItem] = useState<IntegrationItem | null>(null);
  const [configModalItem, setConfigModalItem] = useState<IntegrationItem | null>(null);
  const [markupInput, setMarkupInput] = useState<number>(10);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Filter integrations
  const filtered = integrations.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  const handleSyncNow = (id: string, name: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                lastSync: 'Agora mesmo',
                status: 'CONNECTED',
                syncErrorsCount: 0,
              }
            : item
        )
      );
      setSyncingId(null);
      setSyncFeedback(`Sincronização com ${name} concluída com sucesso!`);
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 1200);
  };

  const handleConnectOAuth = (item: IntegrationItem) => {
    setAuthModalItem(item);
  };

  const handleConfirmOAuthConnection = () => {
    if (!authModalItem) return;
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === authModalItem.id
          ? {
              ...item,
              status: 'CONNECTED',
              lastSync: 'Agora mesmo',
              tokenExpiresAt: '2026-12-31T23:59:59Z',
              syncErrorsCount: 0,
            }
          : item
      )
    );
    setAuthModalItem(null);
  };

  const handleDisconnect = (id: string) => {
    if (confirm('Deseja realmente desconectar este canal? Os pedidos e sincronizações serão pausados.')) {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'DISCONNECTED',
                lastSync: undefined,
              }
            : item
        )
      );
    }
  };

  const handleSaveConfig = () => {
    if (!configModalItem) return;
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === configModalItem.id
          ? {
              ...item,
              defaultMarkupPercent: markupInput,
            }
          : item
      )
    );
    setConfigModalItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Share2 className="w-3 h-3 text-amber-400" />
              Hub Omnichannel & OAuth2 Integrations (Estilo Olist / Tiny)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Central de Canais & Integrações
          </h2>
          <p className="text-stone-400 text-xs mt-1 max-w-2xl">
            Gerencie credenciais OAuth2, webhooks de pedidos em tempo real, transportadoras e gateways de pagamento com chaves cifradas em AES-256-GCM.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-4 bg-stone-950 px-4 py-2.5 rounded-xl border border-stone-800 text-xs">
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Canais Ativos</span>
            <span className="text-base font-black text-emerald-400">
              {integrations.filter((i) => i.status === 'CONNECTED').length} de {integrations.length}
            </span>
          </div>
          <div className="w-px h-8 bg-stone-800"></div>
          <div>
            <span className="text-stone-400 block text-[10px] uppercase font-bold">Segurança</span>
            <span className="text-stone-200 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Tokens Cifrados
            </span>
          </div>
        </div>
      </div>

      {/* Sync feedback notification */}
      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{syncFeedback}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Todos os Canais ({integrations.length})
        </button>
        <button
          onClick={() => setSelectedCategory('MARKETPLACE')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'MARKETPLACE'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Marketplaces ({integrations.filter((i) => i.category === 'MARKETPLACE').length})
        </button>
        <button
          onClick={() => setSelectedCategory('LOGISTICS')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'LOGISTICS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Logística & Transportadoras ({integrations.filter((i) => i.category === 'LOGISTICS').length})
        </button>
        <button
          onClick={() => setSelectedCategory('PAYMENT')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedCategory === 'PAYMENT'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Gateways de Pagamento ({integrations.filter((i) => i.category === 'PAYMENT').length})
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 w-full">
        {filtered.map((item) => {
          const isConnected = item.status === 'CONNECTED';
          const isExpired = item.status === 'ERROR_EXPIRED';
          const isDisconnected = item.status === 'DISCONNECTED';
          const isSyncing = syncingId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                isConnected
                  ? 'border-stone-200 hover:border-emerald-300'
                  : isExpired
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-dashed border-stone-300 bg-stone-50/50'
              }`}
            >
              <div>
                {/* Header with status badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                      {item.badgeTag}
                    </span>
                    <h3 className="text-base font-bold text-stone-900">{item.name}</h3>
                  </div>

                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Conectado
                    </span>
                  ) : isExpired ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      Token Expirado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-200 text-stone-600">
                      Desconectado
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-600 line-clamp-2 mb-4 leading-relaxed">
                  {item.description}
                </p>

                {/* Account & Sync info */}
                {isConnected && (
                  <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs space-y-1.5 mb-4">
                    {item.accountEmail && (
                      <div className="flex items-center justify-between text-stone-600">
                        <span>Conta:</span>
                        <span className="font-mono font-semibold text-stone-800 truncate max-w-[150px]">
                          {item.accountEmail}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Última Sincronização:</span>
                      <span className="font-semibold text-stone-900">{item.lastSync || 'Pendente'}</span>
                    </div>
                    {item.category === 'MARKETPLACE' && (
                      <div className="flex items-center justify-between text-stone-600">
                        <span>Markup Aplicado:</span>
                        <span className="font-bold text-rose-700">+{item.defaultMarkupPercent}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-stone-600">
                      <span>Pedidos Integrados:</span>
                      <span className="font-mono font-bold text-stone-900">{item.totalSyncedOrders}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleSyncNow(item.id, item.name)}
                      disabled={isSyncing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setConfigModalItem(item);
                        setMarkupInput(item.defaultMarkupPercent);
                      }}
                      className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                      title="Configurar Regras & Markup"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDisconnect(item.id)}
                      className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Desconectar"
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  </>
                ) : isExpired ? (
                  <button
                    onClick={() => handleConnectOAuth(item)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconectar OAuth2 (Token Expirado)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectOAuth(item)}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Conectar Canal com OAuth2</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* OAuth Connection Modal */}
      {authModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Autorizar Integração: {authModalItem.name}
                  </h3>
                  <span className="text-xs text-stone-500">Fluxo OAuth2 Authorization Code + PKCE</span>
                </div>
              </div>
              <button
                onClick={() => setAuthModalItem(null)}
                className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-700 block">Endpoint de Autorização:</span>
                <code className="text-[11px] font-mono text-stone-600 break-all block">
                  https://partner.api.{authModalItem.key.toLowerCase()}.com/oauth/authorize?client_id=SAGAS_MODA_CLIENT&redirect_uri=https://sagas.moda/api/v1/integrations/{authModalItem.key.toLowerCase()}/callback&state=crypto_state_csrf_anti_tamper
                </code>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-stone-800">Permissões Solicitadas (Scopes):</span>
                <ul className="space-y-1 text-stone-600 list-disc list-inside">
                  <li>Leitura e escrita de catálogo e variações de estoque</li>
                  <li>Recebimento de notificações de webhook de novos pedidos</li>
                  <li>Geração de etiquetas térmicas e documentos de transporte</li>
                </ul>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Os tokens de acesso serão criptografados em repouso no PostgreSQL usando AES-256-GCM.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                onClick={() => setAuthModalItem(null)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmOAuthConnection}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Conceder Acesso & Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Markup Modal */}
      {configModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-base">
                Configurar: {configModalItem.name}
              </h3>
              <button
                onClick={() => setConfigModalItem(null)}
                className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Markup Automático de Preço (% sobre o preço base)
                </label>
                <p className="text-stone-500 text-[11px] mb-2">
                  Compensa as comissões da plataforma (ex: +14% para Shopee ou +16% para Mercado Livre).
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={markupInput}
                    onChange={(e) => setMarkupInput(Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-stone-300 rounded-xl font-bold font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="font-bold text-stone-600">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setConfigModalItem(null)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
