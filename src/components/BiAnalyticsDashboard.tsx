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
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Layers,
  ArrowUpRight,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart2,
  Info,
  FileSpreadsheet,
  Wallet,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Plus,
  AlertTriangle,
  Landmark,
  Calculator,
} from 'lucide-react';
import { SalesMetricDay } from '../types';
import { INITIAL_SALES_METRICS_30D, INITIAL_COMMISSION_SUMMARY } from '../data/mockData';

type PeriodFilter = '7d' | '15d' | '30d';
type CnpjScope = 'CONSOLIDADO' | 'CNPJ_MATRIZ_ME' | 'CNPJ_FILIAL_MEI';
type FinanceSubTab = 'bi_canais' | 'dre_cascata' | 'fluxo_conciliacao' | 'antecipacao_tributario';

interface FinancialLedgerEntry {
  id: string;
  dueDate: string;
  description: string;
  costCenter: 'CMV_FORNECEDOR' | 'REPASSE_CANAL' | 'IMPOSTO_DAS' | 'MARKETING_ADS' | 'OPERACIONAL';
  type: 'RECEIVABLE' | 'PAYABLE';
  cnpj: 'CNPJ_MATRIZ_ME' | 'CNPJ_FILIAL_MEI';
  amount: number;
  status: 'PAID' | 'PENDING' | 'RECONCILED_OPEN_FINANCE';
  bankMatchCode?: string;
}

