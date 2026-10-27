import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CombosManager } from './components/CombosManager';
import { FlashSalesManager } from './components/FlashSalesManager';
import { ProductPublisher } from './components/ProductPublisher';
import { LogisticsHub } from './components/LogisticsHub';
import { StockSyncSimulator } from './components/StockSyncSimulator';
import { MobileAppPreview } from './components/MobileAppPreview';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { BiAnalyticsDashboard } from './components/BiAnalyticsDashboard';
import { IntegrationsHub } from './components/IntegrationsHub';
import { TrackingHub } from './components/TrackingHub';
import { SmartDataHub, SavedSegment } from './components/SmartDataHub';
import { AutomationEngineView } from './components/AutomationEngineView';
import { PurchasesAndFashionView } from './components/PurchasesAndFashionView';
import { Search, ArrowRight } from 'lucide-react';
import {
  INITIAL_COMBOS,
  INITIAL_FLASH_SALES,
  INITIAL_ORDERS,
  INITIAL_LOGS,
} from './data/mockData';
import { ComboRuleModel, FlashSaleModel, Order, IntegrationLog } from './types';
import { useProducts } from './hooks/useProducts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { products, setProducts, loading: loadingProducts, refetch: refetchProducts, createProduct } = useProducts();
  const [combos, setCombos] = useState<ComboRuleModel[]>(INITIAL_COMBOS);
  const [flashSales, setFlashSales] = useState<FlashSaleModel[]>(INITIAL_FLASH_SALES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [logs, setLogs] = useState<IntegrationLog[]>(INITIAL_LOGS);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

  const [savedSegments, setSavedSegments] = useState<SavedSegment[]>([
    {
      id: 'seg-1',
      name: 'Curva A — Infantil',
      entity: 'produtos',
      query: 'categoria:Infantil',
      logicOperator: 'E',
      conditionsCount: 1,
    },
    {
      id: 'seg-2',
      name: 'Margem abaixo de 30%',
      entity: 'produtos',
      query: 'margem:<30',
      logicOperator: 'E',
      conditionsCount: 1,
    },
    {
      id: 'seg-3',
      name: 'Coleção Anterior',
      entity: 'produtos',
      query: 'sku:CONJ',
      logicOperator: 'OU',
      conditionsCount: 1,
    },
  ]);

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pendingLabelsCount = orders.filter((o) => !o.labelPrinted).length;
  const activeCombosCount = combos.filter((c) => c.active).length;

  const handlePlaceAppOrder = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);

    setProducts((prevProds) =>
      prevProds.map((p) => {
        const orderItem = newOrder.items.find((i) => i.productId === p.id);
        if (!orderItem) return p;

        return {
          ...p,
          variations: p.variations.map((v) =>
            v.sku === orderItem.sku
              ? {
                  ...v,
                  stockReserved: v.stockReserved + orderItem.quantity,
                  stockReal: Math.max(0, v.stockReal - orderItem.quantity),
                }
              : v
          ),
        };
      })
    );

    const newLog: IntegrationLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: 'APP_SAGAS',
      action: 'ORDER_PULL',
      status: 'SUCCESS',
      message: `Pedido #${newOrder.orderNumber} finalizado no App sagas.moda com ${newOrder.comboApplied || 'Combo'}. Estoque reservado e propagado.`,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const quickCommands: Array<{ label: string; tab: ActiveTab; section: string }> = [
    { label: 'Simular Lucro por Canal e Ajustar Preços', tab: 'publisher', section: 'Catálogo & Lucro' },
    { label: 'Consultar Central de Dados (Produtos, Pedidos, Clientes)', tab: 'smart_data', section: 'Central de Dados' },
    { label: 'Criar Regra no Motor de Automações (Quando → Então)', tab: 'automations', section: 'Automações' },
    { label: 'Gerar Pedido de Compra e Ver Devoluções por Tamanho', tab: 'purchases_fashion', section: 'Compras & Moda BI' },
    { label: 'Imprimir Etiquetas 10x15 com DANFE Simplificado', tab: 'logistics', section: 'Expedição' },
    { label: 'Acompanhar Rastreamento de Pacotes', tab: 'tracking', section: 'Pós-Venda' },
    { label: 'Analisar Indicadores Financeiros e DRE', tab: 'bi_analytics', section: 'Financeiro' },
  ].filter((cmd) =>
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
    cmd.section.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const tabMeta: Record<ActiveTab, { group: string; title: string }> = {
    dashboard: { group: 'Visão Geral & Finanças', title: 'Painel Geral' },
    bi_analytics: { group: 'Visão Geral & Finanças', title: 'Indicadores & DRE' },
    smart_data: { group: 'Visão Geral & Finanças', title: 'Central de Dados Universal' },
    publisher: { group: 'Catálogo, Estoque & Margem', title: 'Catálogo & Simulador de Lucro' },
    stock_sync: { group: 'Catálogo, Estoque & Margem', title: 'Estoque Multi-Depósito & Reserva' },
    purchases_fashion: { group: 'Catálogo, Estoque & Margem', title: 'Compras, Fornecedores & Moda BI' },
    combos: { group: 'Comercial & Promoções', title: 'Combos Dinâmicos' },
    flash_sales: { group: 'Comercial & Promoções', title: 'Ofertas Relâmpago' },
    logistics: { group: 'Expedição & Pós-Venda', title: 'Etiquetas 10x15cm & DANFE Simplificado' },
    tracking: { group: 'Expedição & Pós-Venda', title: 'Rastreamento Unificado' },
    automations: { group: 'Automações & Canais', title: 'Motor de Automações (Quando → Então)' },
    integrations: { group: 'Automações & Canais', title: 'Canais Conectados' },
    mobile_app: { group: 'Automações & Canais', title: 'App sagas.moda (Preview Mobile)' },
    architecture: { group: 'Automações & Canais', title: 'Arquitetura & Documentação' },
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans antialiased flex flex-col lg:flex-row selection:bg-rose-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingLabelsCount={pendingLabelsCount}
        activeCombosCount={activeCombosCount}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra contextual limpa no topo da área de trabalho */}
        <header className="hidden lg:flex h-14 bg-white border-b border-stone-200 px-6 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 font-medium">
              {tabMeta[activeTab]?.group}
            </span>
            <span className="text-stone-300">/</span>
            <span className="font-bold text-stone-900 text-sm">
              {tabMeta[activeTab]?.title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/70 text-stone-600 text-xs font-medium border border-stone-200 transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-stone-400" />
              <span>Ir para tela ou buscar...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-stone-500 rounded border border-stone-200">
                Ctrl+K
              </kbd>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              combos={combos}
              flashSales={flashSales}
              orders={orders}
              logs={logs}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'bi_analytics' && <BiAnalyticsDashboard />}

          {activeTab === 'smart_data' && (
            <SmartDataHub
              products={products}
              setProducts={setProducts}
              orders={orders}
              savedSegments={savedSegments}
              setSavedSegments={setSavedSegments}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          )}

          {activeTab === 'automations' && (
            <AutomationEngineView savedSegments={savedSegments} />
          )}

          {activeTab === 'purchases_fashion' && (
            <PurchasesAndFashionView
              products={products}
              setProducts={setProducts}
            />
          )}

          {activeTab === 'integrations' && <IntegrationsHub />}

          {activeTab === 'tracking' && (
            <TrackingHub
              orders={orders}
              setOrders={setOrders}
            />
          )}

          {activeTab === 'combos' && (
            <CombosManager
              combos={combos}
              setCombos={setCombos}
              products={products}
            />
          )}

          {activeTab === 'flash_sales' && (
            <FlashSalesManager
              flashSales={flashSales}
              setFlashSales={setFlashSales}
              products={products}
            />
          )}

          {activeTab === 'publisher' && (
            <ProductPublisher
              products={products}
              setProducts={setProducts}
              logs={logs}
              setLogs={setLogs}
            />
          )}

          {activeTab === 'logistics' && (
            <LogisticsHub
              orders={orders}
              setOrders={setOrders}
            />
          )}

          {activeTab === 'stock_sync' && (
            <StockSyncSimulator
              products={products}
              setProducts={setProducts}
              logs={logs}
              setLogs={setLogs}
            />
          )}

          {activeTab === 'mobile_app' && (
            <MobileAppPreview
              products={products}
              combos={combos}
              flashSales={flashSales}
              onPlaceAppOrder={handlePlaceAppOrder}
            />
          )}

          {activeTab === 'architecture' && <ArchitectureDocs />}
        </main>

        <footer className="bg-white border-t border-stone-200 py-3.5 px-6 text-xs text-stone-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>
              <strong>sagas.moda ERP Omnichannel</strong> — Gestão Integrada para Loja Própria, Shopee, Mercado Livre e TikTok Shop.
            </p>
            <p className="text-[11px] text-stone-400">
              Atalho Rápido: Pressione <kbd className="px-1.5 py-0.5 bg-stone-100 rounded border border-stone-200 font-mono">Ctrl+K</kbd> para navegar entre qualquer tela
            </p>
          </div>
        </footer>
      </div>

      {/* Command Palette Global (Ctrl+K) */}
      {isCommandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-stone-200 flex items-center gap-3">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                autoFocus
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Para onde você quer ir ou qual ação deseja executar?"
                className="flex-1 text-sm font-medium text-stone-900 focus:outline-none"
              />
              <kbd className="px-2 py-0.5 text-[10px] font-mono bg-stone-100 text-stone-500 rounded">
                ESC
              </kbd>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto divide-y divide-stone-100">
              {quickCommands.map((cmd, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveTab(cmd.tab);
                    setIsCommandPaletteOpen(false);
                    setCommandSearch('');
                  }}
                  className="w-full p-3 text-left hover:bg-stone-50 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-stone-900 block">{cmd.label}</span>
                    <span className="text-stone-400">{cmd.section}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
