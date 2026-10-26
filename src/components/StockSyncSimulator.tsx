import React, { useState } from 'react';
import {
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Database,
  Radio,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { Product, MarketplaceChannel, IntegrationLog } from '../types';
import { processStockDeduction } from '../logic/combo-engine';

interface StockSyncSimulatorProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  logs: IntegrationLog[];
  setLogs: React.Dispatch<React.SetStateAction<IntegrationLog[]>>;
}

export const StockSyncSimulator: React.FC<StockSyncSimulatorProps> = ({
  products,
  setProducts,
  logs,
  setLogs,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<MarketplaceChannel>('SHOPEE');
  const [selectedSku, setSelectedSku] = useState<string>('VEST-FLORAL-04');
  const [quantity, setQuantity] = useState<number>(2);
  const [isSimulating, setIsSimulating] = useState(false);
  const [traceSteps, setTraceSteps] = useState<Array<{ step: string; ms: number; status: 'ok' | 'running' }>>([]);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);

  // Find variation
  let foundVar = products.flatMap(p => p.variations).find(v => v.sku === selectedSku);
  const currentStock = foundVar?.stockReal || 20;

  const handleSimulate = () => {
    setIsSimulating(true);
    setTraceSteps([]);
    setSyncSummary(null);

    const steps = [
      { step: `1. Webhook recebido de ${selectedChannel} (Order #SHP-${Math.floor(Math.random() * 90000)})`, ms: 12 },
      { step: `2. Redlock (Redis) adquirido no SKU ${selectedSku} (concorrência bloqueada)`, ms: 28 },
      { step: `3. Baixa atômica de ${quantity} unids no PostgreSQL (Estoque: ${currentStock} ➔ ${Math.max(0, currentStock - quantity)})`, ms: 45 },
      { step: `4. BullMQ enfileira sincronização multicanal com retry exponencial`, ms: 59 },
      { step: `5. Adaptador Mercado Livre: API MLB atualizada com sucesso`, ms: 110 },
      { step: `6. Adaptador TikTok Shop: API TTS atualizada com sucesso`, ms: 145 },
      { step: `7. WebSocket emitido para App sagas.moda: vitrine e combos atualizados`, ms: 168 },
    ];

    steps.forEach((st, idx) => {
      setTimeout(() => {
        setTraceSteps(prev => [...prev, { step: st.step, ms: st.ms, status: 'ok' }]);

        if (idx === steps.length - 1) {
          // Process stock deduction in state
          setProducts(prev =>
            prev.map(p => ({
              ...p,
              variations: p.variations.map(v =>
                v.sku === selectedSku
                  ? { ...v, stockReal: Math.max(0, v.stockReal - quantity) }
                  : v
              ),
            }))
          );

          const newLog: IntegrationLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            channel: selectedChannel,
            action: 'STOCK_SYNC',
            status: 'SUCCESS',
            sku: selectedSku,
            message: `Baixa de ${quantity} unids via Webhook ${selectedChannel}. Sincronização propagada para todos os outros canais em 168ms (Anti-venda fantasma).`,
          };

          setLogs(prev => [newLog, ...prev]);
          setIsSimulating(false);
          setSyncSummary(
            `Estoque sincronizado com sucesso! Risco de venda fantasma anulado em 168ms.`
          );
        }
      }, (idx + 1) * 220);
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Proteção Contra Venda Fantasma (Overselling)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Sincronização de Estoque Real-Time via Webhooks
            </h2>
            <p className="text-stone-300 text-sm mt-1 max-w-2xl">
              Quando uma peça vende na Shopee, o ERP recebe o webhook, baixa o estoque no PostgreSQL relacional e notifica instantaneamente o Mercado Livre, o TikTok Shop e o App sagas.moda em menos de 200 milissegundos.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Painel de Simulação & Log Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controle do Disparo de Simulação (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              Simulador de Venda & Webhook
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Live Sandbox
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Canal de Origem da Venda:
              </label>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value as MarketplaceChannel)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-bold focus:outline-emerald-500"
              >
                <option value="SHOPEE">Shopee Brasil (Webhook: order.paid)</option>
                <option value="MERCADO_LIVRE">Mercado Livre (Webhook: orders/v1)</option>
                <option value="TIKTOK_SHOP">TikTok Shop (Webhook: order_status_change)</option>
                <option value="APP_SAGAS">App Mobile sagas.moda (Checkout Direto)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                SKU da Peça Vendida:
              </label>
              <select
                value={selectedSku}
                onChange={e => setSelectedSku(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-mono focus:outline-emerald-500"
              >
                {products.flatMap(p =>
                  p.variations.map(v => (
                    <option key={v.sku} value={v.sku}>
                      {v.sku} — {p.title} (Tam {v.size} - Estoque: {v.stockReal})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Quantidade Vendida:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-bold focus:outline-emerald-500"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <div className="flex justify-between text-stone-600">
                <span>Estoque Atual no ERP:</span>
                <strong className="text-stone-900">{currentStock} unids</strong>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Novo Estoque após baixa:</span>
                <strong className="text-rose-600">
                  {Math.max(0, currentStock - quantity)} unids
                </strong>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSimulating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              <span>Disparar Webhook & Executar Baixa Omnichannel</span>
            </button>
          </div>
        </div>

        {/* Visualização da Cascata de Execução em Milissegundos (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Rastreamento de Execução Assíncrona (Microservices Waterfall)
            </h3>
            <span className="text-[10px] font-mono text-stone-400">Target SLA &lt; 250ms</span>
          </div>

          {traceSteps.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-stone-400 space-y-2">
              <Server className="w-10 h-10 text-stone-300" />
              <p className="text-xs">
                Clique no botão de disparo ao lado para simular o ciclo completo de webhook e baixa simultânea.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {traceSteps.map((st, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs font-mono animate-fadeIn"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-stone-800 truncate">{st.step}</span>
                  </div>
                  <span className="text-emerald-700 font-bold shrink-0 ml-2">
                    +{st.ms}ms
                  </span>
                </div>
              ))}
            </div>
          )}

          {syncSummary && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{syncSummary}</span>
            </div>
          )}

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
            <span className="font-bold text-stone-800 block">Como o NestJS evita a Venda Fantasma:</span>
            <p>
              1. <strong>Redis Distributed Lock:</strong> Bloqueia alterações concorrentes no mesmo SKU durante a escrita no PostgreSQL.
            </p>
            <p>
              2. <strong>Fila BullMQ com Retry Exponencial:</strong> Se a API do Mercado Livre oscilar, o job tenta novamente 3x sem travar a sincronização dos demais canais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
