import React from 'react';
import {
  Layers,
  Sparkles,
  Zap,
  Printer,
  Smartphone,
  BookOpen,
  RefreshCw,
  ShoppingBag,
  Share2,
  TrendingUp,
  Truck,
  Database,
  PackagePlus,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'bi_analytics'
  | 'publisher'
  | 'smart_data'
  | 'automations'
  | 'purchases_fashion'
  | 'integrations'
  | 'tracking'
  | 'combos'
  | 'flash_sales'
  | 'logistics'
  | 'stock_sync'
  | 'mobile_app'
  | 'architecture';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingLabelsCount: number;
  activeCombosCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingLabelsCount,
  activeCombosCount,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: string | number; badgeColor?: string }> = [
    { id: 'dashboard', label: 'Painel Geral', icon: ShoppingBag },
    { id: 'publisher', label: 'Catálogo & Lucro', icon: Share2 },
    { id: 'smart_data', label: 'Central de Dados', icon: Database },
    { id: 'automations', label: 'Automações', icon: Zap },
    { id: 'purchases_fashion', label: 'Compras & Moda BI', icon: PackagePlus },
    { id: 'bi_analytics', label: 'Indicadores & DRE', icon: TrendingUp },
    { id: 'combos', label: 'Combos', icon: Layers, badge: activeCombosCount, badgeColor: 'bg-rose-500 text-white' },
    { id: 'flash_sales', label: 'Ofertas Relâmpago', icon: Sparkles },
    {
      id: 'logistics',
      label: 'Etiquetas 10x15',
      icon: Printer,
      badge: pendingLabelsCount > 0 ? pendingLabelsCount : undefined,
      badgeColor: 'bg-indigo-600 text-white',
    },
    { id: 'tracking', label: 'Rastreamento', icon: Truck },
    { id: 'integrations', label: 'Canais Conectados', icon: RefreshCw },
    { id: 'mobile_app', label: 'App sagas.moda', icon: Smartphone },
    { id: 'architecture', label: 'Arquitetura & Docs', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-stone-200 shadow-xs">
      {/* Top Banner: Status dos Canais de Venda e Mensageria */}
      <div className="bg-stone-900 text-stone-200 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-bold tracking-wide text-rose-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            SAGAS.MODA HUB OMNICHANNEL
          </span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400 hidden sm:inline">Fonte Única da Verdade para E-commerce de Moda Família</span>
        </div>

        {/* Status dos Adaptadores de Marketplace */}
        <div className="flex items-center gap-3 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-2 py-0.5 rounded text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>App Próprio: <strong className="text-emerald-300">Conectado</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-2 py-0.5 rounded text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Shopee: <strong className="text-emerald-300">Ativo</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-2 py-0.5 rounded text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Mercado Livre: <strong className="text-emerald-300">MLB Sync</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-2 py-0.5 rounded text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>TikTok Shop: <strong className="text-emerald-300">API v2</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded text-[11px]">
            <Zap className="w-3 h-3 text-rose-400" />
            <span className="text-rose-200">Redis/BullMQ: <strong>0ms lag</strong></span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-sm tracking-tighter">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight text-stone-900">
                SAGAS<span className="text-rose-600">.MODA</span>
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider">
                BRASIL
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                ERP v2.4
              </span>
            </div>
            <p className="text-xs text-stone-500 font-normal">
              Gestão de Combos, Flash Sales, Marketplaces e Etiquetas 10x15cm
            </p>
          </div>
        </div>

        {/* Quick actions right */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setActiveTab('mobile_app')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Ver App Mobile</span>
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors border border-stone-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Schema Prisma & NestJS</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <nav className="bg-stone-50 border-t border-stone-200 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 py-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white text-rose-700' : item.badgeColor || 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
