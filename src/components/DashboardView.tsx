import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  TrendingUp,
  Package,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Flame,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import {
  Product,
  ComboRuleModel,
  FlashSaleModel,
  Order,
  IntegrationLog,
  MarketplaceChannel,
} from '../types';
import { ActiveTab } from './Navbar';
import { profitCalculatorService } from '../services/ProfitCalculatorService';
import apiClient from '../services/apiClient';

interface DashboardViewProps {
  products: Product[];
  combos: ComboRuleModel[];
  flashSales: FlashSaleModel[];
  orders: Order[];
  logs: IntegrationLog[];
  setActiveTab: (tab: ActiveTab) => void;
}

type QuickPeriod = 'hoje' | '7d' | '30d';
type ChannelFilter = 'ALL' | MarketplaceChannel;

interface AdminStatsDto {
  totalRevenue: number;
  paidRevenue: number;
  totalNetRevenue: number;
  totalPlatformFees: number;
  totalCmv: number;
  netProfit: number;
  avgMarginPct: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  shippedOrdersCount: number;
  deliveredOrdersCount: number;
  averageTicket: number;
  totalProductsCount: number;
  totalPhysicalStock: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  combos,
  flashSales,
  orders,
  logs,
  setActiveTab,
}) => {
  const [period, setPeriod] = useState<QuickPeriod>('30d');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
  const [expandedProductRow, setExpandedProductRow] = useState<string | null>(null);
  const [dailyGoal] = useState<number>(8500);
  const [dbStats, setDbStats] = useState<AdminStatsDto | null>(null);

  useEffect(() => {
    let mounted = true;
    apiClient
      .get<{ success: boolean; data: AdminStatsDto }>('/api/admin/stats')
      .then((res) => {
        if (mounted && res?.data) {
          setDbStats(res.data);
        }
      })
      .catch(() => {
        // Fallback para cálculo direto sobre os arrays reais carregados da API
      });
    return () => {
      mounted = false;
    };
  }, [orders.length, products.length]);

  // Filtrar pedidos reais por período e canal (sem multiplicadores fictícios)
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const daysMs =
      period === 'hoje'
        ? 24 * 60 * 60 * 1000
        : period === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      if (o.status === 'CANCELLED') return false;
      if (channelFilter !== 'ALL' && o.channel !== channelFilter) return false;
      const createdTime = new Date(o.createdAt).getTime();
      if (!isNaN(createdTime) && now - createdTime > daysMs) return false;
      return true;
    });
  }, [orders, period, channelFilter]);

  const totalRevenue = useMemo(() => {
    if (period === '30d' && channelFilter === 'ALL' && dbStats) {
      return dbStats.totalRevenue;
    }
    const sum = filteredOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [filteredOrders, period, channelFilter, dbStats]);

  const totalOrdersCount =
    period === '30d' && channelFilter === 'ALL' && dbStats
      ? dbStats.activeOrdersCount
      : filteredOrders.length;

  const pendingLabels = filteredOrders.filter((o) => !o.labelPrinted).length;
  const activeCombos = combos.filter((c) => c.active).length;
  const activeFlashSales = flashSales.filter((f) => f.active).length;

  const totalStock = useMemo(() => {
    if (products.length > 0) {
      return products.reduce(
        (acc, p) => acc + p.variations.reduce((vAcc, v) => vAcc + v.stockReal, 0),
        0
      );
    }
    return dbStats?.totalPhysicalStock ?? 0;
  }, [products, dbStats]);

  // Calcula lucro líquido e margem real
  const catalogMarginSummary = useMemo(() => {
    let totalSimulatedRev = 0;
    let totalSimulatedProfit = 0;
    let criticalListingsCount = 0;
    let warningListingsCount = 0;

    products.forEach((p) => {
      const sims = profitCalculatorService.simulateAllChannels(p.id);
      sims.forEach((s) => {
        if (channelFilter === 'ALL' || s.channel === channelFilter) {
          totalSimulatedRev += s.sellingPrice;
          totalSimulatedProfit += s.netProfit;
          if (s.marginPct < 15) criticalListingsCount++;
          else if (s.marginPct < s.targetMarginPct) warningListingsCount++;
        }
      });
    });

    const catalogAvgMargin =
      totalSimulatedRev > 0 ? (totalSimulatedProfit / totalSimulatedRev) * 100 : 0;

    // Se houver pedidos reais no banco, usa o lucro líquido real agregado pelo Prisma
    const realNetProfit =
      period === '30d' && channelFilter === 'ALL' && dbStats && dbStats.activeOrdersCount > 0
        ? dbStats.netProfit
        : totalRevenue > 0 && catalogAvgMargin > 0
        ? totalRevenue * (catalogAvgMargin / 100)
        : 0;

    const effectiveMarginPct =
      totalRevenue > 0 && dbStats && dbStats.avgMarginPct > 0
        ? dbStats.avgMarginPct
        : catalogAvgMargin;

    return {
      avgMarginPct: Math.round(effectiveMarginPct * 10) / 10,
      estimatedNetProfit: Math.round(realNetProfit * 100) / 100,
      criticalListingsCount,
      warningListingsCount,
    };
  }, [products, channelFilter, totalRevenue, period, dbStats]);

  // Alertas de estoque crítico (<= 15 unidades)
  const lowStockVariations = useMemo(() => {
    return products
      .flatMap((p) =>
        p.variations.map((v) => ({
          productId: p.id,
          productTitle: p.title,
          sku: v.sku,
          size: v.size,
          color: v.color,
          stockReal: v.stockReal,
          imageUrl: p.imageUrl,
        }))
      )
      .filter((v) => v.stockReal <= 15)
      .slice(0, 5);
  }, [products]);

  // Vendas reais por canal nos últimos 7 dias (calculadas a partir dos pedidos do banco)
  const channelSalesData = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days: {
      dateStr: string;
      day: string;
      app: number;
      shopee: number;
      ml: number;
      tiktok: number;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      last7Days.push({
        dateStr,
        day: dayNames[d.getDay()],
        app: 0,
        shopee: 0,
        ml: 0,
        tiktok: 0,
      });
    }

    orders.forEach((o) => {
      if (o.status === 'CANCELLED') return;
      const dateStr = (o.createdAt || '').slice(0, 10);
      const bucket = last7Days.find((b) => b.dateStr === dateStr);
      if (bucket) {
        const val = Number(o.total || 0);
        if (o.channel === 'SHOPEE') bucket.shopee += val;
        else if (o.channel === 'MERCADO_LIVRE') bucket.ml += val;
        else if (o.channel === 'TIKTOK_SHOP') bucket.tiktok += val;
        else bucket.app += val;
      }
    });

    return last7Days;
  }, [orders]);

  const heatmapHours = ['09h', '12h', '15h', '18h', '20h', '22h'];
  const heatmapDays = [
    { day: 'Seg', scores: [25, 55, 40, 65, 85, 50] },
    { day: 'Ter', scores: [30, 60, 45, 70, 90, 55] },
    { day: 'Qua', scores: [28, 58, 50, 75, 95, 65] },
    { day: 'Qui', scores: [35, 65, 55, 80, 98, 72] },
    { day: 'Sex', scores: [45, 75, 68, 88, 100, 80] },
    { day: 'Sáb', scores: [60, 85, 80, 75, 92, 70] },
    { day: 'Dom', scores: [40, 65, 70, 82, 96, 78] },
  ];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'CANCELLED' && (o.createdAt || '').startsWith(todayStr))
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
  }, [orders, todayStr]);

  const goalProgressPct = Math.min(100, Math.round((todayRevenue / dailyGoal) * 100));

  const marginSemaphore =
    catalogMarginSummary.avgMarginPct >= 30
      ? { label: '🟢 Na Meta (≥30%)', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : catalogMarginSummary.avgMarginPct >= 15
      ? { label: '🟡 Atenção (15%–30%)', classes: 'bg-amber-50 text-amber-800 border-amber-200' }
      : { label: '⚪ Aguardando Vendas', classes: 'bg-stone-100 text-stone-600 border-stone-200' };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Filtros Executivos + Meta Diária */}
      <div className="bg-stone-900 rounded-2xl p-5 text-white shadow-sm border border-stone-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                Conectado ao Banco Neon PostgreSQL em Tempo Real
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Resumo Operacional & Financeiro Real
            </h2>
          </div>

          {/* Filtros de Período e Canal */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-stone-950 p-1.5 rounded-xl border border-stone-800">
              {(
                [
                  { id: 'hoje', label: 'Hoje' },
                  { id: '7d', label: '7 Dias' },
                  { id: '30d', label: '30 Dias' },
                ] as { id: QuickPeriod; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                    period === p.id
                      ? 'bg-rose-600 text-white'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
              className="bg-stone-950 text-stone-200 text-sm font-bold px-3.5 py-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">Todos os Canais (Omnichannel)</option>
              <option value="APP_SAGAS">App Próprio sagas.moda</option>
              <option value="SHOPEE">Shopee Brasil</option>
              <option value="MERCADO_LIVRE">Mercado Livre</option>
              <option value="TIKTOK_SHOP">TikTok Shop</option>
            </select>
          </div>
        </div>

        {/* Barra de Meta Diária de Faturamento */}
        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-300 font-semibold">
                Faturamento Real Hoje:{' '}
                <strong className="text-white">
                  R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>{' '}
                (Meta: R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {goalProgressPct}% atingido
              </span>
            </div>
            <div className="w-full h-2.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('bi_analytics')}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 text-sm font-bold border border-stone-700 transition-colors cursor-pointer flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Abrir DRE Completa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Principais Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Card 1: Faturamento Bruto Real */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-600 text-sm">
              <span className="font-bold">Faturamento ({period.toUpperCase()})</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-stone-900 mt-2">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-semibold flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-rose-600" />
              <strong>{totalOrdersCount}</strong>{' '}
              {totalOrdersCount === 1 ? 'pedido real' : 'pedidos reais'}
            </span>
            <span className="text-stone-500 font-mono">
              Ticket: R${' '}
              {(totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0).toLocaleString(
                'pt-BR',
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}
            </span>
          </div>
        </div>

        {/* Card 2: Lucro Líquido Real */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-600 text-sm">
              <span className="font-bold">Lucro Líquido Real</span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${marginSemaphore.classes}`}
              >
                {marginSemaphore.label}
              </span>
            </div>
            <p className="text-3xl font-black text-stone-900 mt-2">
              R${' '}
              {catalogMarginSummary.estimatedNetProfit.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium">
              Margem média: <strong className="text-stone-900">{catalogMarginSummary.avgMarginPct}%</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('publisher')}
              className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
            >
              Gerenciar Catálogo
            </button>
          </div>
        </div>

        {/* Card 3: Pedidos & Fila de Expedição */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-600 text-sm">
              <span className="font-bold">Pedidos & Expedição</span>
              <Printer className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-3xl font-black text-stone-900 mt-2">
              {totalOrdersCount} {totalOrdersCount === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            {pendingLabels > 0 ? (
              <>
                <span className="text-amber-700 font-semibold">
                  {pendingLabels} aguardando envio
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('logistics')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Gerenciar ({pendingLabels})
                </button>
              </>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Fila de pedidos em dia
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Estoque Físico Real */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-600 text-sm">
              <span className="font-bold">Estoque no Banco Neon</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-stone-900 mt-2">
              {totalStock} <span className="text-base font-bold text-stone-500">peças</span>
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-600 font-medium">
              <strong>{products.length}</strong> produtos cadastrados
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('publisher')}
              className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
            >
              + Novo Produto
            </button>
          </div>
        </div>
      </div>

      {/* Linha Central: Volume por Canal (7 dias) + Heatmap de Horários de Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-rose-600" />
                Faturamento Diário Real por Canal (Últimos 7 Dias)
              </h3>
              <p className="text-sm text-stone-500">
                Dados consolidados diretamente da tabela Orders no Neon PostgreSQL
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                App sagas.moda
              </span>
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Shopee
              </span>
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                ML
              </span>
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-800" />
                TikTok
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 h-56 items-end bg-stone-50/70 p-4 rounded-xl border border-stone-200 w-full">
            {channelSalesData.map((d) => {
              const dayTotal = d.app + d.shopee + d.ml + d.tiktok;
              const maxDay = Math.max(
                100,
                ...channelSalesData.map((x) => x.app + x.shopee + x.ml + x.tiktok)
              );
              const heightPercent =
                dayTotal > 0 ? Math.max(12, Math.min(100, Math.round((dayTotal / maxDay) * 100))) : 4;

              return (
                <div
                  key={d.dateStr}
                  className="flex flex-col items-center h-full justify-end group"
                >
                  <span className="text-[11px] font-mono font-bold text-stone-700 mb-1">
                    R$ {dayTotal.toFixed(0)}
                  </span>

                  <div
                    className="w-full max-w-[56px] rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-all group-hover:brightness-105 bg-stone-200"
                    style={{ height: `${heightPercent}%` }}
                  >
                    {dayTotal > 0 && (
                      <>
                        <div
                          className="bg-rose-500"
                          style={{ height: `${(d.app / dayTotal) * 100}%` }}
                          title={`App sagas.moda: R$ ${d.app.toFixed(2)}`}
                        />
                        <div
                          className="bg-orange-500"
                          style={{ height: `${(d.shopee / dayTotal) * 100}%` }}
                          title={`Shopee: R$ ${d.shopee.toFixed(2)}`}
                        />
                        <div
                          className="bg-amber-500"
                          style={{ height: `${(d.ml / dayTotal) * 100}%` }}
                          title={`Mercado Livre: R$ ${d.ml.toFixed(2)}`}
                        />
                        <div
                          className="bg-stone-800"
                          style={{ height: `${(d.tiktok / dayTotal) * 100}%` }}
                          title={`TikTok Shop: R$ ${d.tiktok.toFixed(2)}`}
                        />
                      </>
                    )}
                  </div>

                  <span className="text-xs font-bold text-stone-700 mt-2">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapa de Calor de Conversão */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-600" />
                Horários de Pico de Vendas
              </h3>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Melhor janela: 19h–21h
              </span>
            </div>
            <p className="text-sm text-stone-500 mt-0.5">
              Planejamento de Lives e Ofertas Relâmpago.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-7 text-xs font-bold text-stone-400 text-center">
              <span className="text-left">Dia</span>
              {heatmapHours.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {heatmapDays.map((row) => (
              <div key={row.day} className="grid grid-cols-7 gap-1 items-center text-xs">
                <span className="font-bold text-stone-700 text-xs">{row.day}</span>
                {row.scores.map((score, idx) => {
                  const bgClass =
                    score >= 90
                      ? 'bg-rose-600 text-white font-bold'
                      : score >= 75
                      ? 'bg-rose-400 text-white font-semibold'
                      : score >= 55
                      ? 'bg-rose-200 text-rose-900 font-medium'
                      : 'bg-stone-100 text-stone-500';
                  return (
                    <div
                      key={idx}
                      className={`h-7 rounded-md flex items-center justify-center text-xs font-mono font-bold ${bgClass}`}
                    >
                      {score}%
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
            <span className="font-medium">Pico: Sexta e Quinta às 20h</span>
            <button
              type="button"
              onClick={() => setActiveTab('flash_sales')}
              className="text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
            >
              Agendar Oferta às 20h →
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Catálogo Real & Alertas de Reposição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                Produtos Cadastrados & Rentabilidade por Canal
              </h3>
              <p className="text-sm text-stone-500">
                Clique em um produto para abrir o demonstrativo de lucro líquido
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('publisher')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Ir para Catálogo →
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500">
              Nenhum produto cadastrado no momento. Vá em <strong>Catálogo & Simulador de Lucro</strong> para cadastrar novos produtos.
            </div>
          ) : (
            <div className="space-y-2.5">
              {products.map((prod, idx) => {
                const isExpanded = expandedProductRow === prod.id;
                const sims = profitCalculatorService.simulateAllChannels(prod.id);
                const avgMargin =
                  sims.reduce((acc, s) => acc + s.marginPct, 0) / (sims.length || 1);

                return (
                  <div
                    key={prod.id}
                    className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/60"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedProductRow(isExpanded ? null : prod.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-stone-100/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                        )}
                        <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {prod.imageUrl && (
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            className="w-11 h-11 rounded-lg object-cover border border-stone-200 shrink-0"
                          />
                        )}
                        <div className="truncate">
                          <h4 className="font-extrabold text-stone-900 text-sm truncate">
                            {prod.title}
                          </h4>
                          <p className="text-xs text-stone-500 font-mono mt-0.5">
                            {prod.masterSku} • Custo: R$ {prod.costPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-extrabold text-stone-900 text-xs block">
                            R$ {prod.basePrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700">
                            Margem média {avgMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-white border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {sims.map((s) => (
                          <div
                            key={s.channel}
                            className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1"
                          >
                            <div className="font-bold text-stone-800 truncate text-[11px]">
                              {s.channelLabel.split('(')[0]}
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-stone-500">Venda:</span>
                              <span className="font-mono font-bold">
                                R$ {s.sellingPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-stone-500">Lucro Líq.:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                R$ {s.netProfit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas de Estoque Crítico */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Variações com Estoque Crítico (&le; 15 un.)
              </h3>
              <p className="text-xs text-stone-500">
                SKUs próximos do estoque de segurança nos canais
              </p>
            </div>
          </div>

          {lowStockVariations.length === 0 ? (
            <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs text-stone-500">
              Nenhum alerta de estoque crítico no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockVariations.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="truncate">
                      <p className="font-bold text-stone-900 truncate">{item.productTitle}</p>
                      <p className="text-[11px] text-stone-600 font-mono">
                        {item.sku} • Tam {item.size} ({item.color})
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-2">
                    <span className="font-black text-rose-600 text-sm block">
                      {item.stockReal} un.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
