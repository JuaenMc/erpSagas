import React from 'react';
import {
  Layers,
  Zap,
  Printer,
  Smartphone,
  TrendingUp,
  ShoppingBag,
  Package,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Share2,
  BarChart3,
  Flame,
} from 'lucide-react';
import { Product, ComboRuleModel, FlashSaleModel, Order, IntegrationLog } from '../types';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  products: Product[];
  combos: ComboRuleModel[];
  flashSales: FlashSaleModel[];
  orders: Order[];
  logs: IntegrationLog[];
  setActiveTab: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  combos,
  flashSales,
  orders,
  logs,
  setActiveTab,
}) => {
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const pendingLabels = orders.filter(o => !o.labelPrinted).length;
  const activeCombos = combos.filter(c => c.active).length;
  const totalStock = products.reduce(
    (acc, p) => acc + p.variations.reduce((vAcc, v) => vAcc + v.stockReal, 0),
    0
  );

  // Alertas de estoque crítico (< 15 unidades)
  const lowStockVariations = products
    .flatMap(p =>
      p.variations.map(v => ({
        productTitle: p.title,
        sku: v.sku,
        size: v.size,
        color: v.color,
        stockReal: v.stockReal,
        imageUrl: p.imageUrl,
      }))
    )
    .filter(v => v.stockReal <= 15)
    .slice(0, 4);

  // Vendas por canal nos últimos 7 dias (Dados simulados estruturados)
  const channelSalesData = [
    { day: 'Seg', app: 1240, shopee: 850, ml: 920, tiktok: 340 },
    { day: 'Ter', app: 1450, shopee: 1100, ml: 890, tiktok: 520 },
    { day: 'Qua', app: 1380, shopee: 980, ml: 1050, tiktok: 480 },
    { day: 'Qui', app: 1690, shopee: 1250, ml: 1140, tiktok: 610 },
    { day: 'Sex', app: 2100, shopee: 1540, ml: 1320, tiktok: 890 },
    { day: 'Sáb', app: 2450, shopee: 1820, ml: 1600, tiktok: 1250 },
    { day: 'Dom', app: 1980, shopee: 1430, ml: 1210, tiktok: 980 },
  ];

  const maxDailyTotal = 7000;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-rose-950 to-stone-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-rose-300 tracking-wider uppercase">
              Operação Omnichannel sagas.moda
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Painel Geral & Controle Central
          </h2>
          <p className="text-stone-300 text-sm mt-1 max-w-2xl">
            Acompanhe o faturamento com combos dinâmicos, expedição de etiquetas térmicas 10x15cm e estoque integrado em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('mobile_app')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Ver no App Mobile</span>
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Imprimir Etiquetas ({pendingLabels})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Faturamento Total Hoje</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            R$ {totalRevenue.toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            +38.5% alavancado por Combos
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Combos Dinâmicos Ativos</span>
            <Layers className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            {activeCombos} regras
          </p>
          <span className="text-[11px] text-rose-600 font-semibold mt-1 inline-block">
            "3 por R$100" lidera vendas
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Etiquetas 10x15cm Pendentes</span>
            <Printer className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            {pendingLabels} pedidos
          </p>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 inline-block">
            ZPL pronto para impressão térmica
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-semibold">Estoque Centralizado</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            {totalStock} unids
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            Sincronização &lt; 200ms anti-venda fantasma
          </span>
        </div>
      </div>

      {/* Gráfico de Vendas por Canal (Últimos 7 dias) */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-600" />
              Volume de Vendas por Canal (Últimos 7 Dias)
            </h3>
            <p className="text-xs text-stone-500">
              Distribuição do faturamento: App Próprio sagas.moda, Shopee, Mercado Livre e TikTok Shop
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              App Sagas (42%)
            </span>
            <span className="flex items-center gap-1.5 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              Shopee (28%)
            </span>
            <span className="flex items-center gap-1.5 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Mercado Livre (20%)
            </span>
            <span className="flex items-center gap-1.5 text-stone-700">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-800"></span>
              TikTok Shop (10%)
            </span>
          </div>
        </div>

        {/* Visual Stacked Bar Chart */}
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-7 gap-2 h-44 items-end bg-stone-50/60 p-3 rounded-xl border border-stone-200">
            {channelSalesData.map(d => {
              const dayTotal = d.app + d.shopee + d.ml + d.tiktok;
              const heightPercent = Math.min(100, Math.round((dayTotal / maxDailyTotal) * 100));

              return (
                <div key={d.day} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-stone-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    R$ {(dayTotal / 1000).toFixed(1)}k
                  </span>

                  <div
                    className="w-full max-w-[40px] rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-all group-hover:brightness-105"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div
                      className="bg-rose-500"
                      style={{ height: `${(d.app / dayTotal) * 100}%` }}
                      title={`App: R$ ${d.app}`}
                    ></div>
                    <div
                      className="bg-orange-500"
                      style={{ height: `${(d.shopee / dayTotal) * 100}%` }}
                      title={`Shopee: R$ ${d.shopee}`}
                    ></div>
                    <div
                      className="bg-amber-500"
                      style={{ height: `${(d.ml / dayTotal) * 100}%` }}
                      title={`Mercado Livre: R$ ${d.ml}`}
                    ></div>
                    <div
                      className="bg-stone-800"
                      style={{ height: `${(d.tiktok / dayTotal) * 100}%` }}
                      title={`TikTok: R$ ${d.tiktok}`}
                    ></div>
                  </div>

                  <span className="text-[11px] font-bold text-stone-700 mt-2">
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Produtos Mais Vendidos & Alertas de Estoque Baixo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Produtos Mais Vendidos (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600" />
              Produtos Mais Vendidos (Top Peças)
            </h3>
            <span className="text-xs text-stone-500">Impulsionados por Combos</span>
          </div>

          <div className="space-y-3">
            {products.slice(0, 3).map((prod, idx) => (
              <div
                key={prod.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <img
                    src={prod.imageUrl}
                    alt={prod.title}
                    className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                  <div>
                    <h4 className="font-bold text-stone-900 truncate max-w-[200px]">
                      {prod.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-mono">
                      {prod.masterSku || 'SKU-MASTER'} • {prod.categoryLabel}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-stone-900 text-sm block">
                    R$ {prod.basePrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-rose-600">
                    Selo Combo 3 por 100
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Estoque Baixo (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Alertas de Estoque Crítico (&le; 15 unids)
            </h3>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Risco de Pausa nos Canais
            </span>
          </div>

          <div className="space-y-3">
            {lowStockVariations.map(item => (
              <div
                key={item.sku}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.productTitle}
                    className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                  <div>
                    <p className="font-bold text-stone-900 truncate max-w-[180px]">
                      {item.productTitle}
                    </p>
                    <p className="text-[11px] text-stone-600 font-mono">
                      SKU: {item.sku} (Tam {item.size} - {item.color})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-rose-600 text-sm block">
                    {item.stockReal} unids
                  </span>
                  <span className="text-[10px] text-stone-500">Reposição Urgente</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feed de Atividades Recentes do ERP */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600" />
            Feed de Atividades & Auditoria Recente
          </h3>
          <span className="text-xs text-stone-500">Sincronizado com Redis & Webhooks</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {logs.slice(0, 5).map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></span>
                <div>
                  <span className="font-bold text-stone-900">
                    [{log.channel}] {log.action}:
                  </span>{' '}
                  <span className="text-stone-700">{log.message}</span>
                </div>
              </div>

              <span className="text-[10px] font-mono text-stone-400 shrink-0 ml-2">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
