import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Boxes,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Menu,
  X,
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

interface NavSubItem {
  id: ActiveTab;
  label: string;
  subtitle?: string;
  icon: React.FC<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavSubItem[];
}

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingLabelsCount: number;
  activeCombosCount: number;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingLabelsCount,
  activeCombosCount,
  onOpenCommandPalette,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    overview: true,
    catalog: true,
    promotions: true,
    logistics: true,
    automation_channels: true,
  });

  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      title: 'Visão Geral & Finanças',
      items: [
        {
          id: 'dashboard',
          label: 'Painel Geral',
          subtitle: 'Resumo do dia e alertas',
          icon: ShoppingBag,
        },
        {
          id: 'bi_analytics',
          label: 'Indicadores & DRE',
          subtitle: 'Lucro líquido e canais',
          icon: TrendingUp,
        },
        {
          id: 'smart_data',
          label: 'Central de Dados',
          subtitle: 'Filtros e listas salvas',
          icon: Database,
        },
      ],
    },
    {
      id: 'catalog',
      title: 'Catálogo, Estoque & Margem',
      items: [
        {
          id: 'publisher',
          label: 'Catálogo & Lucro',
          subtitle: 'Simulador por canal',
          icon: Share2,
        },
        {
          id: 'stock_sync',
          label: 'Estoque & Reserva',
          subtitle: 'Saldo multi-depósito',
          icon: Boxes,
        },
        {
          id: 'purchases_fashion',
          label: 'Compras & Moda BI',
          subtitle: 'Reposição SKU e devoluções',
          icon: PackagePlus,
        },
      ],
    },
    {
      id: 'promotions',
      title: 'Comercial & Promoções',
      items: [
        {
          id: 'combos',
          label: 'Combos Dinâmicos',
          subtitle: 'Leve X Pague Y e Kits',
          icon: Layers,
          badge: activeCombosCount,
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'flash_sales',
          label: 'Ofertas Relâmpago',
          subtitle: 'Campanhas com timer',
          icon: Sparkles,
        },
      ],
    },
    {
      id: 'logistics',
      title: 'Expedição & Pós-Venda',
      items: [
        {
          id: 'logistics',
          label: 'Etiquetas 10x15',
          subtitle: 'Envio + DANFE Simplificado',
          icon: Printer,
          badge: pendingLabelsCount > 0 ? pendingLabelsCount : undefined,
          badgeColor: 'bg-indigo-600 text-white',
        },
        {
          id: 'tracking',
          label: 'Rastreamento',
          subtitle: 'Timeline de pacotes',
          icon: Truck,
        },
      ],
    },
    {
      id: 'automation_channels',
      title: 'Automações & Canais',
      items: [
        {
          id: 'automations',
          label: 'Automações',
          subtitle: 'Regras Quando → Então',
          icon: Zap,
        },
        {
          id: 'integrations',
          label: 'Canais Conectados',
          subtitle: 'Shopee, ML, TikTok e Frete',
          icon: RefreshCw,
        },
        {
          id: 'mobile_app',
          label: 'App sagas.moda',
          subtitle: 'Vitrine Mobile',
          icon: Smartphone,
        },
        {
          id: 'architecture',
          label: 'Arquitetura & Docs',
          subtitle: 'Schema Prisma & NestJS',
          icon: BookOpen,
        },
      ],
    },
  ];

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const renderSidebarContent = (isMobileDrawer = false) => {
    const isSlim = collapsed && !isMobileDrawer;

    return (
      <div className="flex flex-col h-full bg-stone-900 text-stone-200 select-none">
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
              S
            </div>
            {!isSlim && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    SAGAS<span className="text-rose-500">.MODA</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ERP
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 truncate">
                  Omnichannel Moda Família
                </p>
              </div>
            )}
          </div>

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              title={isSlim ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              {isSlim ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Botão de Busca Rápida (Ctrl+K) */}
        {onOpenCommandPalette && (
          <div className="p-3 border-b border-stone-800/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenCommandPalette();
              }}
              className={`w-full flex items-center ${
                isSlim ? 'justify-center p-2' : 'justify-between px-3 py-2'
              } rounded-xl bg-stone-800/90 hover:bg-stone-800 text-stone-300 border border-stone-700/70 text-xs transition-colors cursor-pointer`}
              title="Busca Rápida (Ctrl+K)"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {!isSlim && <span>Buscar tela ou SKU...</span>}
              </span>
              {!isSlim && (
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-900 text-stone-400 rounded border border-stone-700">
                  Ctrl+K
                </kbd>
              )}
            </button>
          </div>
        )}

        {/* Menu Groups & Submenus */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-3">
          {navGroups.map((group) => {
            const isGroupOpen = openGroups[group.id] ?? true;
            const hasActiveChild = group.items.some((i) => i.id === activeTab);

            return (
              <div key={group.id} className="space-y-1">
                {/* Cabeçalho do Grupo (Accordion) */}
                {!isSlim ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                      hasActiveChild
                        ? 'text-rose-400'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="truncate">{group.title}</span>
                    {isGroupOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    )}
                  </button>
                ) : (
                  <div className="border-t border-stone-800 my-2" />
                )}

                {/* Submenus */}
                {(isGroupOpen || isSlim) && (
                  <div
                    className={`space-y-0.5 ${
                      !isSlim ? 'pl-2 border-l border-stone-800 ml-2.5' : ''
                    }`}
                  >
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          title={isSlim ? `${item.label} — ${item.subtitle || ''}` : undefined}
                          className={`w-full flex items-center ${
                            isSlim ? 'justify-center py-2.5 px-2' : 'justify-between px-3 py-2'
                          } rounded-xl text-left transition-all cursor-pointer group ${
                            isActive
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive
                                  ? 'text-white'
                                  : 'text-stone-400 group-hover:text-rose-400'
                              }`}
                            />
                            {!isSlim && (
                              <div className="truncate">
                                <div className="text-xs font-semibold leading-tight truncate">
                                  {item.label}
                                </div>
                                {item.subtitle && (
                                  <div
                                    className={`text-[10px] truncate mt-0.5 ${
                                      isActive ? 'text-rose-100' : 'text-stone-400'
                                    }`}
                                  >
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!isSlim && item.badge !== undefined && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                isActive
                                  ? 'bg-white text-rose-700'
                                  : item.badgeColor || 'bg-stone-800 text-stone-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé do Menu Lateral: Status dos Canais */}
        <div className="p-3 border-t border-stone-800 bg-stone-950/60 shrink-0">
          {!isSlim ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  4 Canais Sincronizados
                </span>
                <span className="text-emerald-400 font-bold">Online</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-stone-400">
                <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800 truncate">
                  Shopee: <strong className="text-emerald-300">Ativo</strong>
                </div>
                <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800 truncate">
                  ML: <strong className="text-emerald-300">Ativo</strong>
                </div>
                <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800 truncate">
                  TikTok: <strong className="text-emerald-300">Ativo</strong>
                </div>
                <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800 truncate">
                  App: <strong className="text-emerald-300">Ativo</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center" title="Todos os 4 canais sincronizados">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Top Bar Compacto para Mobile */}
      <div className="lg:hidden sticky top-0 z-40 h-14 bg-stone-900 text-white px-4 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm tracking-tight">
            SAGAS<span className="text-rose-500">.MODA</span>
          </span>
        </div>
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 text-xs border border-stone-700"
          >
            <Search className="w-3.5 h-3.5 text-rose-400" />
            <span>Buscar</span>
          </button>
        )}
      </div>

      {/* Drawer Lateral para Mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Sidebar Fixa no Lado Esquerdo (Desktop) */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen border-r border-stone-800 transition-all duration-200 z-30 ${
          collapsed ? 'w-16' : 'w-68'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
};
