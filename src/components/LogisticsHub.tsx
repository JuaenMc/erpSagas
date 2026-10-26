import React, { useState } from 'react';
import {
  Printer,
  Package,
  Barcode,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Truck,
  Eye,
  FileText,
  Sparkles,
  Download,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { Order, MarketplaceChannel } from '../types';
import { generateZpl10x15, ThermalLabelData } from '../logic/combo-engine';

interface LogisticsHubProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export const LogisticsHub: React.FC<LogisticsHubProps> = ({ orders, setOrders }) => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isZplView, setIsZplView] = useState(false);
  const [copiedZpl, setCopiedZpl] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

  // Filtros Avançados
  const [filterChannel, setFilterChannel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSaleType, setFilterSaleType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter(order => {
    if (filterChannel !== 'ALL' && order.channel !== filterChannel) return false;
    if (filterStatus === 'PENDING' && order.labelPrinted) return false;
    if (filterStatus === 'PRINTED' && !order.labelPrinted) return false;
    if (filterSaleType !== 'ALL' && order.saleType !== filterSaleType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = order.orderNumber.toLowerCase().includes(q);
      const matchCustomer = order.customerName.toLowerCase().includes(q);
      const matchTracking = order.trackingNumber.toLowerCase().includes(q);
      if (!matchNum && !matchCustomer && !matchTracking) return false;
    }
    return true;
  });

  const pendingOrders = filteredOrders.filter(o => !o.labelPrinted);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePrintSingle = (order: Order) => {
    setOrders(prev =>
      prev.map(o =>
        o.id === order.id
          ? {
              ...o,
              labelPrinted: true,
              printedAt: new Date().toISOString(),
              status: 'LABEL_GENERATED' as const,
            }
          : o
      )
    );
    window.print();
  };

  const handleBatchPrint = () => {
    const targetOrders = selectedOrderIds.length > 0
      ? orders.filter(o => selectedOrderIds.includes(o.id))
      : pendingOrders;

    setBatchFeedback(`Transmitindo e gerando ${targetOrders.length} etiquetas 10x15cm + DANFE Resumido...`);
    setTimeout(() => {
      const targetIds = targetOrders.map(o => o.id);
      setOrders(prev =>
        prev.map(o =>
          targetIds.includes(o.id)
            ? {
                ...o,
                labelPrinted: true,
                printedAt: new Date().toISOString(),
                status: 'LABEL_GENERATED' as const,
              }
            : o
        )
      );
      setBatchFeedback(`Lote de ${targetOrders.length} etiquetas com DANFE Resumido gerado com sucesso!`);
      setTimeout(() => {
        setBatchFeedback(null);
        setIsBatchModalOpen(false);
      }, 2500);
    }, 1500);
  };

  const getLabelData = (order: Order): ThermalLabelData => {
    const itemsSummary = order.items
      .map(i => `${i.quantity}x ${i.sku}`)
      .join(', ');

    return {
      orderId: order.orderNumber,
      channel: order.channel,
      trackingNumber: order.trackingNumber,
      recipientName: order.customerName,
      recipientDoc: order.customerDoc,
      addressLine1: `${order.shippingAddress.street}, ${order.shippingAddress.number}${
        order.shippingAddress.complement ? ` - ${order.shippingAddress.complement}` : ''
      }`,
      addressLine2: order.shippingAddress.neighborhood,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      zipCode: order.shippingAddress.zipCode,
      serviceCode: order.carrierService,
      packageWeightGrams: 420,
      itemsSummary,
      declarationValue: order.total,
    };
  };

  const currentZpl = selectedOrder ? generateZpl10x15(getLabelData(selectedOrder)) : '';

  const handleCopyZpl = () => {
    navigator.clipboard.writeText(currentZpl);
    setCopiedZpl(true);
    setTimeout(() => setCopiedZpl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-stone-900 via-indigo-950 to-stone-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold mb-2">
              <Printer className="w-3.5 h-3.5" />
              <span>Logística & Faturamento Integrado (Certificado A1)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Expedição Omnichannel: Etiqueta 10x15cm + DANFE Resumido
            </h2>
            <p className="text-stone-300 text-sm mt-1 max-w-2xl">
              Gere em uma única impressão 100x150mm a <strong>etiqueta de transporte</strong> (Shopee Xpress, Mercado Envios, Sedex) unida ao <strong>DANFE Simplificado</strong> com Chave de Acesso de 44 dígitos e Protocolo SEFAZ.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsBatchModalOpen(true)}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
              <span>
                {selectedOrderIds.length > 0
                  ? `Imprimir Selecionados (${selectedOrderIds.length})`
                  : `Imprimir Todos do Filtro (${pendingOrders.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200 font-bold text-stone-800">
          <span className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-600" />
            Filtros Avançados da Fila de Expedição
          </span>
          <span className="text-stone-500 font-normal">
            Mostrando <strong>{filteredOrders.length}</strong> de {orders.length} pedidos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Plataforma / Canal:
            </label>
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-900 bg-white font-medium"
            >
              <option value="ALL">Todas as Plataformas</option>
              <option value="APP_SAGAS">App sagas.moda</option>
              <option value="SHOPEE">Shopee Brasil</option>
              <option value="MERCADO_LIVRE">Mercado Livre</option>
              <option value="TIKTOK_SHOP">TikTok Shop</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Status da Etiqueta:
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-900 bg-white font-medium"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PENDING">Pendente de Impressão</option>
              <option value="PRINTED">Já Impressas</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Tipo de Venda:
            </label>
            <select
              value={filterSaleType}
              onChange={e => setFilterSaleType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-900 bg-white font-medium"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="COMBO">Combos (3 por R$100 / Leve 3 Pague 2)</option>
              <option value="FLASH_SALE">Oferta Relâmpago (Flash Sale)</option>
              <option value="NORMAL">Venda Regular de Tabela</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              Buscar Pedido / Cliente / Rastreio:
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ex: PED-98241, Juliana, SPX..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Grid: Tabela de Pedidos Multicanal & Visualizador de Etiqueta Térmica + DANFE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tabela de Pedidos (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={
                  selectedOrderIds.length === filteredOrders.length &&
                  filteredOrders.length > 0
                }
                onChange={e => handleSelectAll(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-stone-800">
                Selecionar Todos ({selectedOrderIds.length}/{filteredOrders.length})
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {selectedOrderIds.length > 0 && (
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-100"
                >
                  Gerar Etiquetas dos {selectedOrderIds.length} Selecionados
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              const isChecked = selectedOrderIds.includes(order.id);

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleSelectOrder(order.id)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer"
                  />

                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-stone-900 text-sm">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              order.channel === 'APP_SAGAS'
                                ? 'bg-rose-100 text-rose-800'
                                : order.channel === 'SHOPEE'
                                ? 'bg-orange-100 text-orange-800'
                                : order.channel === 'MERCADO_LIVRE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-800 text-white'
                            }`}
                          >
                            {order.channel.replace('_', ' ')}
                          </span>
                          {order.comboApplied && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                              {order.comboApplied}
                            </span>
                          )}
                          {order.invoice && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              NF-e #{order.invoice.numeroNfe}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-stone-700 font-semibold mt-1">
                          {order.customerName}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {order.shippingAddress.city} - {order.shippingAddress.state} • CEP {order.shippingAddress.zipCode}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-stone-900 text-sm block">
                          R$ {order.total.toFixed(2)}
                        </span>
                        {order.labelPrinted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Impressa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full mt-1">
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Itens do Pedido */}
                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span className="truncate max-w-xs text-[11px]">
                        {order.items.map(i => `${i.quantity}x ${i.productName} (Tam ${i.size})`).join(', ')}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {order.trackingNumber}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visualizador de Etiqueta Térmica 10x15cm + DANFE Resumido (5 cols) */}
        {selectedOrder && (
          <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-stone-900 text-sm">
                    Etiqueta Térmica 10x15cm + DANFE Resumido
                  </h3>
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setIsZplView(false)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      !isZplView ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    Visual DANFE
                  </button>
                  <button
                    onClick={() => setIsZplView(true)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      isZplView ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                    }`}
                  >
                    ZPL
                  </button>
                </div>
              </div>

              {/* Layout da Etiqueta Térmica 100x150mm com DANFE Simplificado */}
              {!isZplView ? (
                <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-300 flex justify-center">
                  <div className="w-[325px] bg-white border-2 border-stone-900 rounded-sm shadow-md p-3 text-stone-900 font-sans select-none text-[10px] space-y-1.5 leading-tight">
                    {/* Cabeçalho da Etiqueta e Transportadora */}
                    <div className="border-b-2 border-stone-900 pb-1 flex items-center justify-between">
                      <div>
                        <span className="font-black text-sm tracking-tight block">
                          SAGAS.MODA
                        </span>
                        <span className="text-[8px] font-bold text-stone-600">
                          LOGÍSTICA OMNICHANNEL & SEFAZ A1
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[10px] bg-stone-900 text-white px-1.5 py-0.5 rounded">
                          {selectedOrder.carrierService.replace('_', ' ')}
                        </span>
                        <span className="block text-[8px] text-stone-500 mt-0.5 font-bold">
                          {selectedOrder.channel}
                        </span>
                      </div>
                    </div>

                    {/* Código de Rastreamento em Barra Code 128 */}
                    <div className="text-center py-0.5">
                      <div className="flex justify-center my-0.5">
                        <svg className="w-56 h-10" viewBox="0 0 240 50">
                          <rect width="240" height="50" fill="#ffffff" />
                          <g fill="#000000">
                            {[4, 10, 14, 18, 24, 28, 34, 40, 44, 52, 58, 62, 70, 74, 82, 88, 94, 102, 110, 114, 122, 128, 134, 142, 148, 154, 162, 168, 174, 182, 190, 196, 204, 210, 218, 224, 230].map((x, i) => (
                              <rect key={i} x={x} y="2" width={i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1} height="46" />
                            ))}
                          </g>
                        </svg>
                      </div>
                      <span className="font-mono font-bold text-[11px] tracking-wider">
                        {selectedOrder.trackingNumber}
                      </span>
                    </div>

                    {/* Destinatário */}
                    <div className="border-t-2 border-stone-900 pt-1 space-y-0.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[8px] font-bold text-stone-500 block">DESTINATÁRIO:</span>
                          <span className="font-black text-xs uppercase block">
                            {selectedOrder.customerName}
                          </span>
                          <span className="text-[9px] text-stone-700">
                            CPF/CNPJ: {selectedOrder.customerDoc}
                          </span>
                        </div>
                        {/* QR Code de Triagem Logística / SEFAZ */}
                        <div className="w-11 h-11 border border-stone-400 p-0.5 bg-stone-100 flex items-center justify-center shrink-0">
                          <QrCode className="w-9 h-9 text-stone-900" />
                        </div>
                      </div>

                      <p className="text-[9px] font-semibold text-stone-800">
                        {selectedOrder.shippingAddress.street}, {selectedOrder.shippingAddress.number}
                        {selectedOrder.shippingAddress.complement ? ` - ${selectedOrder.shippingAddress.complement}` : ''}
                      </p>
                      <p className="text-[9px] text-stone-700">
                        Bairro: {selectedOrder.shippingAddress.neighborhood}
                      </p>
                      <p className="text-[10px] font-black text-stone-900">
                        CIDADE: {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.state}
                      </p>
                      <p className="text-[11px] font-black text-stone-900 font-mono">
                        CEP: {selectedOrder.shippingAddress.zipCode}
                      </p>
                    </div>

                    {/* Remetente */}
                    <div className="border-t border-stone-300 pt-1 text-[8px] text-stone-600">
                      <span className="font-bold">REMETENTE:</span> SAGAS MODA BRASIL LTDA • CNPJ: 45.892.110/0001-44<br />
                      Rua da Moda, 1000 - Galpão 4 - São Paulo/SP - CEP: 03015-000
                    </div>

                    {/* SEÇÃO DANFE RESUMIDO / SIMPLIFICADO (SEFAZ A1) */}
                    <div className="border-t-2 border-stone-900 pt-1 bg-stone-50/70 p-1 rounded-xs space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-[9px] text-stone-900">
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-emerald-700" />
                          DANFE SIMPLIFICADO (NF-e)
                        </span>
                        <span>SÉRIE 1 • Nº {selectedOrder.invoice?.numeroNfe || selectedOrder.orderNumber.replace('PED-', '')}</span>
                      </div>

                      {/* Chave de Acesso da NF-e com 44 dígitos */}
                      <div className="bg-white p-1 border border-stone-300 text-center rounded-xs">
                        <span className="text-[7px] text-stone-500 font-bold block">CHAVE DE ACESSO NF-E (44 DÍGITOS):</span>
                        <span className="font-mono text-[8px] font-bold text-stone-900 tracking-tight block">
                          {selectedOrder.invoice?.chaveAcesso || '35261045892110000144550010000982411082918239'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[8px] text-stone-600 pt-0.5">
                        <span>PROTOCOLO: {selectedOrder.invoice?.protocoloAutorizacao || '135260098218901 - 24/10/2026'}</span>
                        <span className="font-bold text-emerald-800">AUTORIZADA</span>
                      </div>
                    </div>

                    {/* Resumo de Itens e Valores */}
                    <div className="border-t border-stone-300 pt-1 text-[8px]">
                      <div className="flex justify-between font-bold">
                        <span>ITENS / CONTEÚDO DECLARADO:</span>
                        <span>VALOR TOTAL: R$ {selectedOrder.total.toFixed(2)}</span>
                      </div>
                      <div className="space-y-0.5 text-stone-700 font-mono mt-0.5">
                        {selectedOrder.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate max-w-[210px]">{it.quantity}x {it.sku}</span>
                            <span>R$ {it.finalUnitPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Carimbo de Troca Permitida */}
                    <div className="border border-stone-800 p-0.5 text-center bg-stone-100 rounded-xs">
                      <span className="font-black text-[8px] block text-stone-900">
                        ✓ TROCA PERMITIDA EM ATÉ 30 DIAS NO APP SAGAS.MODA
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 relative">
                  <pre className="bg-stone-900 text-emerald-400 font-mono text-[10px] p-3 rounded-xl overflow-x-auto max-h-72 border border-stone-800 select-all">
                    {currentZpl}
                  </pre>
                  <button
                    onClick={handleCopyZpl}
                    className="absolute top-2 right-2 bg-stone-800 hover:bg-stone-700 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 border border-stone-700"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedZpl ? 'Copiado!' : 'Copiar ZPL'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Ações Inferiores */}
            <div className="pt-3 border-t border-stone-200 flex items-center gap-2">
              <button
                onClick={() => handlePrintSingle(selectedOrder)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiqueta 10x15 + DANFE</span>
              </button>
              <button
                onClick={handleCopyZpl}
                className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar código ZPL"
              >
                <Copy className="w-4 h-4" />
                <span>ZPL</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Impressão em Lote */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Emissão em Lote (Etiqueta 10x15 + DANFE)
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600">
              <p>
                O sistema irá transmitir os dados via <strong>Certificado Digital A1</strong> para a SEFAZ, obter os protocolos de autorização e gerar o PDF contínuo com etiquetas 100x150mm.
              </p>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Total de Pedidos no Lote:</span>
                  <strong className="text-stone-900">
                    {selectedOrderIds.length > 0 ? selectedOrderIds.length : pendingOrders.length} etiquetas
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Layout de Saída:</span>
                  <strong className="text-stone-900">100x150mm (Zebra 203 DPI / PDF)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Certificado SEFAZ:</span>
                  <strong className="text-emerald-700">A1 (.pfx) Válido</strong>
                </div>
              </div>

              {batchFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{batchFeedback}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-lg text-stone-600 font-semibold hover:bg-stone-100"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleBatchPrint}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Confirmar Emissão em Lote</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
