import React, { useState } from 'react';
import {
  Truck,
  PackagePlus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  FileSpreadsheet,
  Send,
  TrendingDown,
  Users,
  ShoppingBag,
} from 'lucide-react';
import { Product } from '../types';

interface PurchasesAndFashionViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  supplierName: string;
  leadTimeDays: number;
  sku: string;
  variationLabel: string;
  quantity: number;
  unitCost: number;
  status: 'Rascunho' | 'Enviado' | 'Recebimento Parcial' | 'Recebido';
}

export const PurchasesAndFashionView: React.FC<PurchasesAndFashionViewProps> = ({
  products,
  setProducts,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'compras' | 'fashion_bi' | 'suporte'>('compras');

  // Módulo 19: Pedidos de Compra & Fornecedores
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([
    {
      id: 'po-1',
      poNumber: 'PC-2041',
      supplierName: 'Confecções Santa Inês Ltda',
      leadTimeDays: 7,
      sku: 'VEST-FLORAL-04',
      variationLabel: 'Vestido Floral Infantil · Tam 4',
      quantity: 40,
      unitCost: 18.5,
      status: 'Enviado',
    },
    {
      id: 'po-2',
      poNumber: 'PC-2042',
      supplierName: 'Malharia Sul Têxtil S/A',
      leadTimeDays: 10,
      sku: 'VEST-MIDI-M',
      variationLabel: 'Vestido Midi Canelado · Tam M',
      quantity: 35,
      unitCost: 27.5,
      status: 'Rascunho',
    },
    {
      id: 'po-3',
      poNumber: 'PC-2039',
      supplierName: 'Jeans & Cia Indústria',
      leadTimeDays: 5,
      sku: 'JARD-UNIS-06',
      variationLabel: 'Jardineira Jeans Infantil · Tam 6',
      quantity: 25,
      unitCost: 21.0,
      status: 'Recebimento Parcial',
    },
  ]);

  // Módulo 21: Comentários internos e Tickets Unificados
  const [orderComments, setOrderComments] = useState([
    {
      id: 'comm-1',
      orderNumber: 'PED-98241',
      author: 'Carla (Financeiro)',
      text: '@Marcos conferir embalagem de presente solicitada pela cliente neste combo.',
      time: 'Há 25 min',
    },
    {
      id: 'comm-2',
      orderNumber: 'PED-98245',
      author: 'Marcos (Expedição)',
      text: '@Juliana pacote 2 despachado hoje via Sedex com código atualizado.',
      time: 'Há 1 hora',
    },
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedOrderForComment, setSelectedOrderForComment] = useState('PED-98241');
  const [accountingExportFeedback, setAccountingExportFeedback] = useState(false);

  // Sugestões de reposição por variação (SKU)
  const replenishmentSuggestions = products
    .flatMap((p) =>
      p.variations.map((v) => {
        const dailyVelocity = 2.4;
        const safetyStock = 12;
        const suggestedQty = Math.max(0, Math.round(dailyVelocity * 15 + safetyStock - v.stockReal));
        return {
          productTitle: p.title,
          sku: v.sku,
          color: v.color,
          size: v.size,
          currentStock: v.stockReal,
          safetyStock,
          suggestedQty,
          unitCost: v.costPrice,
        };
      })
    )
    .filter((s) => s.currentStock <= 20)
    .slice(0, 5);

  const handleReceiveStockFromPO = (po: PurchaseOrderItem) => {
    setPurchaseOrders((prev) =>
      prev.map((item) => (item.id === po.id ? { ...item, status: 'Recebido' } : item))
    );
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        variations: p.variations.map((v) =>
          v.sku === po.sku ? { ...v, stockReal: v.stockReal + po.quantity } : v
        ),
      }))
    );
  };

  const handleCreateDraftPOFromSuggestion = (sug: (typeof replenishmentSuggestions)[0]) => {
    const newPo: PurchaseOrderItem = {
      id: `po-${Date.now()}`,
      poNumber: `PC-${Math.floor(2043 + Math.random() * 90)}`,
      supplierName: 'Fornecedor Homologado sagas.moda',
      leadTimeDays: 7,
      sku: sug.sku,
      variationLabel: `${sug.productTitle} · Tam ${sug.size}`,
      quantity: sug.suggestedQty || 30,
      unitCost: sug.unitCost,
      status: 'Rascunho',
    };
    setPurchaseOrders((prev) => [newPo, ...prev]);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setOrderComments((prev) => [
      {
        id: `comm-${Date.now()}`,
        orderNumber: selectedOrderForComment,
        author: 'Você (Gestão)',
        text: newCommentText.trim(),
        time: 'Agora mesmo',
      },
      ...prev,
    ]);
    setNewCommentText('');
  };

  const handleExportAccountingBundle = () => {
    setAccountingExportFeedback(true);
    setTimeout(() => setAccountingExportFeedback(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Navegação Interna entre Compras, Inteligência de Moda e Colaboração */}
      <div className="bg-white border border-stone-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1">
          {[
            { id: 'compras', label: 'Compras & Reposição por Variação', icon: PackagePlus },
            { id: 'fashion_bi', label: 'Inteligência de Moda (Devoluções & Giro)', icon: TrendingDown },
            { id: 'suporte', label: 'Suporte Unificado, Tarefas & Contábil', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  active
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ABA 1: COMPRAS & FORNECEDORES */}
      {activeSubTab === 'compras' && (
        <div className="space-y-6">
          {/* Sugestão de Reposição por Variação (SKU) */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Sugestão de Reposição por Variação (Previsão de Vendas + Estoque de Segurança)
              </h3>
              <p className="text-xs text-stone-500">
                Calculado individualmente por cor e tamanho para evitar ruptura nos tamanhos mais vendidos.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">SKU Variação</th>
                    <th className="py-2.5 px-3 font-bold">Produto · Cor · Tamanho</th>
                    <th className="py-2.5 px-3 font-bold text-right">Saldo Atual</th>
                    <th className="py-2.5 px-3 font-bold text-right">Estoque Segurança</th>
                    <th className="py-2.5 px-3 font-bold text-right">Compra Sugerida</th>
                    <th className="py-2.5 px-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {replenishmentSuggestions.map((sug) => (
                    <tr key={sug.sku} className="hover:bg-stone-50">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">{sug.sku}</td>
                      <td className="py-3 px-3 text-stone-700">
                        {sug.productTitle} — <strong>{sug.color} · Tam {sug.size}</strong>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 font-bold">
                        {sug.currentStock} un.
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-stone-500">
                        {sug.safetyStock} un.
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        +{sug.suggestedQty} un.
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleCreateDraftPOFromSuggestion(sug)}
                          className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Gerar Pedido de Compra
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pedidos de Compra & Entrada de Estoque */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base">
              Pedidos de Compra (PC) & Recebimento de Mercadoria
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Nº PC</th>
                    <th className="py-2.5 px-3 font-bold">Fornecedor & Prazo</th>
                    <th className="py-2.5 px-3 font-bold">Variação (SKU)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Qtd.</th>
                    <th className="py-2.5 px-3 font-bold text-right">Custo Unit.</th>
                    <th className="py-2.5 px-3 font-bold text-center">Situação</th>
                    <th className="py-2.5 px-3 font-bold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-stone-50">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">{po.poNumber}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-stone-800 block">{po.supplierName}</span>
                        <span className="text-[11px] text-stone-500">
                          Prazo médio: {po.leadTimeDays} dias corridos
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-stone-900 block">{po.sku}</span>
                        <span className="text-[11px] text-stone-500">{po.variationLabel}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">{po.quantity} un.</td>
                      <td className="py-3 px-3 text-right font-mono">
                        R$ {po.unitCost.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-stone-700">
                        {po.status}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {po.status !== 'Recebido' ? (
                          <button
                            type="button"
                            onClick={() => handleReceiveStockFromPO(po)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                          >
                            Dar Entrada no Estoque
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Estoque somado
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

      {/* ABA 2: FASHION INTELLIGENCE (BI DE MODA) */}
      {activeSubTab === 'fashion_bi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Devoluções por Tamanho / Motivo */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Devoluções por Tamanho & Ajuste de Modelagem
                </h3>
                <p className="text-xs text-stone-500">
                  Identifique variações com caimento fora do padrão para corrigir a tabela de medidas.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  {
                    sku: 'VEST-MIDI-M',
                    title: 'Vestido Midi Canelado · Tamanho M',
                    returnRate: '14,2%',
                    reason: 'Ficou apertado no busto (Forma pequena)',
                    recommendation: 'Recomendação: Ajustar tabela de medidas do tamanho M (-2cm busto).',
                  },
                  {
                    sku: 'JARD-UNIS-06',
                    title: 'Jardineira Infantil Jeans · Tamanho 6',
                    returnRate: '6,8%',
                    reason: 'Comprimento da alça curto',
                    recommendation: 'Recomendação: Revisar regulador de alça com o fornecedor.',
                  },
                  {
                    sku: 'CAM-LINHO-G',
                    title: 'Camisa Masculina Linho · Tamanho G',
                    returnRate: '2,1%',
                    reason: 'Troca por cor diferente',
                    recommendation: 'Modelagem aprovada (abaixo da média de 4%).',
                  },
                ].map((item) => (
                  <div
                    key={item.sku}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{item.title}</span>
                      <span className="font-mono font-bold text-rose-600">
                        Taxa devolução: {item.returnRate}
                      </span>
                    </div>
                    <p className="text-stone-600">
                      <strong>Motivo principal:</strong> {item.reason}
                    </p>
                    <p className="text-stone-800 font-semibold">{item.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Detecção de Encalhe (60 dias sem venda) & Curva de Remarcação */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-stone-900 text-base">
                  Produtos Parados há 60+ Dias (Sugestão de Remarcação Outlet)
                </h3>
                <p className="text-xs text-stone-500">
                  Libere capital de giro aplicando descontos graduais antes do fim da estação.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  {
                    sku: 'CONJ-MOLET-06',
                    name: 'Conjunto Moletom Flanelado · Tam 6',
                    daysIdle: 64,
                    stockLocked: 'R$ 1.708,10 (19 un.)',
                    markdownSuggestion: 'Sugerido: −20% (De R$ 89,90 por R$ 71,90) ou incluir no Combo 3 por R$ 100',
                  },
                  {
                    sku: 'CAM-LINHO-P',
                    name: 'Camisa Linho Manga Curta · Tam P',
                    daysIdle: 72,
                    stockLocked: 'R$ 1.198,80 (12 un.)',
                    markdownSuggestion: 'Sugerido: −30% na Oferta Relâmpago de Fim de Semana',
                  },
                ].map((idle) => (
                  <div
                    key={idle.sku}
                    className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">{idle.name}</span>
                      <span className="font-mono font-bold text-amber-800">
                        {idle.daysIdle} dias sem giro
                      </span>
                    </div>
                    <p className="text-stone-600">
                      Capital imobilizado: <strong>{idle.stockLocked}</strong>
                    </p>
                    <p className="text-emerald-800 font-semibold">{idle.markdownSuggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cohort de Recompra & LTV Real por Canal de Aquisição */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-stone-900 text-base">
              Retenção de Clientes (Recompra em 90 dias) & Valor Vitalício (LTV) por Canal
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-4 font-bold">Canal de 1ª Compra</th>
                    <th className="py-2.5 px-4 font-bold text-right">Ticket Inicial</th>
                    <th className="py-2.5 px-4 font-bold text-right">Taxa de Recompra (90d)</th>
                    <th className="py-2.5 px-4 font-bold text-right">LTV Líquido Médio (12 meses)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900">App Próprio sagas.moda</td>
                    <td className="py-3 px-4 text-right font-mono">R$ 118,40</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">42,8%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">R$ 412,00</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900">Shopee Brasil (Convertido p/ App via Encarte)</td>
                    <td className="py-3 px-4 text-right font-mono">R$ 68,90</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-700">24,5%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">R$ 198,50</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-stone-900">Mercado Livre</td>
                    <td className="py-3 px-4 text-right font-mono">R$ 104,20</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-700">19,0%</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">R$ 215,00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: COLABORAÇÃO, SUPORTE UNIFICADO & FECHAMENTO CONTÁBIL */}
      {activeSubTab === 'suporte' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Comentários Internos com Menções @usuario */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-stone-900 text-base">
                Tarefas & Comentários Internos por Pedido (Menções @equipe)
              </h3>

              <form onSubmit={handleAddComment} className="flex gap-2 text-xs">
                <select
                  value={selectedOrderForComment}
                  onChange={(e) => setSelectedOrderForComment(e.target.value)}
                  className="px-2.5 py-2 rounded-lg border border-stone-300 bg-stone-50 font-mono font-bold"
                >
                  <option value="PED-98241">PED-98241</option>
                  <option value="PED-98242">PED-98242</option>
                  <option value="PED-98245">PED-98245</option>
                </select>
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Digite uma anotação ou mencione @Marcos, @Carla..."
                  className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-stone-900 text-white font-bold cursor-pointer"
                >
                  Enviar
                </button>
              </form>

              <div className="space-y-2.5 text-xs">
                {orderComments.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                    <div className="flex items-center justify-between text-stone-500">
                      <span className="font-bold text-stone-900">
                        {c.orderNumber} · {c.author}
                      </span>
                      <span>{c.time}</span>
                    </div>
                    <p className="text-stone-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tickets de Suporte Unificados com SLA */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-stone-900 text-base">
                Atendimento Unificado (Shopee, Mercado Livre & WhatsApp)
              </h3>

              <div className="space-y-2.5 text-xs">
                {[
                  {
                    id: 'tk-1',
                    channel: 'Mercado Livre — Pós-Venda',
                    order: 'PED-98243',
                    customer: 'Rodrigo Fontes',
                    question: 'Posso trocar a camisa tamanho G por GG caso fique justa?',
                    sla: 'Responder em 42 min',
                  },
                  {
                    id: 'tk-2',
                    channel: 'WhatsApp Oficial',
                    order: 'PED-98241',
                    customer: 'Juliana Beatriz',
                    question: 'Meu combo já saiu para entrega hoje?',
                    sla: 'Responder em 1h 15m',
                  },
                ].map((tk) => (
                  <div key={tk.id} className="p-3.5 rounded-lg border border-stone-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">
                        {tk.customer} ({tk.order}) — {tk.channel}
                      </span>
                      <span className="font-semibold text-amber-700">{tk.sla}</span>
                    </div>
                    <p className="text-stone-600">"{tk.question}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exportação Contábil Mensal Simplificada */}
          <div className="bg-stone-900 rounded-xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm">
                Fechamento Contábil Mensal Simplificado
              </h4>
              <p className="text-xs text-stone-300 mt-0.5">
                Gera um pacote único com todos os XMLs de Notas Fiscais autorizadas, relatório de comissões retidas por canal e extrato conciliado para enviar ao contador.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportAccountingBundle}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {accountingExportFeedback
                  ? 'Pacote Contábil Gerado!'
                  : 'Baixar Pacote Contábil do Mês'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