export const BiAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [cnpjScope, setCnpjScope] = useState<CnpjScope>('CONSOLIDADO');
  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('bi_canais');
  const [expandedDreGroup, setExpandedDreGroup] = useState<Record<string, boolean>>({
    gross_rev: true,
    taxes: false,
    channel_fees: true,
    cmv: false,
    opex: false,
  });
  const [expandedCommissionChannel, setExpandedCommissionChannel] = useState<string | null>(null);

  // Estados para Contas a Pagar/Receber & Conciliação Open Finance
  const [costCenterFilter, setCostCenterFilter] = useState<string>('ALL');
  const [reconciling, setReconciling] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);
  const [newEntryDesc, setNewEntryDesc] = useState('');
  const [newEntryAmount, setNewEntryAmount] = useState('');
  const [newEntryType, setNewEntryType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [newEntryCenter, setNewEntryCenter] =
    useState<FinancialLedgerEntry['costCenter']>('CMV_FORNECEDOR');

  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([
    {
      id: 'fin-1',
      dueDate: '2026-10-26',
      description: 'Repasse Semanal Shopee Brasil (Lote #SHP-992)',
      costCenter: 'REPASSE_CANAL',
      type: 'RECEIVABLE',
      cnpj: 'CNPJ_MATRIZ_ME',
      amount: 14850.0,
      status: 'RECONCILED_OPEN_FINANCE',
      bankMatchCode: 'OF-ITAU-88219',
    },
    {
      id: 'fin-2',
      dueDate: '2026-10-27',
      description: 'Liquidação Mercado Pago (Vendas Anúncio Premium)',
      costCenter: 'REPASSE_CANAL',
      type: 'RECEIVABLE',
      cnpj: 'CNPJ_MATRIZ_ME',
      amount: 11420.0,
      status: 'PENDING',
    },
    {
      id: 'fin-3',
      dueDate: '2026-10-28',
      description: 'Confecções Vale do Itajaí — NF 004192 (Grade Infantil)',
      costCenter: 'CMV_FORNECEDOR',
      type: 'PAYABLE',
      cnpj: 'CNPJ_MATRIZ_ME',
      amount: 9600.0,
      status: 'PENDING',
    },
    {
      id: 'fin-4',
      dueDate: '2026-10-28',
      description: 'Repasse PIX/Cartão Pagar.me — App sagas.moda',
      costCenter: 'REPASSE_CANAL',
      type: 'RECEIVABLE',
      cnpj: 'CNPJ_FILIAL_MEI',
      amount: 6390.0,
      status: 'PENDING',
    },
    {
      id: 'fin-5',
      dueDate: '2026-10-29',
      description: 'Guia DAS Simples Nacional Competência 09/2026',
      costCenter: 'IMPOSTO_DAS',
      type: 'PAYABLE',
      cnpj: 'CNPJ_MATRIZ_ME',
      amount: 6890.0,
      status: 'PAID',
      bankMatchCode: 'OF-ITAU-77102',
    },
    {
      id: 'fin-6',
      dueDate: '2026-10-30',
      description: 'Tráfego Pago Meta Ads + TikTok Shop Live Boost',
      costCenter: 'MARKETING_ADS',
      type: 'PAYABLE',
      cnpj: 'CNPJ_MATRIZ_ME',
      amount: 3450.0,
      status: 'PENDING',
    },
  ]);

  // Estado do Simulador de Antecipação de Recebíveis
  const [anticipationAmount, setAnticipationAmount] = useState<number>(15000);
  const [anticipationDays, setAnticipationDays] = useState<number>(21);

  // Multiplicador por CNPJ selecionado
  const cnpjFactor =
    cnpjScope === 'CONSOLIDADO' ? 1 : cnpjScope === 'CNPJ_MATRIZ_ME' ? 0.78 : 0.22;

  const filteredMetrics = useMemo(() => {
    const days = period === '7d' ? 7 : period === '15d' ? 15 : 30;
    return INITIAL_SALES_METRICS_30D.slice(-days).map((m) => ({
      ...m,
      grossRevenue: Math.round(m.grossRevenue * cnpjFactor * 100) / 100,
      netRevenue: Math.round(m.netRevenue * cnpjFactor * 100) / 100,
      platformFees: Math.round(m.platformFees * cnpjFactor * 100) / 100,
      appSales: Math.round(m.appSales * cnpjFactor * 100) / 100,
      shopeeSales: Math.round(m.shopeeSales * cnpjFactor * 100) / 100,
      mlSales: Math.round(m.mlSales * cnpjFactor * 100) / 100,
      tiktokSales: Math.round(m.tiktokSales * cnpjFactor * 100) / 100,
      ordersCount: Math.max(1, Math.round(m.ordersCount * cnpjFactor)),
    }));
  }, [period, cnpjFactor]);

  // Totais e Cálculos da DRE Gerencial Completa (M13)
  const totals = useMemo(() => {
    const gross = filteredMetrics.reduce((acc, m) => acc + m.grossRevenue, 0);
    const netAfterCommissions = filteredMetrics.reduce((acc, m) => acc + m.netRevenue, 0);
    const fees = filteredMetrics.reduce((acc, m) => acc + m.platformFees, 0);
    const orders = filteredMetrics.reduce((acc, m) => acc + m.ordersCount, 0);
    const appSales = filteredMetrics.reduce((acc, m) => acc + m.appSales, 0);
    const shopeeSales = filteredMetrics.reduce((acc, m) => acc + m.shopeeSales, 0);
    const mlSales = filteredMetrics.reduce((acc, m) => acc + m.mlSales, 0);
    const tiktokSales = filteredMetrics.reduce((acc, m) => acc + m.tiktokSales, 0);

    // Linhas da DRE Gerencial Real-Time
    const simplesTax = gross * 0.052; // 5,2% alíquota efetiva Simples Nacional Anexo I
    const difalTax = gross * 0.008; // 0,8% DIFAL vendas interestaduais
    const returnsDeduction = gross * 0.032; // 3,2% devoluções/trocas
    const netOperatingRevenue = gross - simplesTax - difalTax - returnsDeduction;

    const cmvTotal = gross * 0.365; // 36,5% CMV médio ponderado
    const packaging10x15Total = orders * 1.5; // R$ 1,50 por pedido expedido
    const contributionMargin =
      netOperatingRevenue - fees - cmvTotal - packaging10x15Total;

    const marketingExpense = gross * 0.055;
    const payrollExpense = gross * 0.065;
    const softwareAndLogisticsExpense = gross * 0.025;
    const totalOpex = marketingExpense + payrollExpense + softwareAndLogisticsExpense;

    const ebitdaNetProfit = contributionMargin - totalOpex;
    const ebitdaMarginPct = gross > 0 ? (ebitdaNetProfit / gross) * 100 : 0;
    const contributionMarginPct = gross > 0 ? (contributionMargin / gross) * 100 : 0;
    const avgTicket = orders > 0 ? gross / orders : 0;

    return {
      gross,
      netAfterCommissions,
      fees,
      orders,
      avgTicket,
      appSales,
      shopeeSales,
      mlSales,
      tiktokSales,
      simplesTax,
      difalTax,
      returnsDeduction,
      netOperatingRevenue,
      cmvTotal,
      packaging10x15Total,
      contributionMargin,
      contributionMarginPct,
      marketingExpense,
      payrollExpense,
      softwareAndLogisticsExpense,
      totalOpex,
      ebitdaNetProfit,
      ebitdaMarginPct,
    };
  }, [filteredMetrics]);

  const channelPieData = useMemo(() => {
    return [
      { name: 'App sagas.moda (1,99% gateway)', value: totals.appSales, color: '#e11d48' },
      { name: 'Shopee (20% + R$4)', value: totals.shopeeSales, color: '#f97316' },
      { name: 'Mercado Livre (17% / R$6 <R$79)', value: totals.mlSales, color: '#eab308' },
      { name: 'TikTok Shop (8% + R$2)', value: totals.tiktokSales, color: '#1c1917' },
    ];
  }, [totals]);

  const topProductsData = [
    { name: 'Vestido Infantil Floral Algodão', qty: 382, revenue: 19061, marginPct: 34.2 },
    { name: 'Conjunto Moletom Infantil Flanelado', qty: 295, revenue: 26520, marginPct: 31.8 },
    { name: 'Vestido Feminino Midi Linho Viscose', qty: 248, revenue: 29735, marginPct: 36.5 },
    { name: 'Jardineira Unissex Jeans Confort', qty: 189, revenue: 10376, marginPct: 29.4 },
    { name: 'Kit Família Combinadinho 4 Peças', qty: 142, revenue: 25560, marginPct: 38.1 },
  ];

  // Projeção de Fluxo de Caixa (Próximos 4 Semanas)
  const cashFlowProjection = [
    { week: 'Sem 1', entradas: 38400, saidas: 24100, saldoAcumulado: 54300 },
    { week: 'Sem 2', entradas: 42900, saidas: 29800, saldoAcumulado: 67400 },
    { week: 'Sem 3', entradas: 46200, saidas: 31200, saldoAcumulado: 82400 },
    { week: 'Sem 4', entradas: 51800, saidas: 33900, saldoAcumulado: 100300 },
  ];

  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((e) => {
      const matchCnpj = cnpjScope === 'CONSOLIDADO' || e.cnpj === cnpjScope;
      const matchCenter = costCenterFilter === 'ALL' || e.costCenter === costCenterFilter;
      return matchCnpj && matchCenter;
    });
  }, [ledgerEntries, cnpjScope, costCenterFilter]);

  const handleOpenFinanceReconcile = () => {
    setReconciling(true);
    setTimeout(() => {
      setLedgerEntries((prev) =>
        prev.map((item) =>
          item.status === 'PENDING' && item.type === 'RECEIVABLE'
            ? {
                ...item,
                status: 'RECONCILED_OPEN_FINANCE',
                bankMatchCode: `OF-PLUGGY-${Math.floor(10000 + Math.random() * 89999)}`,
              }
            : item
        )
      );
      setReconciling(false);
      setReconcileNotice(
        'Extrato bancário sincronizado via Open Finance: 2 repasses de canais conciliados automaticamente.'
      );
      setTimeout(() => setReconcileNotice(null), 5000);
    }, 600);
  };

  const handleAddLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(newEntryAmount);
    if (!newEntryDesc.trim() || isNaN(num) || num <= 0) return;

    const entry: FinancialLedgerEntry = {
      id: `fin-${Date.now()}`,
      dueDate: new Date().toISOString().slice(0, 10),
      description: newEntryDesc.trim(),
      costCenter: newEntryCenter,
      type: newEntryType,
      cnpj: cnpjScope === 'CNPJ_FILIAL_MEI' ? 'CNPJ_FILIAL_MEI' : 'CNPJ_MATRIZ_ME',
      amount: num,
      status: 'PENDING',
    };
    setLedgerEntries((prev) => [entry, ...prev]);
    setNewEntryDesc('');
    setNewEntryAmount('');
  };

  const toggleDreSection = (key: string) => {
    setExpandedDreGroup((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Simulação de Antecipação por Canal
  const anticipationChannels = useMemo(() => {
    const configs = [
      {
        channel: 'App sagas.moda (Pagar.me Cartão)',
        monthlyRatePct: 1.89,
        availableBalance: 24500,
      },
      {
        channel: 'Mercado Pago (Mercado Livre)',
        monthlyRatePct: 2.39,
        availableBalance: 31200,
      },
      {
        channel: 'Shopee Antecipação Direta',
        monthlyRatePct: 2.75,
        availableBalance: 19800,
      },
    ];

    return configs.map((c) => {
      const effectiveRateForPeriod = (c.monthlyRatePct / 30) * anticipationDays;
      const discountAmount = anticipationAmount * (effectiveRateForPeriod / 100);
      const netReceivedToday = anticipationAmount - discountAmount;
      // CET Anual composto
      const cetAnnualPct =
        (Math.pow(1 + c.monthlyRatePct / 100, 12) - 1) * 100;
      const resultingMarginPct = totals.ebitdaMarginPct - effectiveRateForPeriod;

      return {
        ...c,
        effectiveRateForPeriod: Math.round(effectiveRateForPeriod * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        netReceivedToday: Math.round(netReceivedToday * 100) / 100,
        cetAnnualPct: Math.round(cetAnnualPct * 10) / 10,
        resultingMarginPct: Math.round(resultingMarginPct * 10) / 10,
      };
    });
  }, [anticipationAmount, anticipationDays, totals.ebitdaMarginPct]);

  return (
    <div className="space-y-6">
      {/* Header Financeiro com Seletor Multi-CNPJ e Filtro de Período */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 text-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Gestão Financeira, DRE & Inteligência de Canais
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Indicadores, DRE Real-Time & Fluxo de Caixa
            </h2>
            <p className="text-stone-400 text-xs mt-0.5">
              Apuração automática de comissões, impostos, CMV, conciliação bancária e antecipação de recebíveis.
            </p>
          </div>

          {/* Seletores: Multi-CNPJ + Período */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-950 px-3 py-1.5 rounded-xl border border-stone-800">
              <Building2 className="w-3.5 h-3.5 text-rose-400" />
              <select
                value={cnpjScope}
                onChange={(e) => setCnpjScope(e.target.value as CnpjScope)}
                className="bg-transparent text-xs font-bold text-stone-200 focus:outline-none cursor-pointer"
              >
                <option value="CONSOLIDADO" className="bg-stone-900">
                  Grupo Consolidado (ME + MEI)
                </option>
                <option value="CNPJ_MATRIZ_ME" className="bg-stone-900">
                  Matriz: Sagas Moda Ltda (Simples ME)
                </option>
                <option value="CNPJ_FILIAL_MEI" className="bg-stone-900">
                  Filial: Sagas Confecção (MEI)
                </option>
              </select>
            </div>

            <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
              {(['7d', '15d', '30d'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === p
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {p === '7d' ? '7 dias' : p === '15d' ? '15 dias' : '30 dias'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Abas de Finanças */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-stone-800">
          {[
            {
              id: 'bi_canais',
              label: '1. Gráficos & Canais (BI)',
              icon: PieChartIcon,
            },
            {
              id: 'dre_cascata',
              label: '2. DRE Gerencial Completa',
              icon: FileSpreadsheet,
            },
            {
              id: 'fluxo_conciliacao',
              label: '3. Fluxo de Caixa & Open Finance',
              icon: Wallet,
            },
            {
              id: 'antecipacao_tributario',
              label: '4. Antecipação & Impostos (DAS/DIFAL)',
              icon: Calculator,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as FinanceSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'bg-stone-800/70 text-stone-300 hover:bg-stone-800 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-rose-600' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 KPI Cards Executivos Sempre Visíveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Receita Bruta ({period})</span>
            <DollarSign className="w-4 h-4 text-stone-700" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-1.5">
            R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +24,8% no período
            </span>
            <span className="text-stone-400 font-mono">{totals.orders} pedidos</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Repasse Líquido Canais</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-1.5">
            R${' '}
            {totals.netAfterCommissions.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="mt-2 text-[11px] text-stone-600">
            Comissões retidas:{' '}
            <strong className="text-rose-600">
              −R$ {totals.fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold">Margem de Contribuição</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-stone-900 mt-1.5">
            R${' '}
            {totals.contributionMargin.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="mt-2 text-[11px] text-indigo-700 font-semibold">
            {totals.contributionMarginPct.toFixed(1)}% após CMV, taxas e impostos
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-white to-emerald-50/40">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span className="font-bold">Lucro Líquido Real (DRE)</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                totals.ebitdaMarginPct >= 20
                  ? 'bg-emerald-100 text-emerald-800'
                  : totals.ebitdaMarginPct >= 12
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {totals.ebitdaMarginPct >= 20
                ? '🟢 Saudável'
                : totals.ebitdaMarginPct >= 12
                ? '🟡 Atenção'
                : '🔴 Crítico'}
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-1.5">
            R${' '}
            {totals.ebitdaNetProfit.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </p>
          <div className="mt-2 text-[11px] text-emerald-900 font-semibold">
            Margem líquida final: <strong>{totals.ebitdaMarginPct.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ABA 1: GRÁFICOS & CANAIS (BI)
         ===================================================================== */}
      {activeSubTab === 'bi_canais' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AreaChart: Faturamento Bruto vs Líquido */}
            <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    Evolução: Faturamento Bruto vs. Repasse Líquido ({period})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Comparativo diário descontando as comissões e taxas fixas dos marketplaces
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-stone-700">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    Bruto (GMV)
                  </span>
                  <span className="flex items-center gap-1.5 text-stone-700">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    Líquido Canais
                  </span>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredMetrics}
                    margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                  >
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
                          const feePercent = (
                            (diff / Math.max(1, data.grossRevenue)) *
                            100
                          ).toFixed(1);

                          return (
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 shadow-xl text-white text-xs space-y-1.5 min-w-[210px]">
                              <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                                <span className="font-bold text-stone-200">
                                  {label} ({data.date})
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {data.ordersCount} pedidos
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-rose-400 font-medium">Venda Bruta:</span>
                                <span className="font-bold">
                                  R$ {data.grossRevenue.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-emerald-400 font-medium">
                                  Repasse Líquido:
                                </span>
                                <span className="font-bold">
                                  R$ {data.netRevenue.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-stone-800 text-[11px]">
                                <span className="text-amber-400">Taxas Retidas:</span>
                                <span className="font-mono text-amber-300">
                                  −R$ {diff.toFixed(2)} ({feePercent}%)
                                </span>
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
                      name="Repasse Líquido"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#netGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DonutChart: Participação por Canal */}
            <div className="lg:col-span-4 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-rose-600" />
                  Participação por Canal
                </h3>
                <p className="text-xs text-stone-500">
                  Distribuição das vendas brutas ({period})
                </p>
              </div>

              <div className="h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={84}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {channelPieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`,
                        'Faturado',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Total
                  </span>
                  <span className="text-sm font-black text-stone-900">
                    R$ {(totals.gross / 1000).toFixed(0)}k
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-100">
                {channelPieData.map((c) => {
                  const share =
                    totals.gross > 0 ? ((c.value / totals.gross) * 100).toFixed(1) : '0';
                  return (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-stone-700 font-medium truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-stone-900">
                          R$ {(c.value / 1000).toFixed(1)}k
                        </span>
                        <span className="font-mono text-stone-500 text-[11px]">
                          ({share}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Linha 2: Top 5 Produtos + Tabela de Comissões com Accordion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-rose-600" />
                    Top 5 Curva A (Volume & Margem)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Peças campeãs de giro e margem líquida média
                  </p>
                </div>
                <span className="text-[10px] font-bold text-stone-500">
                  🟢 ≥30% • 🟡 15–30%
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {topProductsData.map((p, idx) => {
                  const maxQty = topProductsData[0].qty;
                  const barWidth = Math.round((p.qty / maxQty) * 100);

                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800 truncate">
                          #{idx + 1} {p.name}
                        </span>
                        <span className="font-mono font-bold text-stone-900 shrink-0">
                          {p.qty} un. •{' '}
                          <span className="text-emerald-700">
                            {p.marginPct >= 30 ? '🟢' : '🟡'} {p.marginPct}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela de Comissões por Marketplace com Detalhe no Clique (P1) */}
            <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Auditoria de Comissões e Repasses por Canal
                  </h3>
                  <p className="text-xs text-stone-500">
                    Clique em qualquer canal para abrir o detalhamento de taxas fixas e variáveis
                  </p>
                </div>
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Detalhe no clique
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Canal</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Faturado</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Alíquota Média</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Taxas Retidas</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Repasse Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {INITIAL_COMMISSION_SUMMARY.map((row) => {
                      const isExpanded = expandedCommissionChannel === row.channel;
                      return (
                        <React.Fragment key={row.channel}>
                          <tr
                            onClick={() =>
                              setExpandedCommissionChannel(
                                isExpanded ? null : row.channel
                              )
                            }
                            className="hover:bg-stone-50 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                                )}
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: row.color }}
                                />
                                <span className="font-bold text-stone-900">{row.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-stone-800">
                              R${' '}
                              {(row.grossSales * cnpjFactor).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  row.feeRatePercent === 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {row.feeRatePercent === 0 ? '1,99% PIX/Cartão' : `${row.feeRatePercent}%`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                              −R${' '}
                              {(row.platformFeeTotal * cnpjFactor).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                              R${' '}
                              {(row.netProfit * cnpjFactor).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-stone-50/90">
                              <td colSpan={5} className="p-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                    <span className="text-stone-400 block">Pedidos no Canal</span>
                                    <strong className="text-stone-900 font-mono">
                                      {Math.round(row.ordersCount * cnpjFactor)} pedidos
                                    </strong>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                    <span className="text-stone-400 block">Taxa Fixa / Item</span>
                                    <strong className="text-stone-900 font-mono">
                                      {row.channel === 'SHOPEE'
                                        ? 'R$ 4,00 / un.'
                                        : row.channel === 'MERCADO_LIVRE'
                                        ? 'R$ 6,00 (< R$79)'
                                        : row.channel === 'TIKTOK_SHOP'
                                        ? 'R$ 2,00 / un.'
                                        : 'Isento (R$ 0,00)'}
                                    </strong>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                    <span className="text-stone-400 block">Prazo Médio Repasse</span>
                                    <strong className="text-stone-900">
                                      {row.channel === 'APP_SAGAS'
                                        ? 'D+1 (PIX) / D+14'
                                        : row.channel === 'MERCADO_LIVRE'
                                        ? 'D+7 após entrega'
                                        : 'D+7 após conclusão'}
                                    </strong>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                                    <span className="text-stone-400 block">Imposto Simples (5,2%)</span>
                                    <strong className="text-rose-600 font-mono">
                                      −R$ {(row.grossSales * cnpjFactor * 0.052).toFixed(2)}
                                    </strong>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 2: DRE GERENCIAL INTERATIVA EM CASCATA (P1 ACCORDION)
         ===================================================================== */}
      {activeSubTab === 'dre_cascata' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-rose-600" />
                DRE Gerencial por Competência — Cascata Bruto ao Líquido
              </h3>
              <p className="text-xs text-stone-500">
                Clique nas linhas com seta para expandir ou recolher os sub-itens de cada grupo contábil.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-bold">
                Escopo: {cnpjScope.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900 text-white">
                <tr>
                  <th className="py-3 px-4 font-bold rounded-tl-xl">
                    Linha do Demonstrativo (DRE)
                  </th>
                  <th className="py-3 px-4 font-bold text-right">Valor (R$)</th>
                  <th className="py-3 px-4 font-bold text-right">Análise Vertical (% Bruto)</th>
                  <th className="py-3 px-4 font-bold text-center rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {/* 1. RECEITA BRUTA */}
                <tr
                  onClick={() => toggleDreSection('gross_rev')}
                  className="bg-stone-50 hover:bg-stone-100 font-bold text-stone-900 cursor-pointer"
                >
                  <td className="py-3.5 px-4 flex items-center gap-2">
                    {expandedDreGroup.gross_rev ? (
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-stone-500" />
                    )}
                    <span>(+) RECEITA OPERACIONAL BRUTA (GMV)</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm">
                    R$ {totals.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">100,0%</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                      🟢 Base
                    </span>
                  </td>
                </tr>
                {expandedDreGroup.gross_rev && (
                  <>
                    <tr className="text-stone-600 bg-white">
                      <td className="py-2 px-10">↳ App Próprio sagas.moda</td>
                      <td className="py-2 px-4 text-right font-mono">
                        R$ {totals.appSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {((totals.appSales / totals.gross) * 100).toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-white">
                      <td className="py-2 px-10">↳ Shopee Brasil</td>
                      <td className="py-2 px-4 text-right font-mono">
                        R$ {totals.shopeeSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {((totals.shopeeSales / totals.gross) * 100).toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-white">
                      <td className="py-2 px-10">↳ Mercado Livre</td>
                      <td className="py-2 px-4 text-right font-mono">
                        R$ {totals.mlSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {((totals.mlSales / totals.gross) * 100).toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-white">
                      <td className="py-2 px-10">↳ TikTok Shop</td>
                      <td className="py-2 px-4 text-right font-mono">
                        R$ {totals.tiktokSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {((totals.tiktokSales / totals.gross) * 100).toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                {/* 2. IMPOSTOS E DEDUÇÕES */}
                <tr
                  onClick={() => toggleDreSection('taxes')}
                  className="hover:bg-stone-50 font-bold text-rose-700 cursor-pointer"
                >
                  <td className="py-3 px-4 flex items-center gap-2">
                    {expandedDreGroup.taxes ? (
                      <ChevronDown className="w-4 h-4 text-rose-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-rose-500" />
                    )}
                    <span>(−) DEDUÇÕES, IMPOSTOS (SIMPLES/DIFAL) E DEVOLUÇÕES</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −R${' '}
                    {(
                      totals.simplesTax +
                      totals.difalTax +
                      totals.returnsDeduction
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">−9,2%</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-700">
                      Fiscal
                    </span>
                  </td>
                </tr>
                {expandedDreGroup.taxes && (
                  <>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ DAS Simples Nacional (Anexo I - 5,2%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R$ {totals.simplesTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−5,2%</td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ DIFAL / ICMS Interestadual (0,8%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R$ {totals.difalTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−0,8%</td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ Devoluções e Trocas Logística Reversa (3,2%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R${' '}
                        {totals.returnsDeduction.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−3,2%</td>
                      <td />
                    </tr>
                  </>
                )}

                {/* 3. RECEITA OPERACIONAL LÍQUIDA */}
                <tr className="bg-stone-100/80 font-extrabold text-stone-900">
                  <td className="py-3 px-4">(=) RECEITA OPERACIONAL LÍQUIDA</td>
                  <td className="py-3 px-4 text-right font-mono">
                    R${' '}
                    {totals.netOperatingRevenue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">90,8%</td>
                  <td />
                </tr>

                {/* 4. COMISSÕES E TAXAS DE MARKETPLACE */}
                <tr
                  onClick={() => toggleDreSection('channel_fees')}
                  className="hover:bg-stone-50 font-bold text-rose-700 cursor-pointer"
                >
                  <td className="py-3 px-4 flex items-center gap-2">
                    {expandedDreGroup.channel_fees ? (
                      <ChevronDown className="w-4 h-4 text-rose-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-rose-500" />
                    )}
                    <span>(−) COMISSÕES DE MARKETPLACE, TAXAS FIXAS (R$4/R$6) & GATEWAY</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −R$ {totals.fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −{((totals.fees / totals.gross) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
                      Canais
                    </span>
                  </td>
                </tr>

                {/* 5. CMV E EMBALAGEM 10X15 */}
                <tr
                  onClick={() => toggleDreSection('cmv')}
                  className="hover:bg-stone-50 font-bold text-rose-700 cursor-pointer"
                >
                  <td className="py-3 px-4 flex items-center gap-2">
                    {expandedDreGroup.cmv ? (
                      <ChevronDown className="w-4 h-4 text-rose-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-rose-500" />
                    )}
                    <span>(−) CUSTO DA MERCADORIA VENDIDA (CMV) + EMBALAGEM 10x15</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −R${' '}
                    {(totals.cmvTotal + totals.packaging10x15Total).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −
                    {(
                      ((totals.cmvTotal + totals.packaging10x15Total) / totals.gross) *
                      100
                    ).toFixed(1)}
                    %
                  </td>
                  <td />
                </tr>
                {expandedDreGroup.cmv && (
                  <>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ Custo de Aquisição / Confecção das Peças (CMV)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R$ {totals.cmvTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−36,5%</td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">
                        ↳ Saco de Segurança + Etiqueta Térmica 10x15cm (R$ 1,50/pedido)
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R${' '}
                        {totals.packaging10x15Total.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        −{((totals.packaging10x15Total / totals.gross) * 100).toFixed(1)}%
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                {/* 6. MARGEM DE CONTRIBUIÇÃO */}
                <tr className="bg-indigo-50/70 font-black text-indigo-950">
                  <td className="py-3.5 px-4">
                    (=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL (LUCRO BRUTO)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm">
                    R${' '}
                    {totals.contributionMargin.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {totals.contributionMarginPct.toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
                      🟢 Meta ≥35%
                    </span>
                  </td>
                </tr>

                {/* 7. DESPESAS OPERACIONAIS (OPEX) */}
                <tr
                  onClick={() => toggleDreSection('opex')}
                  className="hover:bg-stone-50 font-bold text-rose-700 cursor-pointer"
                >
                  <td className="py-3 px-4 flex items-center gap-2">
                    {expandedDreGroup.opex ? (
                      <ChevronDown className="w-4 h-4 text-rose-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-rose-500" />
                    )}
                    <span>(−) DESPESAS OPERACIONAIS POR CENTRO DE CUSTO (OPEX)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    −R$ {totals.totalOpex.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">−14,5%</td>
                  <td />
                </tr>
                {expandedDreGroup.opex && (
                  <>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ Marketing, Live Commerce & Afiliadas (5,5%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R${' '}
                        {totals.marketingExpense.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−5,5%</td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ Equipe Operacional, Expedição & SAC (6,5%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R${' '}
                        {totals.payrollExpense.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−6,5%</td>
                      <td />
                    </tr>
                    <tr className="text-stone-600 bg-stone-50/40">
                      <td className="py-2 px-10">↳ Infraestrutura Cloud, ERP & Logística (2,5%)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        −R${' '}
                        {totals.softwareAndLogisticsExpense.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">−2,5%</td>
                      <td />
                    </tr>
                  </>
                )}

                {/* 8. LUCRO LÍQUIDO FINAL */}
                <tr className="bg-emerald-950 text-white font-black text-sm">
                  <td className="py-4 px-4 rounded-bl-xl">
                    (=) LUCRO LÍQUIDO REAL DO EXERCÍCIO (EBITDA)
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-300 text-base">
                    R${' '}
                    {totals.ebitdaNetProfit.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-emerald-300">
                    {totals.ebitdaMarginPct.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4 text-center rounded-br-xl">
                    <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      🟢 Acima da Meta
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 3: FLUXO DE CAIXA PROJETADO & CONCILIAÇÃO OPEN FINANCE
         ===================================================================== */}
      {activeSubTab === 'fluxo_conciliacao' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gráfico de Fluxo de Caixa Projetado 30d */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Fluxo de Caixa Projetado (Próximas 4 Semanas)
                </h3>
                <p className="text-xs text-stone-500">
                  Entradas previstas de repasses (Shopee/ML/App) vs. Saídas de fornecedores e DAS
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowProjection}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) =>
                        `R$ ${Number(val).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`
                      }
                    />
                    <Bar
                      dataKey="entradas"
                      name="Entradas (Repasses)"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="saidas"
                      name="Saídas (Fornecedores/Impostos)"
                      fill="#e11d48"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Novo Lançamento + Conciliação Automática Open Finance */}
            <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-indigo-600" />
                    Conciliação Bancária Open Finance (Pluggy)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Cruzamento automático entre extrato Itaú/Cora e repasses liquidados dos canais
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenFinanceReconcile}
                  disabled={reconciling}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
                  <span>{reconciling ? 'Conciliando...' : 'Conciliar Extrato Agora'}</span>
                </button>
              </div>

              {reconcileNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reconcileNotice}</span>
                </div>
              )}

              {/* Formulário Rápido de Conta a Pagar / Receber */}
              <form
                onSubmit={handleAddLedgerEntry}
                className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3"
              >
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-rose-600" />
                  <span>Adicionar Conta a Pagar ou Receber</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={newEntryDesc}
                    onChange={(e) => setNewEntryDesc(e.target.value)}
                    placeholder="Descrição (ex: NF Tecidos Brás)"
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newEntryAmount}
                    onChange={(e) => setNewEntryAmount(e.target.value)}
                    placeholder="Valor R$ (ex: 4500.00)"
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs focus:outline-none focus:border-rose-500"
                  />
                  <select
                    value={newEntryType}
                    onChange={(e) =>
                      setNewEntryType(e.target.value as 'PAYABLE' | 'RECEIVABLE')
                    }
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold"
                  >
                    <option value="PAYABLE">Saída — Conta a Pagar</option>
                    <option value="RECEIVABLE">Entrada — Conta a Receber</option>
                  </select>
                  <select
                    value={newEntryCenter}
                    onChange={(e) =>
                      setNewEntryCenter(
                        e.target.value as FinancialLedgerEntry['costCenter']
                      )
                    }
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white text-xs font-semibold"
                  >
                    <option value="CMV_FORNECEDOR">Centro: Fornecedor / CMV</option>
                    <option value="REPASSE_CANAL">Centro: Repasse Marketplace</option>
                    <option value="IMPOSTO_DAS">Centro: Imposto DAS / DIFAL</option>
                    <option value="MARKETING_ADS">Centro: Marketing & Lives</option>
                    <option value="OPERACIONAL">Centro: Despesa Operacional</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Registrar Lançamento Financeiro
                </button>
              </form>
            </div>
          </div>

          {/* Tabela de Contas a Pagar / Receber */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-stone-900 text-base">
                Livro Caixa & Títulos Financeiros ({filteredLedger.length})
              </h3>
              <select
                value={costCenterFilter}
                onChange={(e) => setCostCenterFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold bg-stone-50"
              >
                <option value="ALL">Todos os Centros de Custo</option>
                <option value="REPASSE_CANAL">Repasses de Canal</option>
                <option value="CMV_FORNECEDOR">Fornecedores (CMV)</option>
                <option value="IMPOSTO_DAS">Impostos (DAS/SEFAZ)</option>
                <option value="MARKETING_ADS">Marketing & Tráfego</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Vencimento</th>
                    <th className="py-2.5 px-3 font-semibold">Descrição</th>
                    <th className="py-2.5 px-3 font-semibold">Centro de Custo</th>
                    <th className="py-2.5 px-3 font-semibold">CNPJ</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Valor</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status / Conciliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLedger.map((entry) => (
                    <tr key={entry.id} className="hover:bg-stone-50">
                      <td className="py-3 px-3 font-mono text-stone-600">{entry.dueDate}</td>
                      <td className="py-3 px-3 font-bold text-stone-900">{entry.description}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-semibold text-[11px]">
                          {entry.costCenter.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-500 text-[11px]">
                        {entry.cnpj === 'CNPJ_MATRIZ_ME' ? 'Matriz ME' : 'Filial MEI'}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-bold ${
                          entry.type === 'RECEIVABLE' ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {entry.type === 'RECEIVABLE' ? '+' : '−'}R${' '}
                        {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {entry.status === 'RECONCILED_OPEN_FINANCE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            Conciliado ({entry.bankMatchCode})
                          </span>
                        ) : entry.status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-800">
                            Liquidado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Pendente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ABA 4: SIMULADOR DE ANTECIPAÇÃO DE RECEBÍVEIS & PAINEL TRIBUTÁRIO MODA
         ===================================================================== */}
      {activeSubTab === 'antecipacao_tributario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulador de Antecipação de Recebíveis por Canal (7 colunas) */}
          <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <Calculator className="w-4 h-4 text-rose-600" />
                Simulador de Antecipação de Recebíveis por Canal
              </h3>
              <p className="text-xs text-stone-500">
                Compare o custo efetivo anual (CET) e o impacto na margem líquida antes de antecipar vendas a prazo
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Valor que deseja antecipar (R$)
                </label>
                <input
                  type="number"
                  step="500"
                  value={anticipationAmount}
                  onChange={(e) =>
                    setAnticipationAmount(Math.max(1000, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-mono font-bold text-stone-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Prazo médio antecipado (dias corridos)
                </label>
                <input
                  type="number"
                  min={7}
                  max={60}
                  value={anticipationDays}
                  onChange={(e) =>
                    setAnticipationDays(Math.max(7, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm font-mono font-bold text-stone-900"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Canal / Instituição</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Desconto (R$)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Líquido Hoje</th>
                    <th className="py-2.5 px-3 font-semibold text-center">CET Anual</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Impacto na Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {anticipationChannels.map((row, idx) => (
                    <tr key={row.channel} className="hover:bg-stone-50">
                      <td className="py-3 px-3">
                        <span className="font-bold text-stone-900 block">{row.channel}</span>
                        <span className="text-[10px] text-stone-500">
                          Taxa período ({anticipationDays}d): {row.effectiveRateForPeriod}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-semibold">
                        −R$ {row.discountAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        R$ {row.netReceivedToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-stone-700">
                        {row.cetAnnualPct}% a.a.
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            idx === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {idx === 0 ? '🟢 Menor Custo' : `Margem cai p/ ${row.resultingMarginPct}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel Tributário Moda (Simples Nacional + MEI + DIFAL) (5 colunas) */}
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Apuração Tributária Multi-CNPJ
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Anexo I — Comércio Moda
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-700">
                    Matriz ME — RBT12 (12 meses):
                  </span>
                  <span className="font-mono font-bold text-stone-900">R$ 1.180.000,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-600">Faixa Simples Nacional:</span>
                  <span className="font-bold text-indigo-700">
                    3ª Faixa (Alíquota Efetiva 5,20%)
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-stone-200">
                  <span className="text-stone-600">Projeção Guia DAS (Venc. dia 20):</span>
                  <span className="font-mono font-black text-rose-600">
                    R$ {totals.simplesTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Monitor de Teto do MEI */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Filial MEI — Monitor de Teto Anual
                  </span>
                  <span className="font-mono font-bold text-amber-900">74% utilizado</span>
                </div>
                <div className="w-full h-2 bg-amber-200/70 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '74%' }} />
                </div>
                <p className="text-[11px] text-amber-800">
                  Acumulado no ano: <strong>R$ 59.940,00</strong> de R$ 81.000,00. O roteador fiscal está direcionando novas NF-e de marketplaces para a Matriz ME.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900 text-stone-200 text-xs flex items-center justify-between">
              <div>
                <span className="text-stone-400 block text-[10px]">
                  DIFAL Interestadual Apurado
                </span>
                <strong className="font-mono text-white">
                  R$ {totals.difalTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold">
                Isento p/ Optante Simples na maioria das UFs (ST/EC 87)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
