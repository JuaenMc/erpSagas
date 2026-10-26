import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Columns,
  Bookmark,
  Check,
  Plus,
  Trash2,
  Edit3,
  History,
  Command,
} from 'lucide-react';
import { Product, Order } from '../types';

export interface SavedSegment {
  id: string;
  name: string;
  entity: 'produtos' | 'pedidos' | 'clientes' | 'movimentacoes' | 'contas';
  query: string;
  logicOperator: 'E' | 'OU';
  conditionsCount: number;
}

interface SmartDataHubProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: Order[];
  savedSegments: SavedSegment[];
  setSavedSegments: React.Dispatch<React.SetStateAction<SavedSegment[]>>;
  onOpenCommandPalette: () => void;
}

export const SmartDataHub: React.FC<SmartDataHubProps> = ({
  products,
  setProducts,
  orders,
  savedSegments,
  setSavedSegments,
  onOpenCommandPalette,
}) => {
  const [activeEntity, setActiveEntity] = useState<
    'produtos' | 'pedidos' | 'clientes' | 'movimentacoes' | 'contas'
  >('produtos');
  const [searchQuery, setSearchQuery] = useState('');
  const [logicOperator, setLogicOperator] = useState<'E' | 'OU'>('E');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<number>(0);
  const [inlineCost, setInlineCost] = useState<number>(0);
  const [auditDrawerItem, setAuditDrawerItem] = useState<{
    title: string;
    history: Array<{ date: string; user: string; change: string }>;
  } | null>(null);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    sku: true,
    categoria: true,
    custo: true,
    preco: true,
    margem: true,
    estoque: true,
  });

  // Dados derivados para Clientes, Movimentações e Contas
  const customersData = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; doc: string; channel: string; totalSpent: number; ordersCount: number }
    >();
    orders.forEach((o) => {
      const existing = map.get(o.customerDoc);
      if (existing) {
        existing.totalSpent += o.total;
        existing.ordersCount += 1;
      } else {
        map.set(o.customerDoc, {
          id: o.id,
          name: o.customerName,
          doc: o.customerDoc,
          channel: o.channel,
          totalSpent: o.total,
          ordersCount: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [orders]);

  const movementsData = useMemo(() => {
    return products.flatMap((p) =>
      p.variations.map((v) => ({
        id: `mov-${v.sku}`,
        sku: v.sku,
        productTitle: p.title,
        type: v.stockReserved > 0 ? 'Reserva de Combo' : 'Saldo Disponível',
        quantity: v.stockReal,
        updatedAt: 'Hoje, 14:20',
      }))
    );
  }, [products]);

  const financialAccounts = [
    { id: 'fin-1', description: 'Repasse Shopee Brasil — Lote Semanal', type: 'A Receber', amount: 18450.0, dueDate: '28/10/2026', status: 'Confirmado' },
    { id: 'fin-2', description: 'Fornecedor Têxtil Santa Inês (Malha Canelada)', type: 'A Pagar', amount: -6200.0, dueDate: '30/10/2026', status: 'Pendente' },
    { id: 'fin-3', description: 'Repasse Mercado Pago — Vendas App & ML', type: 'A Receber', amount: 14120.5, dueDate: '29/10/2026', status: 'Confirmado' },
    { id: 'fin-4', description: 'Embalagens & Bobinas Térmicas 10x15', type: 'A Pagar', amount: -1180.0, dueDate: '02/11/2026', status: 'Agendado' },
  ];

  // Parser de busca com operadores inteligentes (ex: sku:VEST, margem:<30, canal:SHOPEE)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;

    const tokens = q.split(/\s+/);
    return products.filter((p) => {
      const marginPct = p.basePrice > 0 ? ((p.basePrice - p.costPrice * 1.35) / p.basePrice) * 100 : 0;

      const matchesToken = (token: string) => {
        if (token.startsWith('sku:')) {
          const val = token.replace('sku:', '');
          return (
            p.masterSku.toLowerCase().includes(val) ||
            p.variations.some((v) => v.sku.toLowerCase().includes(val))
          );
        }
        if (token.startsWith('margem:<')) {
          const limit = parseFloat(token.replace('margem:<', '')) || 30;
          return marginPct < limit;
        }
        if (token.startsWith('categoria:')) {
          const val = token.replace('categoria:', '');
          return p.categoryLabel.toLowerCase().includes(val);
        }
        return (
          p.title.toLowerCase().includes(token) ||
          p.masterSku.toLowerCase().includes(token) ||
          p.categoryLabel.toLowerCase().includes(token)
        );
      };

      return logicOperator === 'E'
        ? tokens.every(matchesToken)
        : tokens.some(matchesToken);
    });
  }, [products, searchQuery, logicOperator]);

  const handleSaveSegment = () => {
    if (!newSegmentName.trim()) return;
    const newSeg: SavedSegment = {
      id: `seg-${Date.now()}`,
      name: newSegmentName.trim(),
      entity: activeEntity,
      query: searchQuery || 'Todos os registros',
      logicOperator,
      conditionsCount: searchQuery ? searchQuery.split(' ').length : 1,
    };
    setSavedSegments((prev) => [...prev, newSeg]);
    setNewSegmentName('');
  };

  const handleStartInlineEdit = (p: Product) => {
    setEditingRowId(p.id);
    setInlinePrice(p.basePrice);
    setInlineCost(p.costPrice);
  };

  const handleSaveInlineEdit = (id: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, basePrice: inlinePrice, costPrice: inlineCost } : p
      )
    );
    setEditingRowId(null);
  };

  const handleExportCsv = () => {
    const headers = ['SKU Mestre', 'Produto', 'Categoria', 'Custo (R$)', 'Preço Base (R$)', 'Estoque Total'];
    const rows = filteredProducts.map((p) => [
      p.masterSku,
      `"${p.title}"`,
      p.categoryLabel,
      p.costPrice.toFixed(2),
      p.basePrice.toFixed(2),
      p.variations.reduce((acc, v) => acc + v.stockReal, 0),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sagas-moda-${activeEntity}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkPriceAdjust = (pct: number) => {
    if (selectedRowIds.length === 0) return;
    setProducts((prev) =>
      prev.map((p) =>
        selectedRowIds.includes(p.id)
          ? { ...p, basePrice: Math.round(p.basePrice * (1 + pct / 100) * 100) / 100 }
          : p
      )
    );
    setSelectedRowIds([]);
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho Limpo com Atalho Ctrl+K */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Central de Dados & Segmentos
          </h2>
          <p className="text-stone-300 text-xs mt-1">
            Consulte produtos, pedidos, clientes, estoque e financeiro em uma única tabela inteligente. Salve filtros como segmentos para usar nas automações.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 cursor-pointer"
          >
            <Command className="w-3.5 h-3.5 text-rose-400" />
            <span>Busca Rápida</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-950 text-stone-400 rounded">
              Ctrl+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Planilha</span>
          </button>
        </div>
      </div>

      {/* Seletor de Entidade + Segmentos Salvos */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
            {(
              [
                { id: 'produtos', label: `Produtos (${products.length})` },
                { id: 'pedidos', label: `Pedidos (${orders.length})` },
                { id: 'clientes', label: `Clientes (${customersData.length})` },
                { id: 'movimentacoes', label: `Movimentações (${movementsData.length})` },
                { id: 'contas', label: `Contas (${financialAccounts.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveEntity(tab.id);
                  setSelectedRowIds([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  activeEntity === tab.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Views / Segmentos Salvos */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-stone-400 font-semibold flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-rose-500" />
              Segmentos salvos:
            </span>
            {savedSegments.map((seg) => (
              <button
                key={seg.id}
                type="button"
                onClick={() => {
                  setActiveEntity(seg.entity);
                  setSearchQuery(seg.query === 'Todos os registros' ? '' : seg.query);
                  setLogicOperator(seg.logicOperator);
                }}
                className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 font-medium transition-colors cursor-pointer"
              >
                {seg.name}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de Busca com Operadores (sku: canal: margem:<) + E/OU + Salvar Segmento */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtre por texto ou operadores: sku:VEST  categoria:Infantil  margem:<30"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-300 text-xs text-stone-900 focus:outline-rose-500"
              />
            </div>

            <div className="flex items-center bg-stone-100 p-1 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogicOperator('E')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  logicOperator === 'E' ? 'bg-stone-900 text-white' : 'text-stone-600'
                }`}
              >
                E
              </button>
              <button
                type="button"
                onClick={() => setLogicOperator('OU')}
                className={`px-2.5 py-1 rounded cursor-pointer ${
                  logicOperator === 'OU' ? 'bg-stone-900 text-white' : 'text-stone-600'
                }`}
              >
                OU
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              placeholder="Nome para salvar este filtro..."
              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-800"
            />
            <button
              type="button"
              onClick={handleSaveSegment}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer"
            >
              Salvar Segmento
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Colunas</span>
              </button>
              {showColumnPicker && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-stone-200 rounded-xl shadow-lg p-3 z-20 space-y-2 text-xs">
                  {Object.entries(visibleColumns).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Ações em Massa Contextuais */}
        {selectedRowIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-rose-950">
              {selectedRowIds.length} registro(s) selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkPriceAdjust(5)}
                className="px-3 py-1 rounded bg-white border border-rose-300 text-rose-800 font-bold hover:bg-rose-100 cursor-pointer"
              >
                Reajustar Preço (+5%)
              </button>
              <button
                type="button"
                onClick={() => handleBulkPriceAdjust(-10)}
                className="px-3 py-1 rounded bg-white border border-rose-300 text-rose-800 font-bold hover:bg-rose-100 cursor-pointer"
              >
                Aplicar Remarcação Outlet (−10%)
              </button>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="px-2.5 py-1 text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        )}

        {/* Renderização da Tabela Inteligente por Entidade */}
        {activeEntity === 'produtos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        selectedRowIds.length === filteredProducts.length &&
                        filteredProducts.length > 0
                      }
                      onChange={(e) =>
                        setSelectedRowIds(
                          e.target.checked ? filteredProducts.map((p) => p.id) : []
                        )
                      }
                    />
                  </th>
                  <th className="py-2.5 px-3 font-bold">Produto</th>
                  {visibleColumns.sku && <th className="py-2.5 px-3 font-bold">SKU</th>}
                  {visibleColumns.categoria && <th className="py-2.5 px-3 font-bold">Categoria</th>}
                  {visibleColumns.custo && <th className="py-2.5 px-3 font-bold text-right">Custo</th>}
                  {visibleColumns.preco && <th className="py-2.5 px-3 font-bold text-right">Preço Venda</th>}
                  {visibleColumns.estoque && (
                    <th className="py-2.5 px-3 font-bold text-right">Estoque</th>
                  )}
                  <th className="py-2.5 px-3 font-bold text-right">Ações & Edição Inline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const isEditing = editingRowId === p.id;
                  const totalStock = p.variations.reduce((acc, v) => acc + v.stockReal, 0);

                  return (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(p.id)}
                          onChange={(e) =>
                            setSelectedRowIds((prev) =>
                              e.target.checked
                                ? [...prev, p.id]
                                : prev.filter((id) => id !== p.id)
                            )
                          }
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-stone-900">{p.title}</td>
                      {visibleColumns.sku && (
                        <td className="py-3 px-3 font-mono text-stone-600">{p.masterSku}</td>
                      )}
                      {visibleColumns.categoria && (
                        <td className="py-3 px-3 text-stone-600">{p.categoryLabel}</td>
                      )}
                      {visibleColumns.custo && (
                        <td className="py-3 px-3 text-right font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.50"
                              value={inlineCost}
                              onChange={(e) => setInlineCost(parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-rose-400 rounded text-right font-bold"
                            />
                          ) : (
                            `R$ ${p.costPrice.toFixed(2).replace('.', ',')}`
                          )}
                        </td>
                      )}
                      {visibleColumns.preco && (
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.50"
                              value={inlinePrice}
                              onChange={(e) => setInlinePrice(parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-rose-400 rounded text-right font-bold"
                            />
                          ) : (
                            `R$ ${p.basePrice.toFixed(2).replace('.', ',')}`
                          )}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono">{totalStock} un.</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleSaveInlineEdit(p.id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Salvar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartInlineEdit(p)}
                              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setAuditDrawerItem({
                                title: p.title,
                                history: [
                                  {
                                    date: 'Hoje, 16:40',
                                    user: ' Carla (Financeiro)',
                                    change: `Preço base validado em R$ ${p.basePrice.toFixed(2)}`,
                                  },
                                  {
                                    date: 'Ontem, 11:15',
                                    user: 'Marcos (Estoque)',
                                    change: 'Recebimento de nota de entrada (+30 unidades)',
                                  },
                                ],
                              })
                            }
                            className="p-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 cursor-pointer"
                            title="Ver histórico de alterações"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeEntity === 'pedidos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Pedido</th>
                  <th className="py-2.5 px-3 font-bold">Cliente</th>
                  <th className="py-2.5 px-3 font-bold">Canal</th>
                  <th className="py-2.5 px-3 font-bold text-right">Valor Total</th>
                  <th className="py-2.5 px-3 font-bold text-center">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{o.orderNumber}</td>
                    <td className="py-3 px-3">{o.customerName}</td>
                    <td className="py-3 px-3 text-stone-600">{o.channel}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      R$ {o.total.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-stone-700">
                      {o.deliveryStatus.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeEntity === 'clientes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Cliente</th>
                  <th className="py-2.5 px-3 font-bold">CPF</th>
                  <th className="py-2.5 px-3 font-bold">Canal de Origem</th>
                  <th className="py-2.5 px-3 font-bold text-right">Pedidos</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Comprado (LTV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customersData.map((c) => (
                  <tr key={c.doc} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-bold text-stone-900">{c.name}</td>
                    <td className="py-3 px-3 font-mono text-stone-600">{c.doc}</td>
                    <td className="py-3 px-3 text-stone-600">{c.channel}</td>
                    <td className="py-3 px-3 text-right font-mono">{c.ordersCount}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      R$ {c.totalSpent.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeEntity === 'movimentacoes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">SKU Variação</th>
                  <th className="py-2.5 px-3 font-bold">Produto</th>
                  <th className="py-2.5 px-3 font-bold">Operação</th>
                  <th className="py-2.5 px-3 font-bold text-right">Saldo Atual</th>
                  <th className="py-2.5 px-3 font-bold text-right">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {movementsData.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{m.sku}</td>
                    <td className="py-3 px-3">{m.productTitle}</td>
                    <td className="py-3 px-3 text-stone-600">{m.type}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">{m.quantity} un.</td>
                    <td className="py-3 px-3 text-right text-stone-500">{m.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeEntity === 'contas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Descrição</th>
                  <th className="py-2.5 px-3 font-bold">Natureza</th>
                  <th className="py-2.5 px-3 font-bold">Vencimento</th>
                  <th className="py-2.5 px-3 font-bold text-right">Valor</th>
                  <th className="py-2.5 px-3 font-bold text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {financialAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-stone-50">
                    <td className="py-3 px-3 font-bold text-stone-900">{acc.description}</td>
                    <td className="py-3 px-3 text-stone-600">{acc.type}</td>
                    <td className="py-3 px-3 font-mono text-stone-600">{acc.dueDate}</td>
                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        acc.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      R$ {Math.abs(acc.amount).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-stone-700">
                      {acc.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Painel Lateral de Auditoria por Registro */}
      {auditDrawerItem && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Histórico de Alterações
                  </h3>
                  <p className="text-xs text-stone-500">{auditDrawerItem.title}</p>
                </div>
                <button
                  onClick={() => setAuditDrawerItem(null)}
                  className="text-stone-400 hover:text-stone-700 font-bold text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {auditDrawerItem.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-semibold text-stone-800">{h.user}</span>
                      <span className="font-mono text-[11px]">{h.date}</span>
                    </div>
                    <p className="text-stone-700">{h.change}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setAuditDrawerItem(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs cursor-pointer"
            >
              Fechar Histórico
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
