import React, { useState, useMemo } from 'react';
import {
  Layers,
  Printer,
  Smartphone,
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
  Sliders,
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

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  combos,
  flashSales,
  orders,
  logs,
  setActiveTab,
}) => {
  const [period, setPeriod] = useState<QuickPeriod>('7d');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
  const [expandedProductRow, setExpandedProductRow] = useState<string | null>(null);
  const [dailyGoal] = useState<number>(8500);

  const periodMultiplier = period === 'hoje' ? 1 : period === '7d' ? 6.4 : 24.5;

  const filteredOrders = useMemo(() => {
    if (channelFilter === 'ALL') return orders;
    return orders.filter((o) => o.channel === channelFilter);
  }, [orders, channelFilter]);

  const baseRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
  const totalRevenue = Math.round(baseRevenue * periodMultiplier * 100) / 100;
  const pendingLabels = filteredOrders.filter((o) => !o.labelPrinted).length;
  const activeCombos = combos.filter((c) => c.active).length;
  const activeFlashSales = flashSales.filter((f) => f.active).length;

  const totalStock = products.reduce(
    (acc, p) => acc + p.variations.reduce((vAcc, v) => vAcc + v.stockReal, 0),
    0
  );

  // Calcula margem líquida real do catálogo usando o ProfitCalculatorService (P2)
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

    const avgMarginPct =
      totalSimulatedRev > 0 ? (totalSimulatedProfit / totalSimulatedRev) * 100 : 28.5;
    const estimatedNetProfit = totalRevenue * (avgMarginPct / 100);

    return {
      avgMarginPct: Math.round(avgMarginPct * 10) / 10,
      estimatedNetProfit: Math.round(estimatedNetProfit * 100) / 100,
      criticalListingsCount,
      warningListingsCount,
    };
  }, [products, channelFilter, totalRevenue]);

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

  // Vendas por canal nos últimos 7 dias
  const channelSalesData = [
    { day: 'Seg', app: 1420, shopee: 980, ml: 920, tiktok: 410 },
    { day: 'Ter', app: 1650, shopee: 1120, ml: 890, tiktok: 540 },
    { day: 'Qua', app: 1580, shopee: 1040, ml: 1050, tiktok: 490 },
    { day: 'Qui', app: 1890, shopee: 1320, ml: 1180, tiktok: 670 },
    { day: 'Sex', app: 2350, shopee: 1640, ml: 1420, tiktok: 930 },
    { day: 'Sáb', app: 2780, shopee: 1950, ml: 1680, tiktok: 1320 },
    { day: 'Dom', app: 2240, shopee: 1510, ml: 1290, tiktok: 1050 },
  ];

  // Heatmap de horários de pico (Dia x Faixa de Horário) para planejar Lives e Flash Sales
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

  const maxDailyTotal = 8000;
  const todayRevenue = period === 'hoje' ? totalRevenue : 6840;
  const goalProgressPct = Math.min(100, Math.round((todayRevenue / dailyGoal) * 100));

  const marginSemaphore =
    catalogMarginSummary.avgMarginPct >= 30
      ? { label: '🟢 Na Meta (≥30%)', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : catalogMarginSummary.avgMarginPct >= 15
      ? { label: '🟡 Atenção (15%–30%)', classes: 'bg-amber-50 text-amber-800 border-amber-200' }
      : { label: '🔴 Crítico (<15%)', classes: 'bg-rose-50 text-rose-700 border-rose-200' };

  return (
    <div className="space-y-6">
      {/* Barra Superior de Filtros Executivos + Meta Diária */}
      <div className="bg-stone-900 rounded-2xl p-5 text-white shadow-sm border border-stone-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                Visão Geral & Controle Financeiro Diário
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Resumo Operacional & Margem em Tempo Real
            </h2>
          </div>

          {/* Filtros de Período e Canal */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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
              className="bg-stone-950 text-stone-200 text-xs font-bold px-3 py-2 rounded-xl border border-stone-800 focus:outline-none focus:border-rose-500 cursor-pointer"
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
        <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">
                Meta de Faturamento Hoje:{' '}
                <strong className="text-white">
                  R$ {todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>{' '}
                de R$ {dailyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {goalProgressPct}% atingido
              </span>
            </div>
            <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden">
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
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Abrir DRE Completa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards Principais com Sparklines e Ações Condicionais (P1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Card 1: Faturamento Bruto */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-semibold">Faturamento Bruto ({period.toUpperCase()})</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-1.5">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {/* Mini Sparkline Visual */}
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +28,4% vs. anterior
            </span>
            <div className="flex items-end gap-0.5 h-5">
              {[35, 50, 45, 65, 80, 75, 95].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 bg-emerald-500/80 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Lucro Líquido & Semáforo de Margem (P1 & P2) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-semibold">Lucro Líquido Real</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${marginSemaphore.classes}`}
              >
                {marginSemaphore.label}
              </span>
            </div>
            <p className="text-2xl font-black text-stone-900 mt-1.5">
              R${' '}
              {catalogMarginSummary.estimatedNetProfit.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-stone-600">
              Margem líquida média: <strong>{catalogMarginSummary.avgMarginPct}%</strong>
            </span>
            {catalogMarginSummary.warningListingsCount +
              catalogMarginSummary.criticalListingsCount >
              0 && (
              <button
                type="button"
                onClick={() => setActiveTab('publisher')}
                className="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
              >
                Ajustar preços
              </button>
            )}
          </div>
        </div>

        {/* Card 3: Expedição 10x15 + Ação Condicional */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-semibold">Fila de Expedição 10x15</span>
              <Printer className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-1.5">
              {pendingLabels} {pendingLabels === 1 ? 'pedido' : 'pedidos'}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
            {pendingLabels > 0 ? (
              <>
                <span className="text-amber-700 font-semibold">Aguardando impressão</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('logistics')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Imprimir ({pendingLabels})
                </button>
              </>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% dos pedidos expedidos
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Estoque & Campanhas Ativas */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500 text-xs">
              <span className="font-semibold">Estoque & Campanhas</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-1.5">
              {totalStock} <span className="text-sm font-bold text-stone-500">peças</span>
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-stone-600">
              <strong>{activeCombos}</strong> Combos • <strong>{activeFlashSales}</strong> Flash Sales
            </span>
            {lowStockVariations.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('purchases_fashion')}
                className="text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
              >
                Repor ({lowStockVariations.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Linha Central: Volume por Canal (7 dias) + Heatmap de Horários de Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico Empilhado de Vendas por Canal (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-600" />
                Faturamento Diário por Canal (Últimos 7 Dias)
              </h3>
              <p className="text-xs text-stone-500">
                Comparativo diário entre App Próprio, Shopee, Mercado Livre e TikTok Shop
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                App (42%)
              </span>
              <span className="flex items-center gap-1 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                Shopee (28%)
              </span>
              <span className="flex items-center gap-1 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                ML (20%)
              </span>
              <span className="flex items-center gap-1 text-stone-700">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-800" />
                TikTok (10%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 h-52 items-end bg-stone-50/70 p-4 rounded-xl border border-stone-200 w-full">
            {channelSalesData.map((d) => {
              const dayTotal = d.app + d.shopee + d.ml + d.tiktok;
              const heightPercent = Math.min(100, Math.round((dayTotal / maxDailyTotal) * 100));

              return (
                <div
                  key={d.day}
                  className="flex flex-col items-center h-full justify-end group"
                >
                  <span className="text-[10px] font-mono font-bold text-stone-700 mb-1">
                    R${(dayTotal / 1000).toFixed(1)}k
                  </span>

                  <div
                    className="w-full max-w-[56px] rounded-t-lg overflow-hidden flex flex-col-reverse shadow-xs transition-all group-hover:brightness-105"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div
                      className="bg-rose-500"
                      style={{ height: `${(d.app / dayTotal) * 100}%` }}
                      title={`App sagas.moda: R$ ${d.app}`}
                    />
                    <div
                      className="bg-orange-500"
                      style={{ height: `${(d.shopee / dayTotal) * 100}%` }}
                      title={`Shopee: R$ ${d.shopee}`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ height: `${(d.ml / dayTotal) * 100}%` }}
                      title={`Mercado Livre: R$ ${d.ml}`}
                    />
                    <div
                      className="bg-stone-800"
                      style={{ height: `${(d.tiktok / dayTotal) * 100}%` }}
                      title={`TikTok Shop: R$ ${d.tiktok}`}
                    />
                  </div>

                  <span className="text-[11px] font-bold text-stone-700 mt-2">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapa de Calor de Conversão (Dia x Horário) (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                Horários de Pico de Vendas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                Melhor janela: 19h–21h
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Intensidade de pedidos por dia e faixa horária para agendar Lives e Ofertas Relâmpago.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-7 text-[10px] font-bold text-stone-400 text-center">
              <span className="text-left">Dia</span>
              {heatmapHours.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
            {heatmapDays.map((row) => (
              <div key={row.day} className="grid grid-cols-7 gap-1 items-center text-xs">
                <span className="font-bold text-stone-700 text-[11px]">{row.day}</span>
                {row.scores.map((score, idx) => {
                  const bgClass =
                    score >= 90
                      ? 'bg-rose-600 text-white font-bold'
                      : score >= 75
                      ? 'bg-rose-400 text-white font-semibold'
                      : score >= 55
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-stone-100 text-stone-500';
                  return (
                    <div
                      key={idx}
                      title={`${row.day} às ${heatmapHours[idx]}: índice ${score}/100`}
                      className={`h-6 rounded flex items-center justify-center text-[10px] font-mono ${bgClass}`}
                    >
                      {score}%
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Pico: Sexta e Quinta às 20h</span>
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

      {/* Grid: Top Produtos com Breakdown no Clique (P1) & Alertas de Reposição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Produtos com Lucro Líquido por Canal em Accordion */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                Top Produtos & Rentabilidade por Canal
              </h3>
              <p className="text-xs text-stone-500">
                Clique em um produto para abrir o demonstrativo de lucro líquido em cada canal
              </p>
            </div>
            <span className="text-[11px] font-bold text-stone-500">
              🟢 ≥30% • 🟡 15–30% • 🔴 &lt;15%
            </span>
          </div>

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
                    onClick={() =>
                      setExpandedProductRow(isExpanded ? null : prod.id)
                    }
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-stone-100/80 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                      )}
                      <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-stone-900 text-xs truncate">
                          {prod.title}
                        </h4>
                        <p className="text-[11px] text-stone-500 font-mono">
                          {prod.masterSku} • Custo: R$ {prod.costPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-extrabold text-stone-900 text-xs block">
                          R$ {prod.basePrice.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            avgMargin >= 30
                              ? 'text-emerald-700'
                              : avgMargin >= 15
                              ? 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          {avgMargin >= 30 ? '🟢' : avgMargin >= 15 ? '🟡' : '🔴'} Margem média{' '}
                          {avgMargin.toFixed(1)}%
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
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-stone-200">
                            <span>Margem:</span>
                            <span className="font-bold">
                              {s.semaphore === 'GREEN'
                                ? '🟢'
                                : s.semaphore === 'YELLOW'
                                ? '🟡'
                                : '🔴'}{' '}
                              {s.marginPct.toFixed(1)}%
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
        </div>

        {/* Alertas de Estoque Crítico com Ação Direta (5 colunas) */}
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
            {lowStockVariations.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('purchases_fashion')}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors cursor-pointer"
              >
                Gerar Compra
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {lowStockVariations.map((item) => (
              <div
                key={item.sku}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.productTitle}
                    className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                  <div className="truncate">
                    <p className="font-bold text-stone-900 truncate">
                      {item.productTitle}
                    </p>
                    <p className="text-[11px] text-stone-600 font-mono">
                      {item.sku} • Tam {item.size} ({item.color})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="font-black text-rose-600 text-sm block">
                    {item.stockReal} un.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('purchases_fashion')}
                    className="text-[10px] font-bold text-amber-800 underline cursor-pointer"
                  >
                    Solicitar reposição
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Histórico Recente de Eventos & Movimentações */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-stone-600" />
            Últimas Movimentações da Operação
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('smart_data')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            Ver todas na Central de Dados →
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {logs.slice(0, 5).map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <div>
                  <span className="font-bold text-stone-900">[{log.channel}]</span>{' '}
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
