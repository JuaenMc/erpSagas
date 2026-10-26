import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart2,
  AlertCircle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { SalesMetricDay, MarketplaceCommissionSummary } from '../types';
import { INITIAL_SALES_METRICS_30D, INITIAL_COMMISSION_SUMMARY } from '../data/mockData';

type PeriodFilter = '7d' | '15d' | '30d';

export const BiAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Filter metrics according to period
  const filteredMetrics = useMemo(() => {
    const days = period === '7d' ? 7 : period === '15d' ? 15 : 30;
    return INITIAL_SALES_METRICS_30D.slice(-days);
  }, [period]);

  // Aggregated calculations for selected period
  const totals = useMemo(() => {
    const gross = filteredMetrics.reduce((acc, m) => acc + m.grossRevenue, 0);
    const net = filteredMetrics.reduce((acc, m) => acc + m.netRevenue, 0);
    const fees = filteredMetrics.reduce((acc, m) => acc + m.platformFees, 0);
    const orders = filteredMetrics.reduce((acc, m) => acc + m.ordersCount, 0);
    const appSales = filteredMetrics.reduce((acc, m) => acc + m.appSales, 0);
    const shopeeSales = filteredMetrics.reduce((acc, m) => acc + m.shopeeSales, 0);
    const mlSales = filteredMetrics.reduce((acc, m) => acc + m.mlSales, 0);
    const tiktokSales = filteredMetrics.reduce((acc, m) => acc + m.tiktokSales, 0);

    const netMarginPercent = gross > 0 ? (net / gross) * 100 : 0;
    const avgTicket = orders > 0 ? gross / orders : 0;

    return {
      gross,
      net,
      fees,
      orders,
      avgTicket,
      netMarginPercent,
      appSales,
      shopeeSales,
      mlSales,
      tiktokSales,
    };
  }, [filteredMetrics]);

  // Donut chart channel distribution data
  const channelPieData = useMemo(() => {
    return [
      { name: 'App sagas.moda (0% taxa)', value: totals.appSales, color: '#e11d48' },
      { name: 'Shopee (14% + R$4)', value: totals.shopeeSales, color: '#f97316' },
      { name: 'Mercado Livre (16%)', value: totals.mlSales, color: '#eab308' },
      { name: 'TikTok Shop (5%)', value: totals.tiktokSales, color: '#1c1917' },
    ];
  }, [totals]);

  // Top 5 Products Bar Chart Data
  const topProductsData = [
    { name: 'Vestido Midi Floral', qty: 382, revenue: 34380, margin: '68%' },
    { name: 'Conjunto Moletom Kids', qty: 295, revenue: 20650, margin: '62%' },
    { name: 'Camiseta Básica Algodão', qty: 248, revenue: 7440, margin: '71%' },
    { name: 'Vestido Canelado Família', qty: 189, revenue: 17010, margin: '65%' },
    { name: 'Bermuda Sarja Infantil', qty: 142, revenue: 8520, margin: '58%' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with period toggle */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-rose-400" />
              Business Intelligence & Análise de Canais
            </span>
            <span className="text-stone-400 text-xs hidden sm:inline">
              • Tabela agregada SalesMetric (fast-query rollup)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Dashboard Analítico Avançado
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            Métricas de faturamento bruto vs líquido, taxas retidas por marketplace e margem operacional real.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 shadow-inner">
          {(['7d', '15d', '30d'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === p
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {p === '7d' ? 'Últimos 7 dias' : p === '15d' ? 'Últimos 15 dias' : 'Últimos 30 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards with Sparklines / Visual Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Bruto */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs hover:border-stone-300 transition-colors">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Faturamento Bruto ({period})</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+24.8% vs período anterior</span>
          </div>
        </div>

        {/* Faturamento Líquido */}
        <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-rose-900">Líquido na Conta</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-950 mt-2">
            R$ {totals.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-600 font-medium">
            <span>Taxas retidas: </span>
            <span className="font-bold text-rose-700">
              -R$ {totals.fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Ticket Médio</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">
            R$ {totals.avgTicket.toFixed(2)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-600 font-semibold">
            <Layers className="w-3.5 h-3.5" />
            <span>{totals.orders} pedidos faturados</span>
          </div>
        </div>

        {/* Margem Líquida % */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Eficiência / Retenção</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {totals.netMarginPercent.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-stone-500">
            <span>Vendas no App Próprio elevam a margem</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row: AreaChart (Bruto vs Líquido) + DonutChart (Canais) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AreaChart: Faturamento Bruto vs Líquido */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                Faturamento Líquido vs Bruto ({period})
              </h3>
              <p className="text-xs text-stone-500">
                Comparativo diário entre receita faturada e receita líquida pós-taxas de comissão.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                Bruto (GMV)
              </span>
              <span className="flex items-center gap-1.5 text-stone-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Líquido Real
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredMetrics} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as SalesMetricDay;
                      const diff = data.grossRevenue - data.netRevenue;
                      const feePercent = ((diff / data.grossRevenue) * 100).toFixed(1);

                      return (
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 shadow-xl text-white text-xs space-y-1.5 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                            <span className="font-bold text-stone-200">{label} ({data.date})</span>
                            <span className="text-[10px] text-stone-400 font-mono">{data.ordersCount} pedidos</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-rose-400 font-medium">Faturamento Bruto:</span>
                            <span className="font-bold">R$ {data.grossRevenue.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-400 font-medium">Receita Líquida:</span>
                            <span className="font-bold">R$ {data.netRevenue.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-[11px]">
                            <span className="text-amber-400">Comissões Retidas:</span>
                            <span className="font-mono text-amber-300">-R$ {diff.toFixed(2)} ({feePercent}%)</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="grossRevenue"
                  name="Faturamento Bruto"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#grossGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="netRevenue"
                  name="Receita Líquida"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#netGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DonutChart: Distribuição de Vendas por Canal */}
        <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-rose-600" />
              Vendas por Canal
            </h3>
            <p className="text-xs text-stone-500">
              Participação no faturamento por plataforma ({period}).
            </p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {channelPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [
                    `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Faturado',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total</span>
              <span className="text-sm font-black text-stone-900">
                R$ {(totals.gross / 1000).toFixed(0)}k
              </span>
            </div>
          </div>

          {/* Breakdown legend */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            {channelPieData.map((c) => {
              const share = totals.gross > 0 ? ((c.value / totals.gross) * 100).toFixed(1) : '0';
              return (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                    <span className="text-stone-700 font-medium truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-stone-900">R$ {(c.value / 1000).toFixed(1)}k</span>
                    <span className="font-mono text-stone-500 text-[11px]">({share}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Top Products & Marketplace Commission Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 Products */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-rose-600" />
                Top 5 Mais Vendidos
              </h3>
              <p className="text-xs text-stone-500">Unidades comercializadas no período</p>
            </div>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
              Volume (Unid)
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {topProductsData.map((p, idx) => {
              const maxQty = topProductsData[0].qty;
              const barWidth = Math.round((p.qty / maxQty) * 100);

              return (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      #{idx + 1} {p.name}
                    </span>
                    <span className="font-mono font-bold text-stone-900">
                      {p.qty} unids <span className="text-stone-400 font-normal">| R$ {p.revenue.toLocaleString('pt-BR')}</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabela Resumo: Comissão e Lucro por Marketplace */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                DRE Simplificado: Comissão por Marketplace
              </h3>
              <p className="text-xs text-stone-500">
                Taxas da plataforma retidas vs faturamento líquido real
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <Info className="w-3.5 h-3.5" />
              <span>Base DRE</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Canal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Faturado</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Taxa Média</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Comissão Retida</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Líquido Recebido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {INITIAL_COMMISSION_SUMMARY.map((row) => (
                  <tr key={row.channel} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }}></span>
                        <span className="font-bold text-stone-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-stone-800">
                      R$ {row.grossSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.feeRatePercent === 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {row.feeRatePercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                      -R$ {row.platformFeeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      R$ {row.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-stone-600 text-xs flex items-center justify-between">
            <span className="font-medium">
              💡 <strong>Insight Estratégico:</strong> O App Próprio gera 100% de margem retida (0% comissão). Aumentar a conversão do app em 15% eleva o lucro líquido em R$ 4.250/mês.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
