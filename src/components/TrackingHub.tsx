import React, { useState } from 'react';
import {
  Truck,
  Package,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Layers,
  Calendar,
  Sparkles,
  Smartphone,
  Eye,
  Info,
} from 'lucide-react';
import { Order, DeliveryStatus, MarketplaceChannel, PackageInfo } from '../types';
import { TrackingTimeline } from './TrackingTimeline';

interface TrackingHubProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export const TrackingHub: React.FC<TrackingHubProps> = ({ orders, setOrders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DeliveryStatus>('ALL');
  const [channelFilter, setChannelFilter] = useState<'ALL' | MarketplaceChannel>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activePackageIndex, setActivePackageIndex] = useState<number>(0);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [syncingTrackingId, setSyncingTrackingId] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState<string | null>(null);

  // KPIs
  const totalShipments = orders.length;
  const inTransitCount = orders.filter((o) => o.deliveryStatus === 'EM_TRANSITO').length;
  const outForDeliveryCount = orders.filter((o) => o.deliveryStatus === 'SAIU_ENTREGA').length;
  const deliveredCount = orders.filter((o) => o.deliveryStatus === 'ENTREGUE').length;
  const pendingCount = orders.filter((o) => o.deliveryStatus === 'PENDENTE' || o.deliveryStatus === 'POSTADO').length;

  // Filtros aplicados
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.trackingCode && order.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.deliveryStatus === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || order.channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const handleOpenTrackingModal = (order: Order) => {
    setSelectedOrder(order);
    setActivePackageIndex(0);
    setNotificationSent(null);
  };

  // Simular sincronização imediata com Transportadora / Marketplace via API
  const handleSyncOrderTracking = (orderId: string) => {
    setSyncingTrackingId(orderId);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord.id !== orderId) return ord;

          // Se estiver postado, avança para em trânsito; se em trânsito, avança para saiu para entrega
          let nextStatus: DeliveryStatus = ord.deliveryStatus;
          if (ord.deliveryStatus === 'PENDENTE') nextStatus = 'POSTADO';
          else if (ord.deliveryStatus === 'POSTADO') nextStatus = 'EM_TRANSITO';
          else if (ord.deliveryStatus === 'EM_TRANSITO') nextStatus = 'SAIU_ENTREGA';

          const newEvent = {
            id: `ev-${Date.now()}`,
            orderId: ord.id,
            timestamp: new Date().toISOString(),
            location: 'Centro de Distribuição / Hub Metropolitano SP',
            description: `Atualização de rastreio em tempo real via API da transportadora: Status ${nextStatus}`,
            status: nextStatus,
          };

          const updatedPackages = (ord.packages || []).map((pkg, idx) => {
            if (idx === 0) {
              return {
                ...pkg,
                currentStatus: nextStatus,
                events: [newEvent, ...pkg.events],
              };
            }
            return pkg;
          });

          const updatedOrder: Order = {
            ...ord,
            deliveryStatus: nextStatus,
            packages: updatedPackages.length > 0 ? updatedPackages : ord.packages,
          };

          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder(updatedOrder);
          }

          return updatedOrder;
        })
      );
      setSyncingTrackingId(null);
    }, 1000);
  };

  const handleSendNotification = (order: Order, type: 'WHATSAPP' | 'SMS' | 'PUSH') => {
    setNotificationSent(`Notificação ${type} enviada para ${order.customerName} (${order.customerPhone || 'cliente'}) com sucesso!`);
    setTimeout(() => setNotificationSent(null), 4000);
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'ENTREGUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Entregue
          </span>
        );
      case 'SAIU_ENTREGA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            Saiu para Entrega
          </span>
        );
      case 'EM_TRANSITO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Em Trânsito
          </span>
        );
      case 'POSTADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Postado
          </span>
        );
      case 'DEVOLVIDO':
      case 'EXTRAVIADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-200 text-stone-700 border border-stone-300">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            Pendente
          </span>
        );
    }
  };

  const getChannelTag = (channel: MarketplaceChannel) => {
    switch (channel) {
      case 'APP_SAGAS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">App Sagas</span>;
      case 'SHOPEE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">Shopee</span>;
      case 'MERCADO_LIVRE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Mercado Livre</span>;
      case 'TIKTOK_SHOP':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-100">TikTok Shop</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">{channel}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-stone-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-amber-300 tracking-wider uppercase">
              Módulo 7: Tracking Hub & Pós-Venda
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Central de Rastreamento Omnichannel
          </h2>
          <p className="text-stone-300 text-sm mt-1 max-w-2xl">
            Acompanhe o status em tempo real de cada envio (Shopee Xpress, Mercado Envios, Correios e Jadlog), gerencie pacotes múltiplos e automatize avisos no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSyncOrderTracking(orders[0]?.id || '')}
            disabled={!!syncingTrackingId}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingTrackingId ? 'animate-spin' : ''}`} />
            <span>Sincronizar Todas as Transportadoras</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Total em Rastreio</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{totalShipments}</p>
          <span className="text-[11px] text-stone-400 font-medium">Todos os canais</span>
        </div>

        <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-xs bg-blue-50/20">
          <span className="text-xs font-semibold text-blue-700 block">Em Trânsito</span>
          <p className="text-2xl font-black text-blue-900 mt-1">{inTransitCount}</p>
          <span className="text-[11px] text-blue-600 font-medium">Entre centros de triagem</span>
        </div>

        <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 shadow-xs bg-indigo-50/20">
          <span className="text-xs font-semibold text-indigo-700 block">Saiu p/ Entrega</span>
          <p className="text-2xl font-black text-indigo-900 mt-1">{outForDeliveryCount}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Motorista na rota final</span>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs bg-emerald-50/20">
          <span className="text-xs font-semibold text-emerald-700 block">Entregues</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{deliveredCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Concluídos com sucesso</span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 block">Preparando / Postados</span>
          <p className="text-2xl font-black text-stone-900 mt-1">{pendingCount}</p>
          <span className="text-[11px] text-stone-400 font-medium">Aguardando coleta/bip</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Pedido (ex: PED-98241), Nome do Cliente ou Código de Rastreio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {(['ALL', 'EM_TRANSITO', 'SAIU_ENTREGA', 'POSTADO', 'PENDENTE', 'ENTREGUE'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {status === 'ALL'
                    ? 'Todos'
                    : status === 'EM_TRANSITO'
                    ? 'Em Trânsito'
                    : status === 'SAIU_ENTREGA'
                    ? 'Saiu Entrega'
                    : status === 'POSTADO'
                    ? 'Postado'
                    : status === 'PENDENTE'
                    ? 'Pendente'
                    : 'Entregue'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Channel Filters */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100 text-xs">
          <span className="font-semibold text-stone-500 text-[11px] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Canal:
          </span>
          {(['ALL', 'APP_SAGAS', 'SHOPEE', 'MERCADO_LIVRE', 'TIKTOK_SHOP'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                channelFilter === ch
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {ch === 'ALL'
                ? 'Todos'
                : ch === 'APP_SAGAS'
                ? 'App Sagas'
                : ch === 'SHOPEE'
                ? 'Shopee'
                : ch === 'MERCADO_LIVRE'
                ? 'Mercado Livre'
                : 'TikTok Shop'}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Pedido & Canal</th>
                <th className="py-3 px-4 font-semibold">Destinatário & Destino</th>
                <th className="py-3 px-4 font-semibold">Transportadora / Código</th>
                <th className="py-3 px-4 font-semibold text-center">Status de Entrega</th>
                <th className="py-3 px-4 font-semibold text-center">Volumes</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const packagesCount = order.packages?.length || 1;
                  const primaryTracking = order.trackingCode || order.trackingNumber;
                  const isSyncing = syncingTrackingId === order.id;

                  return (
                    <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Pedido & Canal */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 font-mono">{order.orderNumber}</span>
                            {getChannelTag(order.channel)}
                          </div>
                          <span className="text-[11px] text-stone-500 font-mono block">
                            R$ {order.total.toFixed(2)} • {order.items.length} itens
                          </span>
                        </div>
                      </td>

                      {/* Destinatário & Destino */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-stone-900 block">{order.customerName}</span>
                          <span className="text-[11px] text-stone-500 flex items-center gap-1">
                            {order.shippingAddress.city} / {order.shippingAddress.state}
                          </span>
                        </div>
                      </td>

                      {/* Transportadora & Rastreio */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-semibold text-stone-800 text-[11px] block">
                            {order.carrierService.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded w-fit">
                            <span>{primaryTracking}</span>
                            <button
                              onClick={() => handleCopy(primaryTracking)}
                              className="text-stone-400 hover:text-stone-800 cursor-pointer"
                              title="Copiar código de rastreio"
                            >
                              {copiedTracking === primaryTracking ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status de Entrega */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(order.deliveryStatus)}
                      </td>

                      {/* Volumes */}
                      <td className="py-3.5 px-4 text-center">
                        {packagesCount > 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            <Layers className="w-3 h-3 text-purple-600" />
                            {packagesCount} Volumes
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone-500 font-medium">1 Volume</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSyncOrderTracking(order.id)}
                            disabled={isSyncing}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer disabled:opacity-50"
                            title="Consultar API da Transportadora Agora"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-600' : ''}`} />
                          </button>

                          <button
                            onClick={() => handleOpenTrackingModal(order)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Timeline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalhes do Rastreio (Timeline Vertical & Multi-Pacotes) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-stone-900 text-base">
                      Rastreio do Pedido {selectedOrder.orderNumber}
                    </h3>
                    {getChannelTag(selectedOrder.channel)}
                  </div>
                  <span className="text-xs text-stone-500">
                    Destinatário: {selectedOrder.customerName} • {selectedOrder.shippingAddress.city}/
                    {selectedOrder.shippingAddress.state}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-700 text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Notification Banner Feedback */}
              {notificationSent && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{notificationSent}</span>
                  </div>
                </div>
              )}

              {/* Multi-package Tabs (se houver mais de 1 pacote) */}
              {(selectedOrder.packages?.length || 0) > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Pedido com Envio Fracionado ({selectedOrder.packages!.length} Volumes):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.packages!.map((pkg, idx) => {
                      const isActive = activePackageIndex === idx;
                      return (
                        <button
                          key={pkg.packageId}
                          onClick={() => setActivePackageIndex(idx)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-100'
                              : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-stone-800 mb-1">
                            <span>{pkg.packageLabel}</span>
                            {getStatusBadge(pkg.currentStatus)}
                          </div>
                          <span className="font-mono text-[11px] text-stone-500 block">
                            Código: {pkg.trackingCode}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            Peso: {pkg.weightKg} kg • {pkg.itemsCount} itens
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Package Detail Bar */}
              {(() => {
                const currentPkg: PackageInfo =
                  selectedOrder.packages && selectedOrder.packages.length > 0
                    ? selectedOrder.packages[activePackageIndex]
                    : {
                        packageId: 'pkg-default',
                        packageLabel: 'Volume Único',
                        trackingCode: selectedOrder.trackingCode || selectedOrder.trackingNumber,
                        carrier: selectedOrder.carrierService,
                        service: selectedOrder.carrierService,
                        weightKg: 0.5,
                        itemsCount: selectedOrder.items.length,
                        currentStatus: selectedOrder.deliveryStatus,
                        events: selectedOrder.trackingEvents || [],
                      };

                return (
                  <div className="space-y-5">
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">
                          Código de Rastreio
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-sm text-stone-900">
                            {currentPkg.trackingCode}
                          </span>
                          <button
                            onClick={() => handleCopy(currentPkg.trackingCode)}
                            className="text-stone-400 hover:text-stone-800 cursor-pointer p-0.5"
                            title="Copiar"
                          >
                            {copiedTracking === currentPkg.trackingCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">
                          Transportadora
                        </span>
                        <span className="font-bold text-stone-800 mt-0.5 block">{currentPkg.carrier}</span>
                      </div>

                      <div>
                        <span className="text-stone-400 block text-[10px] uppercase font-bold">
                          Status Atual
                        </span>
                        <div className="mt-0.5">{getStatusBadge(currentPkg.currentStatus)}</div>
                      </div>

                      <button
                        onClick={() => handleSyncOrderTracking(selectedOrder.id)}
                        disabled={!!syncingTrackingId}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingTrackingId ? 'animate-spin' : ''}`} />
                        <span>Sincronizar API</span>
                      </button>
                    </div>

                    {/* Timeline Vertical */}
                    <div>
                      <h4 className="font-bold text-stone-900 text-xs mb-3 uppercase tracking-wider text-stone-500">
                        Histórico Completo de Eventos
                      </h4>
                      <TrackingTimeline
                        events={currentPkg.events}
                        currentStatus={currentPkg.currentStatus}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Automação de Comunicação / Pós-Venda (WhatsApp / Push) */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-stone-900 text-xs">
                      Automação de Pós-Venda & Notificação ao Cliente
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Gatilho Ativo
                  </span>
                </div>

                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Envie automaticamente mensagens transacionais no WhatsApp com o link de rastreamento oficial para manter o cliente informado e reduzir chamados de SAC.
                </p>

                <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1 font-mono text-[11px]">
                  <p>
                    Olá, <strong>{selectedOrder.customerName.split(' ')[0]}</strong>! Seu pedido{' '}
                    <strong>#{selectedOrder.orderNumber}</strong> da <em>sagas.moda</em> foi atualizado para:{' '}
                    <span className="text-rose-600 font-bold">
                      {selectedOrder.deliveryStatus.replace('_', ' ')}
                    </span>
                    .
                  </p>
                  <p className="text-stone-400">
                    Acompanhe em tempo real pelo link: https://sagas.moda/rastreio/{selectedOrder.trackingCode}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleSendNotification(selectedOrder, 'WHATSAPP')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleSendNotification(selectedOrder, 'SMS')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Enviar SMS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 flex items-center justify-between text-xs bg-stone-50 rounded-b-2xl">
              <span className="text-stone-500 text-[11px]">
                Worker de Rastreio (BullMQ): Executando polling a cada 60 min para envios ativos.
              </span>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
